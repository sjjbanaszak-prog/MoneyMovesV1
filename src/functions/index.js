const functions = require("firebase-functions");
const axios = require("axios");

// H-1: Restrict CORS to known origins only.
// Add your production Vercel domain to this list.
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  // TODO: add your production domain, e.g. "https://your-app.vercel.app"
];

const cors = require("cors")({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. same-origin, curl during dev)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
});

exports.proxyYahooFinance = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const { tickers } = req.query;

      if (!tickers) {
        return res.status(400).json({ error: "Missing tickers parameter" });
      }

      // H-2: Whitelist-validate tickers — only allow characters valid in
      // stock/ETF ticker symbols. Rejects any injection attempt.
      if (!/^[A-Za-z0-9.,\-]+$/.test(tickers)) {
        return res.status(400).json({ error: "Invalid tickers parameter" });
      }

      const yahooURL = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(tickers)}`;
      const response = await axios.get(yahooURL);
      res.json(response.data);
    } catch (err) {
      console.error("Yahoo proxy error:", err.message);
      res.status(500).json({ error: "Internal server error" });
    }
  });
});
