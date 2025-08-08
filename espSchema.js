const { Schema, model } = require("mongoose");

const EspScema = new Schema({
name:String
});

module.exports = model("Esp", EspScema);
