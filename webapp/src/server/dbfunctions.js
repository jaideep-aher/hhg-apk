"use server";
import { Pool } from "pg";
import { unstable_cache } from "next/cache";
import "dotenv/config";

let pool = null;

function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URLR) {
      throw new Error(
        "Database configuration error: DATABASE_URLR is not defined"
      );
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URLR,
      ssl: { rejectUnauthorized: false },
      max: 5,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
    });
    pool.on("error", (err) => {
      console.error("Postgres pool error:", err.message);
    });
  }
  return pool;
}

async function runQuery(query, values = []) {
  const client = await getPool().connect();
  try {
    const result = await client.query(query, values);
    return result.rows;
  } catch (error) {
    console.error("Database query error:", error.message);
    throw new Error(`Query failed: ${error.message}`);
  } finally {
    client.release();
  }
}

/**
 * Retrieves farmer data based on a given farmer ID and date range.
 * @async
 * @param {{ uid: string, fromDate: Date, toDate: Date, page: int, limit: int }} params - An object containing the farmer ID and date range.
 * @returns {Promise<Array<Object>>} A promise resolving to an array of objects representing the farmer's data.
 */
async function getFarmerDataUsingId(
  uid,
  fromDate,
  toDate,
  page = 1,
  limit = 10
) {
  // console.log("getFarmerDataUsingId", uid, fromDate, toDate, page, limit);
  try {
    const farmerTableData = await runQuery(
      `SELECT * FROM farmers WHERE uid = $1`,
      [uid]
    );
    if (farmerTableData.length === 0) {
      throw new Error("Farmer not found");
    }

    const offset = (Number(page) - 1) * Number(limit);

    // Query to get total count
    const totalCountQuery = `
      SELECT COUNT(*) 
      FROM Entry
      WHERE Entry.farmerid = $1 AND Entry.date >= $3 AND Entry.date <= $2
    `;

    // Query to get paginated data
    const getDataQuery = `
      SELECT Entry.farmerid, transactionid as entryid, date, vendorName, quantity, weight, rate,
             item, vendorMemo.payable, vendorMemo.paid, vendorMemo.paiddate
      FROM Entry
      LEFT OUTER JOIN vendorMemo ON Entry.transactionid = vendorMemo.entryid
      WHERE  Entry.farmerid = $1 AND Entry.date >= $3 AND Entry.date <= $2
      ORDER BY date DESC
      LIMIT $4
      OFFSET $5;
    `;

    // Run both queries concurrently
    const [totalCountResult, farmerData] = await Promise.all([
      runQuery(totalCountQuery, [
        farmerTableData[0]?.farmerid,
        fromDate,
        toDate,
      ]),
      runQuery(getDataQuery, [
        farmerTableData[0]?.farmerid,
        fromDate,
        toDate,
        limit,
        offset,
      ]),
    ]);

    const totalCount = totalCountResult[0].count;

    // console.log(farmerData);
    return { farmerData, totalCount, farmerTableData };
  } catch (err) {
    console.error(err);
    throw err;
  }
}

/**
 * Retrieves sum of payable, qunatity, weight for last 6 months based on a given farmer ID.
 * @async
 * @param {{ uid: string }} params - An object containing the 5 digit farmer ID.
 * @returns {Promise<Array<Object>>} A promise resolving to an array of objects representing the farmer's data.
 * @throws {Error} An error is thrown if the query fails.
 * @example const farmerData = await getFarmerDataUsingId({ uid: "1234" });
 */
async function getFarmerMonthlyIncomeDataUsingId({ uid }) {
  try {
    const getDataQuery = `
            SELECT 
              to_char(Entry.date, 'YYYY-MM') as month,
              sum(vendorMemo.payable) as payable,
              sum(Entry.quantity) as quantity,
              sum(Entry.weight) as weight,
              farmers.farmername
              FROM Entry
              LEFT OUTER JOIN vendorMemo ON Entry.transactionid = vendorMemo.entryid
              LEFT OUTER JOIN FARMERS ON ENTRY.farmerid = FARMERS.farmerid
              WHERE EXISTS (
                  SELECT 1
                  FROM FARMERS f
                  WHERE f.uid = $1 AND f.farmerid = Entry.farmerid
              ) AND Entry.date >= current_date - interval '6 months'
              GROUP BY month, farmerName
              ORDER BY month;

        `;
    const farmerData = await runQuery(getDataQuery, [uid]);
    return farmerData;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

/**
 * Check if farmerUID exists in the database.
 * @async
 * @param {string} uid - The farmer UID.
 * @returns {Promise<boolean>} A promise resolving to a boolean value indicating if the farmer exists.
 * @throws {Error} An error is thrown if the query fails.
 * @example const exists = await farmerExists("1234");
 */
async function farmerExists(uid) {
  try {
    const query = `
      SELECT EXISTS (
        SELECT 1
        FROM farmers
        WHERE uid = $1
      );
    `;
    const result = await runQuery(query, [uid]);
    return result[0].exists;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

/**
 * Get max rate of top 3 vendor for a given item in the last 3 days.
 * @async
 * @param {string} item - The item name.
 * @returns {Promise<Array<Object>>} A promise resolving to an array of objects representing the vendor rates.
 * @throws {Error} An error is thrown if the query fails.
 * @example const vendorRates = await getVendorItemRatesForItem("Tomato");
 *
 */
const _getVendorItemRatesForItem = unstable_cache(
  async (item) => {
    const query = `
      SELECT date, vendorName, item, highest_rate
      FROM vendor_item_rates
      WHERE item = $1 AND date >= CURRENT_DATE - INTERVAL '5 Days' AND date <= CURRENT_DATE
      ORDER BY date, highest_rate DESC
    `;
    return runQuery(query, [item]);
  },
  ["vendor_item_rates_v1"],
  { revalidate: 600, tags: ["vendor_item_rates"] }
);
async function getVendorItemRatesForItem(item) {
  return _getVendorItemRatesForItem(item);
}

/**
 * Get all items and their count.
 * @async
 * @returns {Promise<Array<Object>>} A promise resolving to an array of objects representing the items and their count.
 * @throws {Error} An error is thrown if the query fails.
 * @example const items = await getAllItems();
 */
const _getAllItems = unstable_cache(
  async () => {
    const query = `
      SELECT DISTINCT item, COUNT(item) as count
      FROM vendor_item_rates where date >= CURRENT_DATE - INTERVAL '5 Days' AND date <= CURRENT_DATE GROUP BY item ORDER BY count DESC;
    `;
    return runQuery(query, []);
  },
  ["all_items_v1"],
  { revalidate: 3600, tags: ["all_items"] }
);
async function getAllItems() {
  return _getAllItems();
}

/**
 * Get all active and pending advertisements.
 * @async
 * @returns {Promise<Array<Object>>} A promise resolving to an array of objects representing the advertisements.
 * @throws {Error} An error is thrown if the query fails.
 * @example const ads = await getAllAds();
 */
const _getAllAds = unstable_cache(
  async () => {
    const query = `
      SELECT advId, item, requiredWeight, askingPrice, requiredDate, status, description, name as vyapariName
      FROM advertisement
      JOIN localVyapari ON advertisement.vyapariId = localVyapari.vyapariId
      WHERE status IN ('Active', 'Pending')
      ORDER BY requiredDate;
    `;
    return runQuery(query, []);
  },
  ["all_ads_v1"],
  { revalidate: 300, tags: ["all_ads"] }
);
async function getAllAds() {
  return _getAllAds();
}

// async function getMarketRates(market, vegetableId) {
//   // This is a mock function. Replace with actual database query.
//   const mockData = [];
//   const today = new Date();
//   for (let i = 6; i >= 0; i--) {
//     const date = new Date(today);
//     date.setDate(date.getDate() - i);
//     mockData.push({
//       date: date.toISOString().split("T")[0],
//       [`${market}Min`]: Math.floor(Math.random() * 50) + 10,
//       [`${market}Max`]: Math.floor(Math.random() * 50) + 60,
//       [`${market}Avg`]: Math.floor(Math.random() * 50) + 35,
//     });
//   }
//   return mockData;
// }

/**
 * Get market rates for a given market and vegetable.
 * @async
 * @param {string} market - The market name.
 * @param {number} vegetableId - The vegetable ID.
 * @returns {Promise<Array<Object>>} A promise resolving to an array of objects representing the market rates.
 */
const _getMarketRates = unstable_cache(
  async (market, vegetableId) => {
    market = market.toLowerCase();
    const query = `
      SELECT
          date,
          COALESCE(${market}_min, 0) AS ${market}Min,
          COALESCE(${market}_max, 0) AS ${market}Max,
          COALESCE(${market}_avg, 0) AS ${market}Avg
      FROM market_rates
      WHERE vegetable_id = $1
        AND date >= CURRENT_DATE - INTERVAL '7 Days'
        AND date <= CURRENT_DATE
      ORDER BY date;
    `;
    return runQuery(query, [vegetableId]);
  },
  ["market_rates_v1"],
  { revalidate: 600, tags: ["market_rates"] }
);
async function getMarketRates(market, vegetableId) {
  return _getMarketRates(market, vegetableId);
}

/**
 * Get all the daag for the day from entry table.
 * @async
 * @returns {Promise<Array<Object>>} A promise resolving to an array of objects representing the daag.
 */
const _getAllBags = unstable_cache(
  async () => {
    const query = `
      SELECT
          date,
          sum(quantity) as bags
      FROM entry
      WHERE date = CURRENT_DATE
      GROUP BY date
      ORDER BY date;
    `;
    return runQuery(query, []);
  },
  ["all_bags_v1"],
  { revalidate: 300, tags: ["all_bags"] }
);
async function getAllBags() {
  return _getAllBags();
}

const _getNotificationsForFarmers = unstable_cache(
  async () => {
    const query = `
      SELECT
        message_id,
        message,
        active_date,
        customer_type
      FROM whatsapp_messages
      WHERE active_date >= CURRENT_DATE
    `;
    return runQuery(query);
  },
  ["notifications_for_farmers_v1"],
  { revalidate: 300, tags: ["notifications_for_farmers"] }
);
async function getNotificationsForFarmers() {
  return _getNotificationsForFarmers();
}

export {
  runQuery,
  getFarmerDataUsingId,
  getFarmerMonthlyIncomeDataUsingId,
  farmerExists,
  getVendorItemRatesForItem,
  getAllItems,
  getAllAds,
  getMarketRates,
  getAllBags,
  getNotificationsForFarmers,
};

// CREATE TABLE market_rates (
//   id SERIAL PRIMARY KEY,
//   date DATE NOT NULL,
//   vegetable_id INT NOT NULL REFERENCES vegetables(id) ON DELETE CASCADE,
//   hundekari NUMERIC(10, 2),
//   hyperpure NUMERIC(10, 2),
//   mumbai_min NUMERIC(10, 2),
//   mumbai_max NUMERIC(10, 2),
//   mumbai_avg NUMERIC(10, 2),
//   pune_min NUMERIC(10, 2),
//   pune_avg NUMERIC(10, 2),
//   pune_max NUMERIC(10, 2),
//   nagpur_min NUMERIC(10, 2),
//   nagpur_avg NUMERIC(10, 2),
//   nagpur_max NUMERIC(10, 2),
//   gondal_avg NUMERIC(10, 2),
//   bigbasket NUMERIC(10, 2),
//   swiggy NUMERIC(10, 2),
//   ninjacart NUMERIC(10, 2),
//   blinkit NUMERIC(10, 2),
//   chennai_avg NUMERIC(10, 2),
//   bhopal_avg NUMERIC(10, 2),
//   indore_avg NUMERIC(10, 2)
// );

// -- Local Vyapari Table
// CREATE TABLE localVyapari (
//     vyapariId SERIAL PRIMARY KEY,          -- Auto-incremented vyapariId
//     name VARCHAR(255) NOT NULL,            -- Vyapari's name
//     uid VARCHAR(50) NOT NULL UNIQUE,       -- Unique ID for the vyapari
//     address TEXT,                          -- Vyapari's address
//     mobile VARCHAR(15),                    -- Mobile number with a max length of 15 characters
//     email VARCHAR(255),                    -- Vyapari's email
//     joinedOn TIMESTAMP DEFAULT NOW(),      -- Timestamp of when the vyapari joined
//     editedAt TIMESTAMP DEFAULT NOW(),      -- Timestamp of when the vyapari last edited their info
//     ratings NUMERIC(3, 2) DEFAULT 0.0,     -- Ratings with precision (e.g., 4.50), default value is 0.0
//     totalDeals INT DEFAULT 0               -- Total number of deals, default value is 0
// );

// -- Advertisement Table
// CREATE TABLE advertisement (
//     advId SERIAL PRIMARY KEY,              -- Auto-incremented advertisement ID
//     createdAt TIMESTAMP DEFAULT NOW(),     -- Timestamp of when the ad was created
//     item VARCHAR(255) NOT NULL,            -- Item the vyapari is looking for
//     requiredWeight NUMERIC(10, 2),         -- Required weight in kilograms
//     fulfilledWeight NUMERIC(10, 2) DEFAULT 0.00,  -- Fulfilled weight, default is 0
//     askingPrice NUMERIC(10, 2) NOT NULL,   -- Price per unit (e.g., kg)
//     fullfilment BOOLEAN DEFAULT FALSE,     -- Fulfillment status, default is False
//     requiredDate TIMESTAMP,                -- Date by which the produce is required
//     vyapariId INT REFERENCES localVyapari(vyapariId),  -- Foreign key to vyapari
//     status VARCHAR(50) DEFAULT 'Pending',  -- Advertisement status (Pending, Fulfilled, Cancelled), default is Pending
//     description TEXT,                       -- Description of the advertisement
// 	editedAt TIMESTAMP DEFAULT NOW()
// );

// -- Farmer Interest Table
// CREATE TABLE farmerInterest (
//     interestId SERIAL PRIMARY KEY,         -- Auto-incremented interest ID
//     advId INT REFERENCES advertisement(advId),  -- Foreign key to advertisement
//     interestedWeight NUMERIC(10, 2) NOT NULL,   -- Weight the farmer is interested in providing
//     interestTS TIMESTAMP DEFAULT NOW(),    -- Timestamp of the farmer's interest
//     status VARCHAR(50) DEFAULT 'Pending',  -- Status of the interest (Pending, Reviewed, Accepted, Rejected), default is Pending
//     adminNote TEXT,                     -- Admin's note or action
// 	   farmeraddress TEXT,                 -- Farmer's address
// 	   farmermobile VARCHAR(15)             -- Farmer's mobile number
//     name VARCHAR(255)                     -- Farmer's name
// 	editedAt TIMESTAMP DEFAULT NOW()
// );
