"use server";
import { Pool } from "@neondatabase/serverless";
import { groupSimilarItems } from "@/lib/grouping";

const CONNECTION_STRING = process.env.NEON_DB_CONNECTION_STRING;

let pool = null;

const getPool = () => {
  if (!pool) {
    pool = new Pool({ connectionString: CONNECTION_STRING });
  }
  return pool;
};
const DataInterval = {
  DAILY: "daily",
  WEEKLY: "weekly",
  MONTHLY: "monthly",
};
// --- Helper for Date Formatting ---
const formatDateLabel = (dateInput, interval) => {
  const date = new Date(dateInput);
  if (interval === DataInterval.MONTHLY) {
    return date.toLocaleDateString("mr-IN", {
      month: "short",
      year: "2-digit",
    });
  }
  return date.toLocaleDateString("mr-IN", { day: "numeric", month: "short" });
};

// --- 1. Fetch Items from DB ---
export const fetchItemOptions = async () => {
  try {
    const client = await getPool().connect();
    // Fetch distinct items and their usage count
    const result = await client.query(`
      SELECT item as name, COUNT(*) as count 
      FROM entry 
      GROUP BY item 
      ORDER BY count DESC
    `);
    client.release();

    // Use existing utility to group fuzzy names (e.g. "Tomato" & "tomato")

    return groupSimilarItems(result.rows);
  } catch (error) {
    console.error("Database Error (fetchItemOptions):", error);
    return [];
  }
};

// --- 2. Fetch Harvest Analysis (Best Months) from DB ---
export const fetchHarvestAnalysis = async (itemName) => {
  try {
    const client = await getPool().connect();

    // Query to aggregate data by month across all years available
    // Rate is divided by 10 as per user logic
    const query = `
      SELECT 
        TRIM(TO_CHAR(e.date, 'Month')) as month_name,
        EXTRACT(MONTH FROM e.date) as month_num,
        AVG(vm.rate / 10) as avg_price,
        SUM(e.weight) as total_volume
      FROM entry e
      JOIN vendormemo vm ON e.transactionid = vm.entryid
      WHERE e.item = $1 AND vm.rate > 0
      GROUP BY 1, 2
      ORDER BY avg_price DESC
    `;

    const result = await client.query(query, [itemName]);
    client.release();

    if (result.rows.length === 0) {
      return {
        itemName,
        bestPriceMonths: ["N/A"],
        bestVolumeMonths: ["N/A"],
        yoyGrowth: 0,
        recommendation: "पुरेसा डेटा उपलब्ध नाही.",
        seasonalTrend: [],
      };
    }

    // Sort for Best Price (already sorted DESC by price in SQL)
    const bestPriceMonths = result.rows.slice(0, 2).map((r) => r.month_name); // Top 2 months

    // Sort for Best Volume
    const volumeSorted = [...result.rows].sort(
      (a, b) => Number(b.total_volume) - Number(a.total_volume)
    );
    const bestVolumeMonths = volumeSorted.slice(0, 1).map((r) => r.month_name);

    // Calculate YoY Growth (Simple comparison of last 365 days vs previous 365 days)
    const growthQuery = `
      WITH current_year AS (
        SELECT AVG(vm.rate/10) as rate 
        FROM entry e JOIN vendormemo vm ON e.transactionid = vm.entryid
        WHERE e.item = $1 AND e.date >= CURRENT_DATE - INTERVAL '1 year'
      ),
      last_year AS (
        SELECT AVG(vm.rate/10) as rate 
        FROM entry e JOIN vendormemo vm ON e.transactionid = vm.entryid
        WHERE e.item = $1 AND e.date >= CURRENT_DATE - INTERVAL '2 years' AND e.date < CURRENT_DATE - INTERVAL '1 year'
      )
      SELECT 
        cy.rate as current_rate, 
        ly.rate as last_rate 
      FROM current_year cy, last_year ly
    `;

    // We open a new client or reuse? getPool manages it.
    const client2 = await getPool().connect();
    const growthResult = await client2.query(growthQuery, [itemName]);
    client2.release();

    let yoyGrowth = 0;
    if (growthResult.rows.length > 0) {
      const { current_rate, last_rate } = growthResult.rows[0];
      if (last_rate && Number(last_rate) !== 0) {
        yoyGrowth =
          ((Number(current_rate) - Number(last_rate)) / Number(last_rate)) *
          100;
      }
    }

    // Map month number 1-12 to the array index 0-11 for seasonal trend sparkline
    const seasonalTrend = new Array(12).fill(0);
    result.rows.forEach((r) => {
      const idx = Number(r.month_num) - 1;
      if (idx >= 0 && idx < 12) seasonalTrend[idx] = Number(r.avg_price);
    });

    return {
      itemName,
      bestPriceMonths,
      bestVolumeMonths,
      yoyGrowth: parseFloat(yoyGrowth.toFixed(1)),
      recommendation: `ऐतिहासिक माहितीनुसार, ${itemName} पिकाची काढणी ${bestPriceMonths.join(
        " किंवा "
      )} महिन्यात केल्यास चांगला दर मिळण्याची शक्यता आहे. ${
        bestVolumeMonths[0]
      } महिन्यात बाजारात सर्वाधिक आवक असते.`,
      seasonalTrend,
    };
  } catch (error) {
    console.error("Database Error (fetchHarvestAnalysis):", error);
    // Fallback or empty state
    return {
      itemName,
      bestPriceMonths: [],
      bestVolumeMonths: [],
      yoyGrowth: 0,
      recommendation: "माहिती लोड करण्यात त्रुटी.",
      seasonalTrend: [],
    };
  }
};

// --- 3. Fetch Market Trends from DB ---
export const fetchMarketTrends = async (
  itemName,
  startDate,
  endDate,
  interval = DataInterval.DAILY
) => {
  try {
    const client = await getPool().connect();

    // Determine Grouping Truncation based on interval
    let dateGroupExpression = "e.date"; // Default daily
    if (interval === DataInterval.WEEKLY) {
      dateGroupExpression = "DATE_TRUNC('week', e.date)::date";
    } else if (interval === DataInterval.MONTHLY) {
      dateGroupExpression = "DATE_TRUNC('month', e.date)::date";
    }

    const query = `
      SELECT
        ${dateGroupExpression} as grouped_date,
        ROUND(AVG(vm.rate / 10), 2) as avg_rate,
        ROUND(MAX(vm.rate / 10), 2) as max_rate,
        ROUND(MIN(vm.rate / 10), 2) as min_rate,
        SUM(e.weight) as volume
      FROM entry e
      JOIN vendormemo vm ON e.transactionid = vm.entryid
      WHERE 
        e.item = $1 
        AND e.date >= $2 
        AND e.date <= $3
        AND vm.rate > 0
      GROUP BY 1
      ORDER BY 1 ASC
    `;

    // Format dates for Postgres (YYYY-MM-DD)
    const sDate = startDate.toISOString().split("T")[0];
    const eDate = endDate.toISOString().split("T")[0];

    const result = await client.query(query, [itemName, sDate, eDate]);
    client.release();

    const history = result.rows.map((row) => ({
      date: formatDateLabel(row.grouped_date, interval),
      avgRate: Number(row.avg_rate),
      maxRate: Number(row.max_rate),
      minRate: Number(row.min_rate),
      volume: Number(row.volume),
    }));

    if (history.length === 0) {
      return {
        history: [],
        summary: {
          currentAvg: 0,
          currentHigh: 0,
          currentLow: 0,
          totalVolume: 0,
          priceChangePercentage: 0,
          trendDirection: "stable",
          prediction: "माहिती उपलब्ध नाही",
          historicalAvgRate: 0,
        },
      };
    }

    // Calculate Summary Stats
    const current = history[history.length - 1];
    const previous =
      history.length > 1 ? history[history.length - 2] : history[0];

    // Avoid division by zero
    const change =
      previous.avgRate !== 0
        ? ((current.avgRate - previous.avgRate) / previous.avgRate) * 100
        : 0;

    const trendDir = change > 0 ? "up" : change < 0 ? "down" : "stable";
    const totalVolume = history.reduce((acc, curr) => acc + curr.volume, 0);

    // Fetch Historical Average (Same period last year)
    // We execute a quick separate query for this single aggregated number
    const historyQuery = `
      SELECT ROUND(AVG(vm.rate / 10), 2) as hist_avg
      FROM entry e
      JOIN vendormemo vm ON e.transactionid = vm.entryid
      WHERE e.item = $1 
        AND e.date >= ($2::date - INTERVAL '1 year') 
        AND e.date <= ($3::date - INTERVAL '1 year')
        AND vm.rate > 0
    `;

    const client2 = await getPool().connect();
    const histResult = await client2.query(historyQuery, [
      itemName,
      sDate,
      eDate,
    ]);
    client2.release();

    const historicalAvgRate = histResult.rows[0]?.hist_avg
      ? Number(histResult.rows[0].hist_avg)
      : 0;

    let prediction = "बाजार स्थिर आहे.";
    if (trendDir === "down" && Math.abs(change) > 5) {
      prediction = `दरांमध्ये ${Math.abs(change).toFixed(1)}% घट झाली आहे.`;
    } else if (trendDir === "up" && Math.abs(change) > 5) {
      prediction = `दरांमध्ये ${Math.abs(change).toFixed(
        1
      )}% वाढ दिसून येत आहे.`;
    }

    return {
      history,
      summary: {
        currentAvg: current.avgRate,
        currentHigh: current.maxRate,
        currentLow: current.minRate,
        totalVolume,
        priceChangePercentage: parseFloat(change.toFixed(1)),
        trendDirection: trendDir,
        prediction,
        historicalAvgRate,
      },
    };
  } catch (error) {
    console.error("Database Error (fetchMarketTrends):", error);
    return {
      history: [],
      summary: {
        currentAvg: 0,
        currentHigh: 0,
        currentLow: 0,
        totalVolume: 0,
        priceChangePercentage: 0,
        trendDirection: "stable",
        prediction: "Database Error",
        historicalAvgRate: 0,
      },
    };
  }
};
