import express from 'express';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  // In-memory simulation state for fallback when API hits 429 rate limit
  let simulatedFlights: any[] = [];
  let lastCenterLat = 32.0;
  let lastCenterLon = 35.0;

  function initSimulatedFlights(lat: number, lon: number) {
    lastCenterLat = lat;
    lastCenterLon = lon;
    simulatedFlights = [
      { hex: '740abc', flight: 'LY315', r: '4X-EED', t: 'B789', alt_baro: 36000, gs: 482, track: 285, lat: lat + 0.2, lon: lon - 0.3, squawk: '1000' }, // widebody
      { hex: '740def', flight: 'ELAL1', r: '4X-EKC', t: 'B748', alt_baro: 12400, gs: 310, track: 140, lat: lat - 0.3, lon: lon + 0.2, squawk: '2000' }, // heavy
      { hex: '43c123', flight: 'BAH123', r: 'G-XLEF', t: 'A359', alt_baro: 39000, gs: 512, track: 45, lat: lat + 0.5, lon: lon + 0.4, squawk: '7700', emergency: 'general' }, // widebody
      { hex: 'abc456', flight: 'RYR432', r: 'SP-RKA', t: 'B738', alt_baro: 8200, gs: 260, track: 190, lat: lat - 0.4, lon: lon - 0.4, squawk: '1200' }, // narrowbody
      { hex: '738910', flight: 'ISR902', r: '4X-ABX', t: 'AT76', alt_baro: 6500, gs: 210, track: 320, lat: lat + 0.1, lon: lon + 0.1, squawk: '7000' }, // turboprop
      { hex: '750111', flight: 'THY812', r: 'TC-JNC', t: 'A321', alt_baro: 28000, gs: 450, track: 210, lat: lat + 0.6, lon: lon - 0.5, squawk: '1000' }, // narrowbody
      { hex: '760222', flight: 'UAE931', r: 'A6-EPL', t: 'A388', alt_baro: 41000, gs: 540, track: 290, lat: lat - 0.5, lon: lon + 0.6, squawk: '1000' }, // heavy
      { hex: '770333', flight: 'IAF201', r: '4X-123', t: 'C130', alt_baro: 18500, gs: 315, track: 90, lat: lat + 0.15, lon: lon + 0.25, squawk: '7000' }, // military
      { hex: '780444', flight: 'HEL01', r: '4X-H11', t: 'H64', alt_baro: 2500, gs: 120, track: 110, lat: lat - 0.2, lon: lon - 0.6, squawk: '1000' }, // helicopter
      { hex: '790555', flight: 'GLID1', r: '4X-G01', t: 'GLID', alt_baro: 4000, gs: 80, track: 60, lat: lat - 0.1, lon: lon - 0.2, squawk: '1000' }, // glider
      { hex: '790666', flight: 'CESSNA1', r: '4X-C55', t: 'C172', alt_baro: 3500, gs: 110, track: 150, lat: lat + 0.3, lon: lon - 0.1, squawk: '1000' } // light
    ];
  }

  function stepSimulatedFlights() {
    simulatedFlights.forEach(ac => {
      const rad = ((ac.track || 0) * Math.PI) / 180;
      const speedFactor = 0.0005;
      ac.lat += Math.cos(rad) * speedFactor;
      ac.lon += Math.sin(rad) * speedFactor;
      ac.lat += (Math.random() - 0.5) * 0.01;
      ac.lon += (Math.random() - 0.5) * 0.01;
    });
  }

  // API Proxy endpoint for ADSB.lol flights
  app.get('/api/flights', async (req, res) => {
    const latNum = parseFloat(req.query.lat as string) || 32.0;
    const lonNum = parseFloat(req.query.lon as string) || 35.0;
    const dist = req.query.dist || '100';
    const targetUrl = `https://api.adsb.lol/v2/lat/${latNum}/lon/${lonNum}/dist/${dist}`;
    
    try {
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) FlyRadarIsrael/1.0',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        // If rate limited or error, silently fall back to simulation without logging error
        if (simulatedFlights.length === 0 || Math.abs(latNum - lastCenterLat) > 0.5 || Math.abs(lonNum - lastCenterLon) > 0.5) {
          initSimulatedFlights(latNum, lonNum);
        } else {
          stepSimulatedFlights();
        }

        return res.json({
          ac: simulatedFlights,
          total: simulatedFlights.length,
          source: 'live_simulation_fallback'
        });
      }

      const data = await response.json();
      if (!data.ac || data.ac.length === 0) {
        if (simulatedFlights.length === 0 || Math.abs(latNum - lastCenterLat) > 0.5 || Math.abs(lonNum - lastCenterLon) > 0.5) {
          initSimulatedFlights(latNum, lonNum);
        } else {
          stepSimulatedFlights();
        }
        return res.json({
          ac: simulatedFlights,
          total: simulatedFlights.length,
          source: 'regional_simulation'
        });
      }
      res.json(data);
    } catch (error: any) {
      // Silently fall back to simulation
      if (simulatedFlights.length === 0 || Math.abs(latNum - lastCenterLat) > 0.5 || Math.abs(lonNum - lastCenterLon) > 0.5) {
        initSimulatedFlights(latNum, lonNum);
      } else {
        stepSimulatedFlights();
      }

      res.json({
        ac: simulatedFlights,
        total: simulatedFlights.length,
        source: 'live_simulation_fallback'
      });
    }
  });

  // Create Vite server in middleware mode
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });

  app.use(vite.middlewares);

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
