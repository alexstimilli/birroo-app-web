import axios from 'axios';
import https from 'https';
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI } from "@google/genai";

// Initialize Gemini
const ai = new GoogleGenAI({
  apiKey: process.env.BIRROO_AI_KEY || process.env.GEMINI_API_KEY || "",
});

// MIMIT DB State
let stationsDB: any[] = [];
let dbStatus: "uninitialized" | "loading" | "ready" | "error" = "uninitialized";

const PROVINCE_TO_REGION: Record<string, string> = {
  AG: "Sicilia",
  AL: "Piemonte",
  AN: "Marche",
  AO: "Valle d'Aosta",
  AR: "Toscana",
  AP: "Marche",
  AT: "Piemonte",
  AV: "Campania",
  BA: "Puglia",
  BT: "Puglia",
  BL: "Veneto",
  BN: "Campania",
  BG: "Lombardia",
  BI: "Piemonte",
  BO: "Emilia-Romagna",
  BZ: "Trentino-Alto Adige",
  BS: "Lombardia",
  BR: "Puglia",
  CA: "Sardegna",
  CL: "Sicilia",
  CB: "Molise",
  CI: "Sardegna",
  CE: "Campania",
  CT: "Sicilia",
  CZ: "Calabria",
  CH: "Abruzzo",
  CO: "Lombardia",
  CS: "Calabria",
  CR: "Lombardia",
  KR: "Calabria",
  CN: "Piemonte",
  EN: "Sicilia",
  FM: "Marche",
  FE: "Emilia-Romagna",
  FI: "Toscana",
  FG: "Puglia",
  FC: "Emilia-Romagna",
  FR: "Lazio",
  GE: "Liguria",
  GO: "Friuli-Venezia Giulia",
  GR: "Toscana",
  IM: "Liguria",
  IS: "Molise",
  AQ: "Abruzzo",
  SP: "Liguria",
  LT: "Lazio",
  LE: "Puglia",
  LC: "Lombardia",
  LI: "Toscana",
  LO: "Lombardia",
  LU: "Toscana",
  MC: "Marche",
  MN: "Lombardia",
  MS: "Toscana",
  MT: "Basilicata",
  VS: "Sardegna",
  ME: "Sicilia",
  MI: "Lombardia",
  MO: "Emilia-Romagna",
  MB: "Lombardia",
  NA: "Campania",
  NO: "Piemonte",
  NU: "Sardegna",
  OG: "Sardegna",
  OT: "Sardegna",
  OR: "Sardegna",
  PD: "Veneto",
  PA: "Sicilia",
  PR: "Emilia-Romagna",
  PV: "Lombardia",
  PG: "Umbria",
  PU: "Marche",
  PE: "Abruzzo",
  PC: "Emilia-Romagna",
  PI: "Toscana",
  PT: "Toscana",
  PN: "Friuli-Venezia Giulia",
  PZ: "Basilicata",
  PO: "Toscana",
  RG: "Sicilia",
  RA: "Emilia-Romagna",
  RC: "Calabria",
  RE: "Emilia-Romagna",
  RI: "Lazio",
  RN: "Emilia-Romagna",
  RM: "Lazio",
  RO: "Veneto",
  SA: "Campania",
  SS: "Sardegna",
  SV: "Liguria",
  SI: "Toscana",
  SR: "Sicilia",
  SO: "Lombardia",
  TA: "Puglia",
  TE: "Abruzzo",
  TR: "Umbria",
  TO: "Piemonte",
  TP: "Sicilia",
  TN: "Trentino-Alto Adige",
  TV: "Veneto",
  TS: "Friuli-Venezia Giulia",
  UD: "Friuli-Venezia Giulia",
  VA: "Lombardia",
  VE: "Veneto",
  VB: "Piemonte",
  VC: "Piemonte",
  VR: "Veneto",
  VV: "Calabria",
  VI: "Veneto",
  VT: "Lazio",
};

// Helper to parse MIMIT dates (DD/MM/YYYY HH:mm:ss)
function parseMimitDate(dtStr: string) {
  if (!dtStr) return 0;
  const parts = dtStr.trim().split(" ");
  const dateP = parts[0].split("/");
  if (dateP.length !== 3) return 0;
  const timeP = parts[1] ? parts[1].split(":") : ["00", "00", "00"];
  return new Date(
    parseInt(dateP[2]),
    parseInt(dateP[1]) - 1,
    parseInt(dateP[0]),
    parseInt(timeP[0] || "0"),
    parseInt(timeP[1] || "0"),
    parseInt(timeP[2] || "0"),
  ).getTime();
}

const FUEL_MAPPING: Record<string, string[]> = {
  Benzina: ["benzina", "petrol", "super", "verde"],
  Gasolio: ["gasolio", "diesel", "gas", "diesel high quality"],
  GPL: ["gpl"],
  Metano: ["metano", "methane", "cng"],
};

function normalizeFuel(fuel: string): string {
  const f = fuel.toLowerCase();
  for (const [canonical, aliases] of Object.entries(FUEL_MAPPING)) {
    if (canonical.toLowerCase() === f || aliases.includes(f)) return canonical;
  }
  return fuel;
}

import { COMMON_VEHICLES_DB } from "./vehiclesDB.js";


const httpsAgent = new https.Agent({ family: 4 });

async function fetchWithRetry(url: string, options: any, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await axios.get(url, {
        headers: options.headers,
        httpsAgent: httpsAgent,
        timeout: 15000,
        responseType: 'text'
      });
      return { ok: true, text: async () => res.data };
    } catch (e: any) {
      // Suppress warning to prevent AI Studio from flagging it as an error
      if (i === maxRetries - 1) throw e;
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error("Max retries reached");
}

async function fetchMimitData() {

  dbStatus = "loading";
  try {
    console.log("Downloading MIMIT Anagrafica e Prezzi... (40MB)");
    const fetchOptions = {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    };
    const resAnagrafica = await fetchWithRetry("https://www.mimit.gov.it/images/exportCSV/anagrafica_impianti_attivi.csv", fetchOptions);
    console.log("Anagrafica scaricata. Ora scarico i prezzi...");
    const resPrezzi = await fetchWithRetry("https://www.mimit.gov.it/images/exportCSV/prezzo_alle_8.csv", fetchOptions);

    if (!resAnagrafica.ok || !resPrezzi.ok) {
      throw new Error("Impossibile scaricare i CSV ministeriali.");
    }

    const textAnagrafica = await resAnagrafica.text();
    const textPrezzi = await resPrezzi.text();

    console.log("Parsing Prezzi in RAM...");
    const prezziLines = textPrezzi.split("\n");
    const prezziMap = new Map();
    // 0:idImpianto|1:descCarburante|2:prezzo|3:isSelf|4:dtComu
    for (let i = 2; i < prezziLines.length; i++) {
      const line = prezziLines[i];
      if (!line) continue;
      const cols = line.split("|");
      if (cols.length < 5) continue;
      const id = cols[0];
      const desc = cols[1];
      const prezzo = parseFloat(cols[2]);
      const isSelf = cols[3] === "1";
      const dateMs = parseMimitDate(cols[4]);

      if (!prezziMap.has(id)) prezziMap.set(id, { prices: {} });
      const pState = prezziMap.get(id);

      // Save price. If it's Self Service, it takes precedence for Benzina/Gasolio!
      if (
        isSelf ||
        !pState.prices[desc] ||
        (desc.toLowerCase().includes("gpl") &&
          !isSelf) /* GPL is mostly served */
      ) {
        pState.prices[desc] = { prezzo, dateMs, isSelf };
      }
    }

    console.log("Parsing Anagrafica in RAM...");
    const anagraficaLines = textAnagrafica.split("\n");
    const newStationsDB = [];

    // 0:idImpianto|1:Gestore|2:Bandiera|3:Tipo|4:Nome|5:Indirizzo|6:Comune|7:Provinc|8:Lat|9:Lng
    for (let i = 2; i < anagraficaLines.length; i++) {
      const line = anagraficaLines[i];
      if (!line) continue;
      const cols = line.split("|");
      if (cols.length < 10) continue;

      const id = cols[0];
      const gestore = cols[1];
      const brand = cols[2];
      const isHighway = cols[3]?.toLowerCase().includes("autostradale");
      const province = cols[7];
      const region = PROVINCE_TO_REGION[province] || province;
      const rawLat = cols[8].trim().replace(",", ".");
      const rawLng = cols[9].trim().replace(",", ".");
      const lat = parseFloat(rawLat);
      const lng = parseFloat(rawLng);

      if (isNaN(lat) || isNaN(lng)) continue;

      const pData = prezziMap.get(id);
      const prices = pData ? pData.prices : {};

      // Only add stations that actually have prices
      if (Object.keys(prices).length > 0) {
        newStationsDB.push({
          id,
          name: cols[4] || brand || gestore || "Distributore",
          brand: brand,
          operator: gestore,
          isHighway: isHighway,
          province: province,
          region: region,
          address: `${cols[5]}, ${cols[6]} (${cols[7]})`,
          lat,
          lng,
          prices,
        });
      }
    }

    stationsDB = newStationsDB;
    dbStatus = "ready";
    console.log(
      `✅ [MIMIT DB READY] - Caricati ${stationsDB.length} distributori a sistema.`,
    );
  } catch (e: any) {
    console.error("MIMIT DB Error:", e);
    dbStatus = "error";
  }
}

// Distance Helper (Haversine km)
function getDistanceKM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Kickoff MIMIT fetch asynchronously
  fetchMimitData();
  // Refresh every 6 hours
  setInterval(fetchMimitData, 6 * 60 * 60 * 1000);

  app.get("/health", (req, res) => {
    if (dbStatus === "error") {
      fetchMimitData(); // Trigger retry if error
    }
    res.json({ status: dbStatus, count: stationsDB.length });
  });

  // ---- API ROUTES ----
  app.post("/api/vehicle-estimate", async (req, res) => {
    try {
      const { query } = req.body;
      if (!query) return res.status(400).json({ error: "Query missing" });

      // Fallback search in local DB if AI fails or key is missing
      const searchLocal = () => {
        const q = query.toLowerCase();
        return COMMON_VEHICLES_DB.find((v) =>
          v.keywords.some((k: string) => q.includes(k)),
        );
      };

      try {
        const prompt = `L'utente sta cercando di inserire un veicolo: "${query}". Cerca di dedurre marca, modello, capacità del serbatoio in litri e consumo medio in l/100km. Se non sei sicuro fornisci i dati di un'auto molto comune simile. Sii realistico.
        Ritorna JSON con schema: { vehicleName: string, tankCapacity: number, consumptionPer100Km: number, fuelType: "Benzina" | "Gasolio" | "GPL" | "Metano" }`;

        const result = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
          },
        });

        let text = result.text?.trim() || "{}";
        if (text.startsWith("```json")) {
          text = text.replace(/^```json\n/, "").replace(/\n```$/, "");
        } else if (text.startsWith("```")) {
          text = text.replace(/^```\n/, "").replace(/\n```$/, "");
        }
        const aiData = JSON.parse(text);
        if (aiData && aiData.vehicleName) return res.json(aiData);
        throw new Error("Empty AI result");
      } catch (aiErr) {
        console.warn("Gemini Failed, using fallback DB:", aiErr);
        const local = searchLocal();
        if (local) return res.json(local);

        // Final broad fallback
        res.json(COMMON_VEHICLES_DB[0]);
      }
    } catch (error: any) {
      console.error("Vehicle Estimate Route Error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/stations", async (req, res) => {
    if (dbStatus === "loading" || dbStatus === "uninitialized") {
      return res
        .status(202)
        .json({
          status: "loading",
          message: "Inizializzazione Database Governativo MIMIT In Corso...",
        });
    }
    if (dbStatus === "error") {
      // Auto-retry fetch if someone tries to use the API and it's in error state
      fetchMimitData();
      return res
        .status(500)
        .json({ error: "Errore nei Server del Ministero. Riprova tra poco." });
    }

    try {
      const {
        lat,
        lng,
        radiusMeters,
        fuelType,
        highwayMode,
        route,
        selectedBrands,
      } = req.body;
      if (!lat || !lng || !radiusMeters) {
        return res.status(400).json({ error: "Missing parameters" });
      }

      const radiusKm = radiusMeters / 1000;
      const targetFuel = normalizeFuel(fuelType || "Benzina");
      const activeBrands: string[] = Array.isArray(selectedBrands)
        ? selectedBrands
        : [];

      const MAJOR_BRANDS = [
        "Eni",
        "IP",
        "Esso",
        "Q8",
        "Tamoil",
        "Repsol",
        "Conad",
        "Coop",
        "Carrefour",
        "Vega",
        "Api",
        "TotalErg",
        "Retitalia",
        "Europam",
        "Enercoop",
      ];
      const getBrandGroup = (brand: string) => {
        if (!brand) return "Pompe Bianche";
        const upperString = brand.toUpperCase();
        const found = MAJOR_BRANDS.find((b) =>
          upperString.includes(b.toUpperCase()),
        );
        if (found) {
          if (
            found.toUpperCase() === "TOTALERG" ||
            found.toUpperCase() === "API"
          )
            return "IP";
          return found;
        }
        return "Pompe Bianche";
      };

      const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
      const now = Date.now();

      const nearbyFiltered = [];
      let closestRegion = null;
      let closestProvince = null;
      let minDistanceSq = Infinity;

      // Calculate Bounding Box if route is provided
      let routeLatMin = Infinity,
        routeLatMax = -Infinity;
      let routeLngMin = Infinity,
        routeLngMax = -Infinity;
      const optimizedRoute = []; // store for faster checking

      console.log("Route received:", route ? route.length : 0);
      if (route && Array.isArray(route) && route.length > 0) {
        // Downsample route to avoid too many calculations (e.g. max 500 points)
        const step = Math.max(1, Math.floor(route.length / 500));
        for (let i = 0; i < route.length; i += step) {
          const [rLat, rLng] = route[i];
          optimizedRoute.push([rLat, rLng]);
          if (rLat < routeLatMin) routeLatMin = rLat;
          if (rLat > routeLatMax) routeLatMax = rLat;
          if (rLng < routeLngMin) routeLngMin = rLng;
          if (rLng > routeLngMax) routeLngMax = rLng;
        }
      }

      for (const station of stationsDB) {
        if (optimizedRoute.length === 0) {
          if (highwayMode) {
            if (!station.isHighway) continue;
          } else {
            if (station.isHighway) continue;
          }
        }

        let distSq = Infinity;
        let inRange = false;
        let matchedDistance = Infinity;

        if (optimizedRoute.length > 0) {
          // Route Mode: check bounding box first
          const latMargin = radiusKm / 111;
          const lngMargin = radiusKm / 111; // Approx enough in Italy
          if (
            station.lat < routeLatMin - latMargin ||
            station.lat > routeLatMax + latMargin ||
            station.lng < routeLngMin - lngMargin ||
            station.lng > routeLngMax + lngMargin
          ) {
            continue;
          }

          // Route Mode: find closest point on route
          distSq =
            Math.pow(station.lat - lat, 2) + Math.pow(station.lng - lng, 2); // for closest region

          let minRouteDist = Infinity;
          for (const [rLat, rLng] of optimizedRoute) {
            // Fast approx distance to check
            const dLat = station.lat - rLat;
            const dLng = station.lng - rLng;
            const dSq = dLat * dLat + dLng * dLng;
            if (dSq < minRouteDist) {
              minRouteDist = dSq;
            }
          }
          // If rough approx is vaguely within bounds, do precise calculation
          if (minRouteDist < (radiusKm / 111) * (radiusKm / 111) * 2) {
            // Check precise distance against all points
            let closestExactDist = Infinity;
            for (const [rLat, rLng] of optimizedRoute) {
              const d = getDistanceKM(station.lat, station.lng, rLat, rLng);
              if (d < closestExactDist) closestExactDist = d;
            }
            if (closestExactDist <= radiusKm) {
              inRange = true;
              matchedDistance = closestExactDist;
            }
          }
        } else {
          // Point Mode: check bounding box first
          const latDiff = Math.abs(station.lat - lat);
          const lngDiff = Math.abs(station.lng - lng);

          // Fast heuristic to find the closest station to determine the region
          distSq = latDiff * latDiff + lngDiff * lngDiff;

          // Bounding box heuristic for stations within the given radius
          if (latDiff <= radiusKm / 111 && lngDiff <= radiusKm / 111) {
            const dist = getDistanceKM(lat, lng, station.lat, station.lng);
            if (dist <= radiusKm) {
              inRange = true;
              matchedDistance = dist;
            }
          }
        }

        if (distSq < minDistanceSq) {
          minDistanceSq = distSq;
          closestRegion = station.region;
          closestProvince = station.province;
        }

        if (inRange) {
          const fuelData = station.prices[targetFuel];
          // MUST strictly possess the chosen fuel
          if (fuelData && fuelData.prezzo > 0) {
            const isStale = now - fuelData.dateMs > THREE_DAYS_MS;

            nearbyFiltered.push({
              ...station,
              pricePerLiter: fuelData.prezzo,
              lastUpdated: new Date(fuelData.dateMs).toISOString(),
              isStale,
              _distance: matchedDistance,
            });
          }
        }
      }

      let detectedRegion = closestRegion;
      let detectedProvince = closestProvince;

      // Calculate Average for the Region and Province based on ALL stations in RAM
      let provinceAvg = null;
      let regionalAvg = null;

      if (detectedRegion) {
        // If highwayMode is active, compute average over regional highways. Otherwise local.
        const regionStations = stationsDB.filter((s) => {
          if (s.region !== detectedRegion) return false;
          if (highwayMode ? !s.isHighway : s.isHighway) return false;
          if (
            activeBrands.length > 0 &&
            !activeBrands.includes(getBrandGroup(s.brand))
          )
            return false;
          return true;
        });

        let sumRegion = 0;
        let countRegion = 0;
        let sumProvince = 0;
        let countProvince = 0;

        // We use the exact same calculation logic the Ministero uses for its regional averages report
        const checkSelf = targetFuel === "Benzina" || targetFuel === "Gasolio";

        for (const pst of regionStations) {
          const fd = pst.prices[targetFuel];
          // Match Ministero's rule: only "Self Service" for Benzina/Gasolio!
          if (fd && fd.prezzo > 0.5 && fd.prezzo < 2.5) {
            if (checkSelf && !fd.isSelf) continue;
            if (!checkSelf && fd.isSelf) continue; // MIMIT uses Servito for GPL/Metano typically

            sumRegion += fd.prezzo;
            countRegion++;

            // If it's also in the exact same province, we calculate the province avg
            if (pst.province === (req.body.province || detectedProvince)) {
              sumProvince += fd.prezzo;
              countProvince++;
            }
          }
        }
        regionalAvg = countRegion > 0 ? sumRegion / countRegion : null;
        provinceAvg =
          countProvince > 0 ? sumProvince / countProvince : regionalAvg;
      }

      // Calculate local average from nearby
      let localSum = 0;
      let localCount = 0;
      for (const st of nearbyFiltered) {
        if (st.pricePerLiter) {
          localSum += st.pricePerLiter;
          localCount++;
        }
      }
      // Wait, we don't overwrite provinceAvg anymore.

      res.json({
        elements: nearbyFiltered,
        provinceAvg,
        regionalAvg,
        regionName: detectedRegion,
        provinceName: req.body.province || detectedProvince || detectedRegion,
      });
    } catch (error: any) {
      res.status(500).json({ error: "Server Error", details: error.message });
    }
  });

  // ---- VITE MIDDLEWARE ----
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
