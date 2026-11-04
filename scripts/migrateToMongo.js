const fs = require('fs');
const path = require('path');
const dns = require('dns');
const mongoose = require('mongoose');

// Configure Google & Cloudflare DNS for SRV resolution
dns.setServers(['8.8.8.8', '1.1.1.1']);

const MONGODB_URI = 'mongodb+srv://shresthafinance2082_db_user:HpcXiC6urhzsOAvL@cluster0.yaap9pm.mongodb.net/courier_system?retryWrites=true&w=majority';
const DATA_DIR = path.join(__dirname, '..', 'data');

function readJson(filename) {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.error(`Error reading ${filename}:`, e.message);
    return [];
  }
}

async function migrate() {
  console.log('Connecting to MongoDB Atlas at cluster0.yaap9pm.mongodb.net ...');
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  console.log('Successfully connected to MongoDB Atlas database: courier_system!\n');

  const db = mongoose.connection.db;

  // 1. Users Collection
  const users = readJson('users.json');
  console.log(`Migrating Users (${users.length} records)...`);
  const usersColl = db.collection('users');
  for (const u of users) {
    await usersColl.updateOne(
      { _id: u._id },
      { $set: u },
      { upsert: true }
    );
  }
  await usersColl.createIndex({ email: 1 }, { unique: true });
  console.log('✓ Users collection migrated.');

  // 2. Couriers Collection
  const couriers = readJson('couriers.json');
  console.log(`Migrating Couriers (${couriers.length} records)...`);
  const couriersColl = db.collection('couriers');
  for (const c of couriers) {
    await couriersColl.updateOne(
      { _id: c._id },
      { $set: c },
      { upsert: true }
    );
  }
  await couriersColl.createIndex({ name: 1 });
  await couriersColl.createIndex({ status: 1 });
  console.log('✓ Couriers collection migrated.');

  // 3. Batches Collection
  const batches = readJson('batches.json');
  console.log(`Migrating Batches (${batches.length} records)...`);
  const batchesColl = db.collection('batches');
  for (const b of batches) {
    await batchesColl.updateOne(
      { _id: b._id },
      { $set: b },
      { upsert: true }
    );
  }
  await batchesColl.createIndex({ batchNumber: 1 }, { unique: true });
  await batchesColl.createIndex({ courierId: 1 });
  await batchesColl.createIndex({ batchDate: -1 });
  console.log('✓ Batches collection migrated.');

  // 4. Parcels Collection
  const parcels = readJson('parcels.json');
  console.log(`Migrating Parcels (${parcels.length} records)...`);
  const parcelsColl = db.collection('parcels');
  for (const p of parcels) {
    await parcelsColl.updateOne(
      { _id: p._id },
      { $set: p },
      { upsert: true }
    );
  }
  await parcelsColl.createIndex({ mobile: 1 });
  await parcelsColl.createIndex({ trackingId: 1 });
  await parcelsColl.createIndex({ courierId: 1 });
  await parcelsColl.createIndex({ batchId: 1 });
  await parcelsColl.createIndex({ status: 1 });
  await parcelsColl.createIndex({ settlementStatus: 1 });
  await parcelsColl.createIndex({ createdAt: -1 });
  console.log('✓ Parcels collection migrated.');

  // 5. Settlements Collection
  const settlements = readJson('settlements.json');
  console.log(`Migrating Settlements (${settlements.length} records)...`);
  const settlementsColl = db.collection('settlements');
  for (const s of settlements) {
    await settlementsColl.updateOne(
      { _id: s._id },
      { $set: s },
      { upsert: true }
    );
  }
  await settlementsColl.createIndex({ settlementNumber: 1 }, { unique: true });
  await settlementsColl.createIndex({ courierId: 1 });
  await settlementsColl.createIndex({ paymentStatus: 1 });
  await settlementsColl.createIndex({ createdAt: -1 });
  console.log('✓ Settlements collection migrated.');

  // 6. Payments Collection
  const payments = readJson('payments.json');
  console.log(`Migrating Payments (${payments.length} records)...`);
  const paymentsColl = db.collection('payments');
  for (const pay of payments) {
    await paymentsColl.updateOne(
      { _id: pay._id },
      { $set: pay },
      { upsert: true }
    );
  }
  await paymentsColl.createIndex({ courierId: 1 });
  await paymentsColl.createIndex({ settlementId: 1 });
  await paymentsColl.createIndex({ paymentDate: -1 });
  console.log('✓ Payments collection migrated.');

  // 7. Ledger Entries Collection
  const ledger = readJson('ledger.json');
  console.log(`Migrating Ledger Entries (${ledger.length} records)...`);
  const ledgerColl = db.collection('ledgerentries');
  for (const l of ledger) {
    await ledgerColl.updateOne(
      { _id: l._id },
      { $set: l },
      { upsert: true }
    );
  }
  await ledgerColl.createIndex({ courierId: 1, transactionDate: 1 });
  await ledgerColl.createIndex({ createdAt: -1 });
  console.log('✓ Ledger Entries collection migrated.');

  // 8. Company Settings Collection
  const settings = readJson('settings.json');
  console.log('Migrating Company Settings...');
  const settingsColl = db.collection('companysettings');
  await settingsColl.updateOne(
    { _id: 'company_settings' },
    { $set: { _id: 'company_settings', ...settings } },
    { upsert: true }
  );
  console.log('✓ Company Settings collection migrated.');

  // 9. Audit Logs Collection
  const auditLogs = readJson('audit_logs.json');
  console.log(`Migrating Audit Logs (${auditLogs.length} records)...`);
  const auditColl = db.collection('auditlogs');
  for (const a of auditLogs) {
    await auditColl.updateOne(
      { _id: a._id },
      { $set: a },
      { upsert: true }
    );
  }
  await auditColl.createIndex({ timestamp: -1 });
  console.log('✓ Audit Logs collection migrated.');

  // Summary Verification
  console.log('\n================ DATA STORAGE VERIFICATION IN MONGO DB ================');
  const collections = await db.listCollections().toArray();
  for (const col of collections) {
    const count = await db.collection(col.name).countDocuments();
    console.log(`Collection (Table): "${col.name}" -> ${count} documents stored`);
  }
  console.log('========================================================================\n');

  console.log('All collections and data have been successfully migrated and stored in MongoDB Atlas!');
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
