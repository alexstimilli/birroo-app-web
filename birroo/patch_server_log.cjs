const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldCode = `      if (route && Array.isArray(route) && route.length > 0) {`;
const newCode = `      console.log("Route received:", route ? route.length : 0);
      if (route && Array.isArray(route) && route.length > 0) {`;

code = code.replace(oldCode, newCode);
fs.writeFileSync('server.ts', code);
