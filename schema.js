const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: String,
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  address: String,
  phone: String,
  temp: String,
  resetCode: Number,
  resetCodeExpires: Date,
})
module.exports = mongoose.model("user", userSchema);
