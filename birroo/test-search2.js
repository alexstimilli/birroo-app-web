const COMMON_VEHICLES_DB = [
  { keywords: ["a3 d", "a3 diesel", "a3 tdi"], vehicleName: "Audi A3 Sportback 30 TDI", tankCapacity: 50, consumptionPer100Km: 4.4, fuelType: "Gasolio" },
  { keywords: ["a3 1.9 tdi", "a3 8l", "a3 8p", "a3 vecchia"], vehicleName: "Audi A3 1.9 TDI", tankCapacity: 55, consumptionPer100Km: 4.5, fuelType: "Gasolio" },
];
const query = "Audi A3 1600 TDI 2013";
const q = query.toLowerCase();
const qTokens = q.split(/\s+/);
const match = COMMON_VEHICLES_DB.find((v) =>
  v.keywords.some((k) => {
    const kTokens = k.toLowerCase().split(/\s+/);
    return kTokens.every((kt) => qTokens.some((qt) => qt === kt || (kt.length > 2 && qt.includes(kt)) || (qt.length > 2 && kt.includes(qt))));
  })
);
console.log(match);
