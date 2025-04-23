const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  password: String,
  username: String
});
module.exports = mongoose.model('User', userSchema);
