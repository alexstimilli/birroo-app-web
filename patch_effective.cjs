const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldCode = `        const effectiveRadius =
          searchMode === "travel" && radarRadius === 0
            ? 500
            : radarRadius * 1000;`;

const newCode = `        const effectiveRadius =
          searchMode === "travel"
            ? travelDeviation * 1000
            : radarRadius === 0 ? 500 : radarRadius * 1000;`;

code = code.replace(oldCode, newCode);
fs.writeFileSync('src/App.tsx', code);
