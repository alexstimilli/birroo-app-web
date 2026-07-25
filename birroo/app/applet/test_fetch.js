fetch('http://localhost:3000/api/stations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ lat: 41.9028, lng: 12.4964, radiusMeters: 5000, fuelType: 'Benzina' })
})
.then(res => res.json())
.then(data => console.log('Elements count:', data.elements ? data.elements.length : data))
.catch(err => console.error(err));
