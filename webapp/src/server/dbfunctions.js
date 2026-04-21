"use server";
import { Pool } from "pg";
import "dotenv/config";

/**
 * Executes a given SQL query against the database.
 * @param {string} query - The SQL query string.
 * @param {Array<any>} [values=[]] - An array of values to replace placeholders in the query.
 * @returns {Promise<Array<Object>>} A promise resolving to an array of objects representing rows returned by the query.
 */
async function runQuery(query, values = []) {
  if (!process.env.DATABASE_URLR) {
    console.error("Database connection string (DATABASE_URL) is not defined");
    throw new Error(
      "Database configuration error: DATABASE_URL is not defined"
    );
  }

  console.log(
    "Connecting to database with connection string:",
    process.env.DATABASE_URLR.replace(/:([^:]+)@/, ":***@")
  ); // Hide password in logs

  const pool = new Pool({
    connectionString: process.env.DATABASE_URLR,
    ssl: {
      rejectUnauthorized: false,
    },
    connectionTimeoutMillis: 5000, // 5 seconds timeout
    idleTimeoutMillis: 5000,
  });

  const client = await pool.connect().catch((err) => {
    console.error("Failed to connect to database:", err);
    throw new Error(`Database connection failed: ${err.message}`);
  });

  try {
    console.log("Executing query:", query);
    console.log("With values:", values);

    const start = Date.now();
    const result = await client.query(query, values);
    const duration = Date.now() - start;

    console.log(
      `Query executed in ${duration}ms, returned ${result.rowCount} rows`
    );
    return result.rows;
  } catch (error) {
    console.error("Database query error:", {
      error: error.message,
      query: query,
      values: values,
      stack: error.stack,
    });
    throw new Error(`Query failed: ${error.message}`);
  } finally {
    try {
      client.release();
    } catch (releaseError) {
      console.error("Error releasing database client:", releaseError);
    }
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
async function getVendorItemRatesForItem(item) {
  try {
    const query = `
      SELECT date, vendorName, item, highest_rate
      FROM vendor_item_rates
      WHERE item = $1 AND date >= CURRENT_DATE - INTERVAL '5 Days' AND date <= CURRENT_DATE
      ORDER BY date, highest_rate DESC
    `;
    const result = await runQuery(query, [item]);
    return result;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

/**
 * Get all items and their count.
 * @async
 * @returns {Promise<Array<Object>>} A promise resolving to an array of objects representing the items and their count.
 * @throws {Error} An error is thrown if the query fails.
 * @example const items = await getAllItems();
 */
async function getAllItems() {
  try {
    const query = `
      SELECT DISTINCT item, COUNT(item) as count
      FROM vendor_item_rates where date >= CURRENT_DATE - INTERVAL '5 Days' AND date <= CURRENT_DATE GROUP BY item ORDER BY count DESC;
    `;
    const result = await runQuery(query, []);
    return result;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

/**
 * Get all active and pending advertisements.
 * @async
 * @returns {Promise<Array<Object>>} A promise resolving to an array of objects representing the advertisements.
 * @throws {Error} An error is thrown if the query fails.
 * @example const ads = await getAllAds();
 */
async function getAllAds() {
  try {
    // join with localVyapari to get the name of the vyapari
    const query = `
      SELECT advId, item, requiredWeight, askingPrice, requiredDate, status, description, name as vyapariName
      FROM advertisement
      JOIN localVyapari ON advertisement.vyapariId = localVyapari.vyapariId
      WHERE status IN ('Active', 'Pending')
      ORDER BY requiredDate;
    `;
    const result = await runQuery(query, []);
    return result;
  } catch (err) {
    console.error(err);
    throw err;
  }
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
async function getMarketRates(market, vegetableId) {
  try {
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

    const result = await runQuery(query, [vegetableId]);
    console.log(result);
    return result;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

/**
 * Get all the daag for the day from entry table.
 * @async
 * @returns {Promise<Array<Object>>} A promise resolving to an array of objects representing the daag.
 */
async function getAllBags() {
  try {
    const query = `
      SELECT 
          date, 
          sum(quantity) as bags
      FROM entry
      WHERE date = CURRENT_DATE
      GROUP BY date
      ORDER BY date;
    `;

    const result = await runQuery(query, []);
    console.log(result);
    return result;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

async function getNotificationsForFarmers() {
  try {
    const query = `
      SELECT 
      message_id, 
      message, 
      active_date, 
      customer_type
    FROM whatsapp_messages
    WHERE active_date >= CURRENT_DATE
    `;

    const result = await runQuery(query);
    return result;
  } catch (err) {
    console.error(err);
    throw err;
  }
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
