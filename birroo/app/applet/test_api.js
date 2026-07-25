const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/stations',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Status:', res.statusCode, 'Body:', data.substring(0, 200)));
});

req.write(JSON.stringify({
  lat: 41.9028,
  lng: 12.4964,
  radiusMeters: 5000,
  fuelType: 'Benzina'
}));
req.end();
