export function decodePolyline6(str) {
  let index = 0, lat = 0, lng = 0, coordinates = [];
  const factor = 1e6;
  while (index < str.length) {
    let b, shift = 0, result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;
    
    shift = 0;
    result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;
    
    coordinates.push([lat / factor, lng / factor]);
  }
  return coordinates;
}

import https from 'https';
https.get('https://valhalla1.openstreetmap.de/route?json={"locations":[{"lat":41.9028,"lon":12.4964},{"lat":40.8518,"lon":14.2681}],"costing":"auto","costing_options":{"auto":{"use_tolls":1}}}', (res) => { let data = ''; res.on('data', chunk => data += chunk); res.on('end', () => console.log(decodePolyline6(JSON.parse(data).trip.legs[0].shape).slice(0, 2))); });
