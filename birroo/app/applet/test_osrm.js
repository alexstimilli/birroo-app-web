import https from 'https';
https.get('https://router.project-osrm.org/route/v1/driving/12.4964,41.9028;14.2681,40.8518?overview=full&exclude=motorway', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data));
});
