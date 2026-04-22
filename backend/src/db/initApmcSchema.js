const { apmc } = require('./pool');

/**
 * Idempotent bootstrap for the APMC (Agmarknet) database on Railway.
 *
 * This database is brand-new and owned entirely by this backend — unlike the
 * legacy RDS farmer data, we manage migrations inline so a fresh Railway deploy
 * just works. Every statement is IF NOT EXISTS / idempotent, so this runs on
 * every boot without harm.
 *
 * Tables:
 *   markets        — one row per display-APMC (Pune, Nagpur, ...). Each row
 *                    can map to multiple Agmarknet sub-markets (e.g. Pune =
 *                    Pimpri + Moshi + Chakan), which all roll up together.
 *   commodities    — one row per crop/vegetable, Marathi + Agmarknet name map
 *   market_prices  — daily (market_id, commodity_id) → min / max / modal / arrivals
 *   ingest_runs    — observability log for the daily Agmarknet fetch
 *   price_alerts   — per-farmer threshold alerts (wired later, schema ready now)
 *
 * Agmarknet reality check (data.gov.in resource 9ef84268-...):
 *   - The endpoint returns ONLY today's prices (the "Current Daily" dataset).
 *     Historical backfill is not possible from this resource.
 *   - Each physical APMC appears under its own exact name, often with an
 *     " APMC" suffix and a (sub-yard) in parens — e.g. "Pune(Pimpri) APMC",
 *     not "Pune". The seed below uses only names that have been observed
 *     live in the API. Cities that don't yet report are inserted inactive
 *     (active=false, agmarknet_markets='{}') so a future DBA can flip them on.
 */
async function ensureApmcSchema() {
  if (!apmc) {
    console.warn('[initApmcSchema] APMC_DATABASE_URL unset — skipping APMC bootstrap');
    return false;
  }

  const ddl = `
    -- ── Markets (APMCs) ─────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS markets (
      id                 SERIAL PRIMARY KEY,
      slug               VARCHAR(64)  NOT NULL UNIQUE,
      name_eng           VARCHAR(128) NOT NULL,
      name_mar           VARCHAR(128) NOT NULL,
      state_eng          VARCHAR(64)  NOT NULL,
      state_mar          VARCHAR(64),
      district_eng       VARCHAR(64),
      agmarknet_state    VARCHAR(64)  NOT NULL,
      agmarknet_markets  TEXT[]       NOT NULL DEFAULT '{}',
      lat                NUMERIC(9,6),
      lon                NUMERIC(9,6),
      active             BOOLEAN      NOT NULL DEFAULT TRUE,
      sort_order         INT          NOT NULL DEFAULT 100,
      created_at         TIMESTAMPTZ  NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS markets_active_sort ON markets (active, sort_order);

    -- Migration: old schema had a single agmarknet_market VARCHAR; move it
    -- into the array form and drop the old column. Safe to run on fresh DBs
    -- (the DO block is a no-op when the old column doesn't exist).
    ALTER TABLE markets ADD COLUMN IF NOT EXISTS agmarknet_markets TEXT[] NOT NULL DEFAULT '{}';
    DO $mig$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_name='markets' AND column_name='agmarknet_market'
      ) THEN
        UPDATE markets
           SET agmarknet_markets = ARRAY[agmarknet_market]
         WHERE COALESCE(array_length(agmarknet_markets, 1), 0) = 0
           AND agmarknet_market IS NOT NULL;
        ALTER TABLE markets DROP COLUMN agmarknet_market;
      END IF;
    END
    $mig$;

    -- ── Commodities (vegetables, fruits, cereals, pulses, fibre) ────────────
    CREATE TABLE IF NOT EXISTS commodities (
      id                SERIAL PRIMARY KEY,
      slug              VARCHAR(64)  NOT NULL UNIQUE,
      name_eng          VARCHAR(128) NOT NULL,
      name_mar          VARCHAR(128) NOT NULL,
      agmarknet_name    VARCHAR(128) NOT NULL,
      unit              VARCHAR(16)  NOT NULL DEFAULT 'quintal',
      category          VARCHAR(32)  NOT NULL DEFAULT 'vegetable',
      icon_emoji        VARCHAR(8),
      aliases           TEXT[]       NOT NULL DEFAULT '{}',
      active            BOOLEAN      NOT NULL DEFAULT TRUE,
      sort_order        INT          NOT NULL DEFAULT 100,
      created_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
    );
    -- Aliases let farmers search "tamatar", "kanda", "kapas" etc. alongside
    -- the canonical Marathi / English names. Add-column is idempotent.
    ALTER TABLE commodities ADD COLUMN IF NOT EXISTS aliases TEXT[] NOT NULL DEFAULT '{}';
    CREATE INDEX IF NOT EXISTS commodities_active_cat ON commodities (active, category, sort_order);
    CREATE INDEX IF NOT EXISTS commodities_agmarknet_name ON commodities (agmarknet_name);

    -- ── Daily prices (the main time-series table) ───────────────────────────
    CREATE TABLE IF NOT EXISTS market_prices (
      id            BIGSERIAL PRIMARY KEY,
      price_date    DATE         NOT NULL,
      market_id     INT          NOT NULL REFERENCES markets(id)     ON DELETE RESTRICT,
      commodity_id  INT          NOT NULL REFERENCES commodities(id) ON DELETE RESTRICT,
      variety       VARCHAR(64)  NOT NULL DEFAULT '',
      grade         VARCHAR(32)  NOT NULL DEFAULT '',
      sub_market    VARCHAR(128) NOT NULL DEFAULT '',
      min_price     NUMERIC(10,2),
      max_price     NUMERIC(10,2),
      modal_price   NUMERIC(10,2),
      arrivals_qtl  NUMERIC(12,2),
      source        VARCHAR(32)  NOT NULL DEFAULT 'agmarknet',
      fetched_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
      UNIQUE (price_date, market_id, commodity_id, variety, grade, sub_market)
    );
    -- Back-compat: sub_market was added later so existing deployments need
    -- an in-place ADD + index; safe to run repeatedly.
    ALTER TABLE market_prices ADD COLUMN IF NOT EXISTS sub_market VARCHAR(128) NOT NULL DEFAULT '';
    CREATE INDEX IF NOT EXISTS market_prices_commodity_date
      ON market_prices (commodity_id, price_date DESC);
    CREATE INDEX IF NOT EXISTS market_prices_market_cmdy_date
      ON market_prices (market_id, commodity_id, price_date DESC);
    CREATE INDEX IF NOT EXISTS market_prices_date
      ON market_prices (price_date DESC);

    -- ── Ingest observability ────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS ingest_runs (
      id              BIGSERIAL PRIMARY KEY,
      source          VARCHAR(32)  NOT NULL,
      started_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
      finished_at     TIMESTAMPTZ,
      status          VARCHAR(16)  NOT NULL DEFAULT 'running',
      rows_upserted   INT          NOT NULL DEFAULT 0,
      rows_skipped    INT          NOT NULL DEFAULT 0,
      error_message   TEXT,
      metadata        JSONB
    );
    CREATE INDEX IF NOT EXISTS ingest_runs_started ON ingest_runs (started_at DESC);

    -- ── Future: per-farmer price alerts (FCM push) ──────────────────────────
    CREATE TABLE IF NOT EXISTS price_alerts (
      id            BIGSERIAL PRIMARY KEY,
      farmer_uid    VARCHAR(32)  NOT NULL,
      market_id     INT          NOT NULL REFERENCES markets(id),
      commodity_id  INT          NOT NULL REFERENCES commodities(id),
      threshold     NUMERIC(10,2) NOT NULL,
      direction     VARCHAR(8)    NOT NULL CHECK (direction IN ('above','below')),
      fcm_token     TEXT,
      active        BOOLEAN       NOT NULL DEFAULT TRUE,
      created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
      last_fired_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS price_alerts_active
      ON price_alerts (commodity_id, market_id) WHERE active;
  `;

  await apmc.query(ddl);

  // ── Seed markets (Maharashtra APMCs) ──────────────────────────────────────
  //
  // Each row = one display-market. agmarknet_markets lists the exact APMC
  // strings that Agmarknet uses (verified live against data.gov.in on
  // 2026-04-21). Multiple strings roll up together — e.g. "Pune" aggregates
  // Pimpri + Moshi + Chakan yards, which farmers treat as one market.
  //
  // Cities with an empty array haven't been seen reporting yet — they're
  // inserted inactive so the app doesn't show empty rows, and can be flipped
  // on with a single UPDATE once they start appearing in the API.
  const marketSeeds = [
    // slug, name_eng, name_mar, district, sort, agmarknet_markets, active
    ['pune',         'Pune',                 'पुणे',                 'Pune',       10,
      ['Pune(Pimpri) APMC', 'Pune(Moshi) APMC', 'Khed(Chakan) APMC'], true],
    ['nagpur',       'Nagpur',               'नागपूर',               'Nagpur',     20,
      ['Nagpur APMC', 'Kalmeshwar APMC', 'Kamthi APMC'], true],
    ['kolhapur',     'Kolhapur',             'कोल्हापूर',            'Kolhapur',   30,
      ['Kolhapur APMC'], true],
    ['nashik',       'Nashik (Pimpalgaon)',  'नाशिक (पिंपळगाव)',     'Nashik',     40,
      ['Pimpalgaon Baswant(Saykheda) APMC'], true],
    ['jalgaon',      'Jalgaon',              'जळगाव',                'Jalgaon',    50,
      ['Jalgaon(Masawat) APMC'], true],
    ['ahmednagar',   'Ahmednagar (Rahuri)',  'अहमदनगर (राहुरी)',     'Ahmednagar', 60,
      ['Rahuri APMC'], true],
    ['konkan',       'Konkan (Vasai-Palghar)','कोकण (वसई-पालघर)',   'Palghar',    70,
      ['Vasai APMC', 'Palghar APMC', 'Ulhasnagar APMC', 'Alibagh APMC', 'Murbad APMC', 'Murud APMC'], true],
    ['satara',       'Satara (Vai)',         'सातारा (वाई)',         'Satara',     80,
      ['Vai APMC'], true],
    ['sangli',       'Sangli (Aatpadi)',     'सांगली (आटपाडी)',      'Sangli',     90,
      ['Aatpadi APMC'], true],
    ['jalna',        'Jalna (Bhokardan)',    'जालना (भोकरदन)',       'Jalna',     100,
      ['Bhokardan(Pimpalgaon Renu) APMC'], true],

    // Mumbai (Vashi) APMC ships via apmcmumbai.org scraper (jobs/ingestApmcMumbai.js),
    // not Agmarknet — hence agmarknet_markets stays empty. It's still active so
    // the /markets endpoint surfaces it and the Mumbai ingest has a valid target.
    ['mumbai-vashi', 'Mumbai (Vashi)',       'मुंबई (वाशी)',          'Mumbai',     15, [], true],

    // Not yet observed in Agmarknet AND no scraper yet — kept inactive until a
    // sub-market name is discovered or a dedicated source is wired in. Adding
    // a city = a single UPDATE ... SET agmarknet_markets, active = true.
    ['solapur',      'Solapur',              'सोलापूर',              'Solapur',   210, [], false],
    ['latur',        'Latur',                'लातूर',                'Latur',     220, [], false],
    ['aurangabad',   'Chh. Sambhajinagar',   'छत्रपती संभाजीनगर',    'Aurangabad',230, [], false],
    ['amravati',     'Amravati',             'अमरावती',              'Amravati',  240, [], false],
    ['akola',        'Akola',                'अकोला',                'Akola',     250, [], false],
  ];

  for (const [slug, nameEn, nameMr, district, sort, subMarkets, active] of marketSeeds) {
    // DO UPDATE on agmarknet_markets only when the existing row has an empty
    // array — this lets us ship new sub-market discoveries without clobbering
    // manual DBA edits. Other fields (name, sort_order, active) follow the
    // same "don't overwrite once set" principle via COALESCE.
    await apmc.query(
      `INSERT INTO markets
         (slug, name_eng, name_mar, state_eng, state_mar, district_eng,
          agmarknet_state, agmarknet_markets, sort_order, active)
       VALUES ($1, $2, $3, 'Maharashtra', 'महाराष्ट्र', $4,
               'Maharashtra', $5::text[], $6, $7)
       ON CONFLICT (slug) DO UPDATE SET
         agmarknet_markets = CASE
           WHEN COALESCE(array_length(markets.agmarknet_markets, 1), 0) = 0
             THEN EXCLUDED.agmarknet_markets
           ELSE markets.agmarknet_markets
         END`,
      [slug, nameEn, nameMr, district, subMarkets, sort, active]
    );
  }

  // ── One-off corrections for markets that existed before the current
  //    scrape/ingest wiring was in place ─────────────────────────────────────
  //
  // mumbai-vashi was first seeded (in a previous schema version) as
  // `active = false, sort_order = 200` because we had no data source for it.
  // The apmcmumbai.org scraper (jobs/ingestApmcMumbai.js) now feeds it
  // daily across 3 yards, so promote it to a first-class active market with
  // the same sort_order the current seed uses. Idempotent — re-running this
  // on an already-correct row is a no-op.
  await apmc.query(
    `UPDATE markets
        SET active = TRUE,
            sort_order = 15
      WHERE slug = 'mumbai-vashi'
        AND (active IS DISTINCT FROM TRUE OR sort_order <> 15)`
  );

  // ── Seed commodities ──────────────────────────────────────────────────────
  // Vegetables first (matches the 24-item list currently hardcoded in the web UI),
  // then the major Maharashtra field crops that non-HHG farmers actually care
  // about (cotton, soybean, tur, chana, jowar, bajra, wheat, maize, groundnut,
  // sugarcane). agmarknet_name must match data.gov.in's "commodity" field
  // exactly — these are the strings Agmarknet actually returns.
  await apmc.query(`
    INSERT INTO commodities
      (slug, name_eng, name_mar, agmarknet_name, category, icon_emoji, sort_order)
    VALUES
      -- Vegetables
      ('tomato',        'Tomato',          'टोमॅटो',          'Tomato',                       'vegetable', '🍅', 10),
      ('onion',         'Onion',           'कांदा',           'Onion',                        'vegetable', '🧅', 20),
      ('potato',        'Potato',          'बटाटा',           'Potato',                       'vegetable', '🥔', 30),
      ('cabbage',       'Cabbage',         'कोबी',            'Cabbage',                      'vegetable', '🥬', 40),
      ('cauliflower',   'Cauliflower',     'फ्लॉवर',          'Cauliflower',                  'vegetable', '🥦', 50),
      ('green-chilli',  'Green Chilli',    'मिरची',           'Green Chilli',                 'vegetable', '🌶️', 60),
      ('okra',          'Okra (Bhindi)',   'भेंडी',           'Bhindi(Ladies Finger)',        'vegetable', '🌿', 70),
      ('cucumber',      'Cucumber',        'काकडी',           'Cucumbar(Kheera)',             'vegetable', '🥒', 80),
      ('brinjal',       'Brinjal',         'वांगी',           'Brinjal',                      'vegetable', '🍆', 90),
      ('capsicum',      'Capsicum',        'ढोबळी मिरची',    'Capsicum',                     'vegetable', '🫑', 100),
      ('carrot',        'Carrot',          'गाजर',            'Carrot',                       'vegetable', '🥕', 110),
      ('bitter-gourd',  'Bitter Gourd',    'कारले',           'Bitter gourd',                 'vegetable', '🥒', 120),
      ('ridge-gourd',   'Ridge Gourd',     'दोडका',           'Ridgeguard(Tori)',             'vegetable', '🥒', 130),
      ('bottle-gourd',  'Bottle Gourd',    'दुधी भोपळा',      'Bottle gourd',                 'vegetable', '🥒', 140),
      ('peas',          'Peas',            'वाटाणा',          'Peas Wet',                     'vegetable', '🫛', 150),
      ('cluster-beans', 'Cluster Beans',   'गवार',            'Cluster beans',                'vegetable', '🌿', 160),
      ('french-beans',  'French Beans',    'फरशी',            'French Beans (Frasbean)',      'vegetable', '🌿', 170),
      ('cowpea',        'Cowpea',          'चवळी',            'Cowpea (Veg)',                 'vegetable', '🌿', 180),
      ('ginger',        'Ginger',          'आले',             'Ginger(Green)',                'vegetable', '🫚', 190),
      ('garlic',        'Garlic',          'लसूण',            'Garlic',                       'vegetable', '🧄', 200),

      -- Fruits
      ('pomegranate',   'Pomegranate',     'डाळिंब',          'Pomegranate',                  'fruit',     '🍎', 300),
      ('apple',         'Apple',           'सफरचंद',          'Apple',                        'fruit',     '🍎', 310),
      ('orange',        'Nagpur Orange',   'नागपुरी संत्री',  'Orange',                       'fruit',     '🍊', 320),
      ('papaya',        'Papaya',          'पपई',             'Papaya',                       'fruit',     '🥭', 330),
      ('lemon',         'Lemon',           'लिंबू',           'Lemon',                        'fruit',     '🍋', 340),
      ('banana',        'Banana',          'केळी',            'Banana',                       'fruit',     '🍌', 350),
      ('mango',         'Mango',           'आंबा',            'Mango',                        'fruit',     '🥭', 360),
      ('grapes',        'Grapes',          'द्राक्षे',         'Grapes',                       'fruit',     '🍇', 370),

      -- Field crops (the big ones for Vidarbha / Marathwada farmers)
      ('cotton',        'Cotton (Kapas)',  'कापूस',           'Cotton',                       'fibre',     '🪨', 500),
      ('soybean',       'Soybean',         'सोयाबीन',         'Soyabean',                     'oilseed',   '🫘', 510),
      ('tur',           'Tur (Arhar)',     'तूर',             'Arhar (Tur/Red Gram)(Whole)',  'pulse',     '🫘', 520),
      ('chana',         'Chana (Gram)',    'हरभरा',           'Bengal Gram(Gram)(Whole)',     'pulse',     '🫘', 530),
      ('moong',         'Moong',           'मूग',             'Green Gram (Moong)(Whole)',    'pulse',     '🫘', 540),
      ('urad',          'Urad',            'उडीद',            'Black Gram (Urd Beans)(Whole)','pulse',    '🫘', 550),
      ('wheat',         'Wheat',           'गहू',             'Wheat',                        'cereal',    '🌾', 560),
      ('jowar',         'Jowar (Sorghum)', 'ज्वारी',          'Jowar(Sorghum)',               'cereal',    '🌾', 570),
      ('bajra',         'Bajra',           'बाजरी',           'Bajra(Pearl Millet/Cumbu)',    'cereal',    '🌾', 580),
      ('maize',         'Maize',           'मका',             'Maize',                        'cereal',    '🌽', 590),
      ('groundnut',     'Groundnut',       'भुईमूग',          'Groundnut',                    'oilseed',   '🥜', 600),
      ('sunflower',     'Sunflower',       'सूर्यफूल',         'Sunflower',                    'oilseed',   '🌻', 610),
      ('turmeric',      'Turmeric',        'हळद',             'Turmeric',                     'spice',     '🌿', 700),
      ('sugarcane',     'Sugarcane',       'ऊस',              'Sugarcane',                    'cash',      '🎋', 800),

      -- Leafy greens + specialty vegetables (mostly from the Mumbai APMC feed;
      -- not all are reported by Agmarknet but the rows let the UI render them
      -- consistently across all data sources).
      ('spinach',          'Spinach',         'पालक',         'Spinach',                  'vegetable', '🥬', 900),
      ('methi-leaves',     'Methi (Leaves)',  'मेथी भाजी',     'Methi(Leaves)',            'vegetable', '🌿', 910),
      ('coriander-leaves', 'Coriander',       'कोथिंबीर',     'Coriander(Leaves)',        'vegetable', '🌿', 920),
      ('mint',             'Mint',            'पुदिना',        'Mint(Pudina)',             'vegetable', '🌿', 930),
      ('dill',             'Dill (Shepu)',    'शेपू',          'Dill (Shepu)',             'vegetable', '🌿', 940),
      ('curry-leaves',     'Curry Leaves',    'कढीपत्ता',     'Curry Leaves',             'vegetable', '🌿', 950),
      ('spring-onion',     'Spring Onion',    'कांदापात',     'Onion Green',              'vegetable', '🌱', 960),
      ('radish',           'Radish',          'मुळा',          'Raddish',                  'vegetable', '🥕', 970),
      ('drumstick',        'Drumstick',       'शेवगा शेंग',   'Drumstick',                'vegetable', '🌿', 980),
      ('raw-mango',        'Raw Mango',       'कैरी',          'Mango(Raw-Ripe)',          'fruit',     '🥭', 990),
      ('jackfruit',        'Jackfruit',       'फणस',           'Jack Fruit',               'fruit',     '🌳', 1000),
      ('sweet-potato',     'Sweet Potato',    'रताळी',         'Sweet Potato',             'vegetable', '🍠', 1010),
      ('yam',              'Yam (Suran)',     'सुरण',          'Yam',                      'vegetable', '🌱', 1020),
      ('taro',             'Taro (Arvi)',     'आरवी',          'Colacasia',                'vegetable', '🌱', 1030),
      ('amla',             'Amla',            'आवळा',          'Amla',                     'fruit',     '🫒', 1040),
      ('beetroot',         'Beetroot',        'बीट',           'Beetroot',                 'vegetable', '🟣', 1050),
      ('pumpkin',          'Pumpkin',         'भोपळा',        'Pumpkin',                  'vegetable', '🎃', 1060),
      ('white-pumpkin',    'Ash Gourd',       'कोहळा',        'Ash Gourd(Neelkant)',      'vegetable', '🎃', 1070),
      ('snake-gourd',      'Snake Gourd',     'पडवळ',          'Snake Gourd',              'vegetable', '🥒', 1080),
      ('pointed-gourd',    'Pointed Gourd',   'परवर',          'Pointed gourd (Parval)',   'vegetable', '🥒', 1090),
      ('ivy-gourd',        'Ivy Gourd',       'तोंडली',        'Tondli',                   'vegetable', '🥒', 1100),
      ('tinda',            'Tinda',           'ढेमसे',         'Tinda',                    'vegetable', '🥒', 1110),
      ('raw-banana',       'Raw Banana',      'केळी भाजी',    'Banana - Green',           'vegetable', '🍌', 1120),
      ('flat-beans',       'Flat Beans',      'घेवडा',         'Surat Beans (Papadi)',     'vegetable', '🌿', 1130),
      ('field-beans',      'Field Beans',     'वालवड',         'Val',                      'vegetable', '🌿', 1140),
      ('groundnut-green',  'Green Groundnut', 'भुईमूग शेंगा',  'Groundnut pods (wet)',     'pulse',     '🥜', 1150),

      -- Additional fruits from the Mumbai APMC fruit yard (/bajarbhav/.../fruit).
      -- Grade numbers and region-variety distinctions (Devgad vs Ratnagiri
      -- Alphonso, etc.) are stored on market_prices.variety, not as separate
      -- commodity rows — it keeps the UI clean and lets farmers compare grades
      -- of the same fruit side-by-side.
      ('pineapple',        'Pineapple',       'अननस',          'Pineapple',                'fruit',     '🍍', 380),
      ('fig',              'Fig',             'अंजीर',          'Fig(Anjura/Anjeer)',       'fruit',     '🫐', 385),
      ('sapota',           'Sapota (Chikoo)', 'चिकू',           'Chikoos(Sapota)',          'fruit',     '🟤', 390),
      ('watermelon',       'Watermelon',      'कलिंगड',        'Water Melon',              'fruit',     '🍉', 395),
      ('muskmelon',        'Muskmelon',       'खरबूज',          'Karbuja(Musk Melon)',      'fruit',     '🍈', 400),
      ('mosambi',          'Mosambi',         'मोसंबी',         'Mousambi(Sweet Lime)',     'fruit',     '🍋', 405),
      ('guava',            'Guava',           'पेरू',           'Guava',                    'fruit',     '🍐', 410),
      ('strawberry',       'Strawberry',      'स्ट्रॉबेरी',      'Strawberry',               'fruit',     '🍓', 415),
      ('sweet-corn',       'Sweet Corn',      'मका',            'Corn(Maize)',              'vegetable', '🌽', 1160)
    ON CONFLICT (slug) DO NOTHING;
  `);

  // ── Aliases (multilingual / phonetic search helpers) ──────────────────────
  // One UPDATE per commodity, only applied when aliases is still empty so a
  // DBA-edited alias list is never overwritten. These are the common spellings
  // farmers actually type — Marathi phonetic in Roman, Hindi, rural variants.
  const aliasUpdates = [
    ['tomato',        ['tamatar', 'tamater', 'टमाटर', 'टोमाटो']],
    ['onion',         ['kanda', 'pyaaz', 'pyaj', 'प्याज']],
    ['potato',        ['batata', 'aloo', 'आलू']],
    ['cabbage',       ['kobi', 'patta gobi', 'पत्ता गोभी']],
    ['cauliflower',   ['flower', 'phool gobi', 'फूल गोभी']],
    ['green-chilli',  ['mirchi', 'mirch', 'हरी मिर्च', 'hari mirch']],
    ['okra',          ['bhendi', 'bhindi', 'भिंडी', 'ladyfinger']],
    ['cucumber',      ['kakdi', 'kheera', 'खीरा']],
    ['brinjal',       ['vangi', 'baingan', 'eggplant', 'बैंगन']],
    ['capsicum',      ['dhobali mirchi', 'shimla mirch', 'bell pepper', 'शिमला मिर्च']],
    ['carrot',        ['gajar', 'गाजर']],
    ['bitter-gourd',  ['karle', 'karela', 'करेला']],
    ['ridge-gourd',   ['dodka', 'turai', 'tori', 'तुरई']],
    ['bottle-gourd',  ['dudhi', 'lauki', 'लौकी']],
    ['peas',          ['vatana', 'matar', 'मटर']],
    ['cluster-beans', ['gavar', 'guar', 'ग्वार']],
    ['french-beans',  ['farshi', 'fansi', 'beans', 'फरसबीन']],
    ['cowpea',        ['chawli', 'lobia', 'लोबिया']],
    ['ginger',        ['aale', 'adrak', 'अदरक']],
    ['garlic',        ['lasun', 'lehsun', 'लहसुन']],
    ['pomegranate',   ['dalimb', 'anar', 'अनार']],
    ['apple',         ['safarchand', 'seb', 'सेब']],
    ['orange',        ['santra', 'santre', 'संत्रा']],
    ['papaya',        ['papai', 'papita', 'पपीता']],
    ['lemon',         ['limbu', 'nimbu', 'नींबू']],
    ['banana',        ['keli', 'kela', 'केला']],
    ['mango',         ['amba', 'aam', 'आम']],
    ['grapes',        ['draksh', 'angoor', 'अंगूर']],
    ['cotton',        ['kapus', 'kapas', 'रूई', 'ruyi']],
    ['soybean',       ['soyabean', 'soya', 'सोया']],
    ['tur',           ['toor', 'arhar', 'red gram', 'अरहर']],
    ['chana',         ['harbhara', 'gram', 'bengal gram', 'चना']],
    ['moong',         ['mug', 'green gram', 'मूंग']],
    ['urad',          ['udid', 'black gram', 'उड़द']],
    ['wheat',         ['gehu', 'gehun', 'गेहूं']],
    ['jowar',         ['jwari', 'sorghum', 'ज्वार']],
    ['bajra',         ['bajari', 'pearl millet', 'बाजरा']],
    ['maize',         ['makka', 'corn', 'मक्का']],
    ['groundnut',     ['bhuimug', 'peanut', 'moongfali', 'मूंगफली']],
    ['sunflower',     ['suryaful', 'सूरजमुखी', 'surajmukhi']],
    ['turmeric',      ['halad', 'haldi', 'हल्दी']],
    ['sugarcane',     ['us', 'ganna', 'गन्ना']],

    ['spinach',          ['palak', 'palak bhaji', 'पालक भाजी']],
    ['methi-leaves',     ['methi', 'methi bhaji', 'fenugreek leaves', 'मेथी']],
    ['coriander-leaves', ['kothimbir', 'dhaniya', 'cilantro', 'धनिया']],
    ['mint',             ['pudina', 'pudhina', 'पुदीना']],
    ['dill',             ['shepu', 'suva bhaji', 'सोया']],
    ['curry-leaves',     ['kadipatta', 'curry patta', 'कढ़ीपत्ता']],
    ['spring-onion',     ['kanda pat', 'hare kanda', 'green onion', 'हरा प्याज']],
    ['radish',           ['mula', 'mooli', 'मूली']],
    ['drumstick',        ['shevga', 'shevga sheng', 'moringa', 'saragwa', 'सहजन']],
    ['raw-mango',        ['kairi', 'keri', 'kachcha aam', 'कच्चा आम']],
    ['jackfruit',        ['phanas', 'fanas', 'kathal', 'कटहल']],
    ['sweet-potato',     ['ratali', 'shakarkand', 'शकरकंद']],
    ['yam',              ['suran', 'jimikand', 'जिमीकंद']],
    ['taro',             ['arvi', 'arbi', 'alu kand', 'अरबी']],
    ['amla',             ['avla', 'amla', 'amaltas', 'आँवला']],
    ['beetroot',         ['beet', 'chukandar', 'चुकंदर']],
    ['pumpkin',          ['bhopla', 'bhopalan', 'kaddu', 'dangar', 'कद्दू']],
    ['white-pumpkin',    ['kohla', 'petha', 'ash gourd', 'पेठा']],
    ['snake-gourd',      ['padwal', 'chichinda', 'चिचिंडा']],
    ['pointed-gourd',    ['parvar', 'parwal', 'परवल']],
    ['ivy-gourd',        ['tondli', 'kundru', 'tendli', 'कुंदरू']],
    ['tinda',            ['dhemse', 'tinda', 'टिंडा']],
    ['raw-banana',       ['keli bhaji', 'kachcha kela', 'plantain', 'कच्चा केला']],
    ['flat-beans',       ['ghewda', 'ghevda', 'sem', 'papdi', 'सेम']],
    ['field-beans',      ['walwad', 'val', 'val papdi', 'वाल']],
    ['groundnut-green',  ['bhuimug sheng', 'hari moongfali', 'raw groundnut', 'कच्ची मूंगफली']],

    ['pineapple',  ['ananas', 'pineapple', 'अननस']],
    ['fig',        ['anjeer', 'anjir', 'अंजीर', 'anjura']],
    ['sapota',     ['chikoo', 'chiku', 'sapota', 'चीकू']],
    ['watermelon', ['kalingad', 'tarbooj', 'तरबूज']],
    ['muskmelon',  ['kharbooj', 'kharbuja', 'खरबूजा']],
    ['mosambi',    ['mosambi', 'sweet lime', 'मोसंबी']],
    ['guava',      ['peru', 'amrud', 'अमरूद']],
    ['strawberry', ['strawberry', 'स्ट्राबेरी']],
    ['sweet-corn', ['maka', 'corn', 'bhutta', 'भुट्टा', 'makka', 'मक्का']],
  ];
  for (const [slug, aliases] of aliasUpdates) {
    await apmc.query(
      `UPDATE commodities SET aliases = $2::text[]
         WHERE slug = $1 AND (aliases IS NULL OR array_length(aliases, 1) IS NULL)`,
      [slug, aliases]
    );
  }

  const [{ count: mkts }]       = (await apmc.query('SELECT COUNT(*)::int AS count FROM markets')).rows;
  const [{ count: activeMkts }] = (await apmc.query('SELECT COUNT(*)::int AS count FROM markets WHERE active')).rows;
  const [{ count: cmds }]       = (await apmc.query('SELECT COUNT(*)::int AS count FROM commodities')).rows;
  console.log(
    `[initApmcSchema] ready — ${mkts} markets (${activeMkts} active), ${cmds} commodities (with aliases)`
  );
  return true;
}

module.exports = { ensureApmcSchema };
