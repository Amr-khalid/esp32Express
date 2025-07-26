const { Schema, model } = require("mongoose");

const UserSchema = new Schema({
  username: String,
  password: String,
  email: String,
  address: String,
  phone: String,
  temp: String,
});

module.exports = model("User", UserSchema);
