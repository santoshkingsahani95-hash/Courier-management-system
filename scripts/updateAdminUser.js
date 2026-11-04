const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const uri = process.env.MONGODB_URI || 'mongodb+srv://shresthafinance2082_db_user:HpcXiC6urhzsOAvL@cluster0.yaap9pm.mongodb.net/courier_system?retryWrites=true&w=majority';

async function updateAdmin() {
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  const db = mongoose.connection.db;
  const usersCol = db.collection('users');

  const hash = bcrypt.hashSync('Santosh@143', 10);

  const res = await usersCol.updateOne(
    { _id: 'u-001' },
    {
      $set: {
        email: 'santoshkingsahani95@gmail.com',
        name: 'Santosh Mukhiya',
        passwordHash: hash,
        role: 'admin',
        status: 'active',
        updatedAt: new Date().toISOString()
      }
    },
    { upsert: true }
  );
  console.log('Admin user update in Atlas:', res.acknowledged ? 'SUCCESS' : 'FAILED');

  const users = await usersCol.find({}).toArray();
  console.log('Users in database:', users.map(u => ({ id: u._id, email: u.email, role: u.role })));

  await mongoose.disconnect();
}

updateAdmin().catch(err => {
  console.error('Error updating admin:', err);
  process.exit(1);
});
