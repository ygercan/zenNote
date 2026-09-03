import express from "express";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Cache for exchange rates
  let ratesCache: any = null;
  let lastFetch = 0;
  const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes

  // API route for exchange rates with fallback
  app.get("/api/rates", async (req, res) => {
    const now = Date.now();
    
    if (ratesCache && (now - lastFetch < CACHE_DURATION)) {
      return res.json(ratesCache);
    }

    const sources = [
      "https://open.er-api.com/v6/latest/USD",
      "https://api.exchangerate-api.com/v4/latest/USD"
    ];

    for (const source of sources) {
      try {
        const response = await fetch(source);
        if (!response.ok) continue;
        
        const data = await response.json();
        if (data && data.rates) {
          ratesCache = data.rates;
          lastFetch = now;
          console.log(`Rates updated from: ${source}`);
          return res.json(ratesCache);
        }
      } catch (error) {
        console.error(`Error fetching from ${source}:`, error);
      }
    }

    // If all sources fail but we have cache, return it even if stale
    if (ratesCache) {
      return res.json(ratesCache);
    }

    res.status(500).json({ error: "Failed to fetch rates from all sources" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
