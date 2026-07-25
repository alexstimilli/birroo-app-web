const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldDeps = `    center,
    radarRadius,
    locationReady,
    profile?.preferredFuelType,
    profile?.highwayMode,
    searchMode,
    travelRoute,`;

const newDeps = `    center,
    radarRadius,
    locationReady,
    profile?.preferredFuelType,
    profile?.highwayMode,
    searchMode,
    travelRoute,
    travelDeviation,`;

code = code.replace(oldDeps, newDeps);
fs.writeFileSync('src/App.tsx', code);
