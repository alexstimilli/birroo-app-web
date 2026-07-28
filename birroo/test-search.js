const COMMON_VEHICLES_DB = [
  { keywords: ["a3 d", "a3 diesel", "a3 tdi"], vehicleName: "Audi A3 Sportback 30 TDI", tankCapacity: 50, consumptionPer100Km: 4.4, fuelType: "Gasolio" },
];

const query = "Audi A3 1600 TDI 2013";
const q = query.toLowerCase();
let match = COMMON_VEHICLES_DB.find((v) =>
  v.keywords.some((k) => q.includes(k)),
);
console.log("direct match:", match);

const qTokens = q.split(/\s+/);
match = COMMON_VEHICLES_DB.find((v) =>
  v.keywords.some((k) => {
    const kTokens = k.toLowerCase().split(/\s+/);
    return kTokens.every((kt) => qTokens.some((qt) => qt.includes(kt) || kt.includes(qt)));
  })
);
console.log("token match:", match);
