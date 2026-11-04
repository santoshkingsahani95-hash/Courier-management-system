const fs = require('fs');
const path = require('path');

const pPath = path.join(__dirname, '..', 'data', 'parcels.json');
const parcels = JSON.parse(fs.readFileSync(pPath, 'utf8'));
let count = 0;
parcels.forEach(p => {
  if (p.status === 'Pending') {
    p.status = 'Delivered';
    count++;
  }
});
fs.writeFileSync(pPath, JSON.stringify(parcels, null, 2), 'utf8');
console.log(`Updated ${count} pending parcels to Delivered in data/parcels.json`);

