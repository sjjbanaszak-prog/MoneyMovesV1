const functions = require("firebase-functions");
const axios = require("axios");
const cors = require("cors")({ origin: true });

exports.proxyYahooFinance = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const { tickers } = req.query;

      if (!tickers) {
        return res.status(400).json({ error: "Missing tickers param" });
      }

      const yahooURL = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${tickers}`;
      const response = await axios.get(yahooURL);
      res.json(response.data);
    } catch (err) {
      console.error("Yahoo proxy error:", err.message);
      res.status(500).json({ error: "Internal server error" });
    }
  });
});
