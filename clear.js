const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');
const Table = require('./models/Table');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  await User.deleteMany({});
  await Table.deleteMany({});
  console.log('✅ Cleared users and tables!');
  process.exit();
});
