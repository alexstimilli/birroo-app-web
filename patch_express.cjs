const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace('app.use(express.json());', 'app.use(express.json({ limit: "50mb" }));');
code = code.replace('app.use(express.urlencoded({ extended: true }));', 'app.use(express.urlencoded({ extended: true, limit: "50mb" }));');
fs.writeFileSync('server.ts', code);
