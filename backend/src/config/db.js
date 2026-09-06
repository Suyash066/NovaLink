const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGO_URL;
  if (!uri) {
    throw new Error("MONGO_URL is not set in the environment");
  }

  mongoose.connection.on("connected", () => {
    console.log("[db] connected to MongoDB");
  });
  mongoose.connection.on("error", (err) => {
    console.error("[db] connection error:", err.message);
  });

  await mongoose.connect(uri);
}

module.exports = connectDB;
