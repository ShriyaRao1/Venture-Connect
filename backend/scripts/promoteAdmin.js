const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function promoteToAdmin() {
  await mongoose.connect(process.env.MONGO_URI);
  const result = await mongoose.connection.db.collection('users').updateOne(
    { email: 'admin@vc.com' },
    { $set: { role: 'admin' } }
  );
  console.log('Updated:', result.modifiedCount, 'user(s) promoted to admin');
  await mongoose.disconnect();
}

promoteToAdmin().catch(console.error);
