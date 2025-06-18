const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  wallet: {
    type: String,
    required: true,
    unique: true,
  },
  xp: {
    type: Number,
    default: 0,
  },
  completedQuests: {
    type: [String],
    default: [],
  },
});

module.exports = mongoose.model("User", UserSchema);
