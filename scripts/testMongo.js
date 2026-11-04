const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
const https = require('https');

const uri = process.env.MONGODB_URI || 'mongodb+srv://shresthafinance2082_db_user:HpcXiC6urhzsOAvL@cluster0.yaap9pm.mongodb.net/courier_system?retryWrites=true&w=majority';

function getPublicIp() {
  return new Promise((resolve) => {
    https.get('https://api.ipify.org', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data.trim()));
    }).on('error', () => resolve('Unknown'));
  });
}

async function testConnection() {
  const ip = await getPublicIp();
  console.log('====================================================');
  console.log('  MongoDB Atlas Connection Diagnostic Tool');
  console.log('====================================================');
  console.log(`Your Current Public IP: ${ip}`);
  console.log(`Connecting to: cluster0.yaap9pm.mongodb.net ...\n`);

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('🎉 SUCCESS! Connected to MongoDB Atlas cluster!');
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log(`✓ Active collections in courier_system:`, collections.map(c => c.name).join(', ') || 'None');
    await mongoose.disconnect();
    console.log('\nAtlas database is fully online and ready.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Connection Failed with error:');
    console.error(err.message);
    console.log('\n----------------------------------------------------');
    console.log('HOW TO FIX IN 30 SECONDS:');
    console.log('1. Go to: https://cloud.mongodb.com');
    console.log('2. Click "Network Access" in the left menu (under Security).');
    console.log('3. Click "+ ADD IP ADDRESS".');
    console.log('4. Choose "ALLOW ACCESS FROM ANYWHERE" (0.0.0.0/0).');
    console.log('5. Click "Confirm".');
    console.log('----------------------------------------------------');
    process.exit(1);
  }
}

testConnection();

