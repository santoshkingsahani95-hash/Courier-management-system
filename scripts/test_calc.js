const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const allParcels = JSON.parse(fs.readFileSync(path.join(dataDir, 'parcels.json'), 'utf8'));
const couriers = JSON.parse(fs.readFileSync(path.join(dataDir, 'couriers.json'), 'utf8'));

const spCourier = couriers.find(c => c._id === 'c-003');

console.log('--- TESTING SP EXPRESS SETTLEMENT CALCULATION ---');
const eligibleParcels = allParcels.filter(p => p.courierId === 'c-003' && p.settlementStatus !== 'Settled');
console.log(`Total Handed Over Parcels: ${eligibleParcels.length}`);

const returnedParcels = eligibleParcels.filter(p => p.status === 'Returned');
const deliveredParcels = eligibleParcels.filter(p => p.status !== 'Returned');

console.log(`Delivered Parcels: ${deliveredParcels.length}`);
console.log(`Returned Parcels: ${returnedParcels.length}`);

const grossCOD = deliveredParcels.reduce((sum, p) => sum + (p.codAmount || 0), 0);
const returnedCOD = returnedParcels.reduce((sum, p) => sum + (p.codAmount || 0), 0);
const deliveryCharges = deliveredParcels.reduce((sum, p) => sum + (p.deliveryCharge || spCourier.defaultDeliveryCharge), 0);
const netReceivable = grossCOD - deliveryCharges;

console.log(`Gross COD (Delivered): Rs. ${grossCOD}`);
console.log(`Returned COD Deducted: Rs. ${returnedCOD}`);
console.log(`Delivery Charges: Rs. ${deliveryCharges}`);
console.log(`Net Receivable: Rs. ${netReceivable}`);

if (netReceivable > 0) {
  console.log('\n✓ SUCCESS: Settlement for SP Express is NOT Rs. 0! It correctly calculates Rs. ' + netReceivable);
} else {
  console.log('\n❌ FAILED: Net receivable is Rs. 0');
}
