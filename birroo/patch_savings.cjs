const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldSavings = `    const grossSavings = litersNeeded * (localAvgPrice - station.pricePerLiter);`;
const newSavings = `    const referencePrice = (profile && profile.currentTankPrice > 0) ? profile.currentTankPrice : localAvgPrice;
    const grossSavings = litersNeeded * (referencePrice - station.pricePerLiter);`;

code = code.replace(oldSavings, newSavings);
fs.writeFileSync('src/App.tsx', code);
