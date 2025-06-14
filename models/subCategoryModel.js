const mongoose = require("mongoose");

const SubCategorySchema = new mongoose.Schema({
  name: String,
  description: String,
  image: String, 
});

module.exports = SubCategorySchema;
