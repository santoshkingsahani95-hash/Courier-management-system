const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const uri = process.env.MONGODB_URI || 'mongodb+srv://shresthafinance2082_db_user:HpcXiC6urhzsOAvL@cluster0.yaap9pm.mongodb.net/courier_system?retryWrites=true&w=majority';
const DATA_DIR = path.join(__dirname, '..', 'data');

async function clearRecords() {
  let mongoSuccess = false;
  console.log('Connecting to MongoDB Atlas...');
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    const db = mongoose.connection.db;

    console.log('Clearing default entries and records from MongoDB Atlas:');

    const delBatches = await db.collection('batches').deleteMany({});
    console.log(`- Deleted ${delBatches.deletedCount} batches from MongoDB`);

    const delParcels = await db.collection('parcels').deleteMany({});
    console.log(`- Deleted ${delParcels.deletedCount} parcels from MongoDB`);

    const delSettlements = await db.collection('settlements').deleteMany({});
    console.log(`- Deleted ${delSettlements.deletedCount} settlements from MongoDB`);

    const delPayments = await db.collection('payments').deleteMany({});
    console.log(`- Deleted ${delPayments.deletedCount} payments from MongoDB`);

    const delLedger = await db.collection('ledgerentries').deleteMany({});
    console.log(`- Deleted ${delLedger.deletedCount} ledger entries from MongoDB`);

    const delAudit = await db.collection('auditlogs').deleteMany({});
    console.log(`- Deleted ${delAudit.deletedCount} audit logs from MongoDB`);

    // Reset courier counters & balances in Atlas
    const couriersCol = db.collection('couriers');
    const couriersUpdate = await couriersCol.updateMany(
      {},
      {
        $set: {
          currentDue: 0,
          totalParcels: 0,
          deliveredCount: 0,
          returnedCount: 0,
          pendingCount: 0,
          totalCOD: 0,
          updatedAt: new Date().toISOString()
        }
      }
    );
    console.log(`- Reset financial counters on ${couriersUpdate.modifiedCount} courier services in MongoDB`);

    // Verify users and company settings
    const userCount = await db.collection('users').countDocuments();
    console.log(`- Active system users preserved in MongoDB: ${userCount}`);

    const settingsDoc = await db.collection('companysettings').findOne({ _id: 'company_settings' });
    console.log(`- Company Settings preserved in MongoDB: ${settingsDoc ? settingsDoc.companyName : 'None'}`);

    await mongoose.disconnect();
    mongoSuccess = true;
    console.log('✓ MongoDB Atlas records successfully cleared.');
  } catch (err) {
    console.warn('Notice: Could not connect to MongoDB Atlas cluster directly (IP whitelist or network timeout):', err.message);
    console.log('Ensure IP 202.51.69.4 or 0.0.0.0/0 is added in MongoDB Atlas Network Access.');
  }

  // Now clear local JSON files
  console.log('\nResetting local JSON data store...');
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  fs.writeFileSync(path.join(DATA_DIR, 'batches.json'), '[]\n', 'utf8');
  fs.writeFileSync(path.join(DATA_DIR, 'parcels.json'), '[]\n', 'utf8');
  fs.writeFileSync(path.join(DATA_DIR, 'settlements.json'), '[]\n', 'utf8');
  fs.writeFileSync(path.join(DATA_DIR, 'payments.json'), '[]\n', 'utf8');
  fs.writeFileSync(path.join(DATA_DIR, 'ledger.json'), '[]\n', 'utf8');
  fs.writeFileSync(path.join(DATA_DIR, 'audit_logs.json'), '[]\n', 'utf8');
  console.log('✓ Cleaned batches, parcels, settlements, payments, ledger, and audit logs to [].');

  // Reset couriers.json counters
  const couriersFile = path.join(DATA_DIR, 'couriers.json');
  if (fs.existsSync(couriersFile)) {
    try {
      const couriers = JSON.parse(fs.readFileSync(couriersFile, 'utf8'));
      const resetCouriers = couriers.map(c => ({
        ...c,
        currentDue: 0,
        totalParcels: 0,
        deliveredCount: 0,
        returnedCount: 0,
        pendingCount: 0,
        totalCOD: 0,
        updatedAt: new Date().toISOString()
      }));
      fs.writeFileSync(couriersFile, JSON.stringify(resetCouriers, null, 2) + '\n', 'utf8');
      console.log(`✓ Reset financial counters to 0 for ${resetCouriers.length} couriers in data/couriers.json`);
    } catch (e) {
      console.error('Error updating couriers.json:', e);
    }
  }

  console.log('\nAll default entries and records successfully cleared!');
  console.log('System is clean and ready for fresh entries.');
}

clearRecords().catch(err => {
  console.error('Error clearing records:', err);
  process.exit(1);
});
