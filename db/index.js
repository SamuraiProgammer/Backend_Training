// config/db.js  (or db.js in your db folder)

const mongoose = require('mongoose');
const colors = require('colors'); // Optional: for nice console logs

/**
 * Connect to MongoDB Database
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // These options are no longer needed in newer Mongoose versions (>6),
      // but keeping them for compatibility and clarity
      //useNewUrlParser: true,
      //useUnifiedTopology: true,
    });

    console.log(
      colors.cyan.bold(
        `✅ MongoDB Connected: ${conn.connection.host}`
      )
    );

    // Handle connection events
    mongoose.connection.on('connected', () => {
      console.log(colors.green('MongoDB connection established successfully'));
    });

    mongoose.connection.on('error', (err) => {
      console.error(colors.red(`MongoDB connection error: ${err.message}`));
    });

    mongoose.connection.on('disconnected', () => {
      console.warn(colors.yellow('MongoDB connection disconnected'));
    });

  } catch (error) {
    console.error(colors.red.bold(`❌ MongoDB Connection Failed: ${error.message}`));
    // Exit process with failure
    process.exit(1);
  }
};

// Graceful shutdown
const closeDB = async () => {
  try {
    await mongoose.connection.close();
    console.log(colors.yellow('MongoDB connection closed gracefully'));
  } catch (err) {
    console.error(colors.red('Error closing MongoDB connection:', err));
  }
};

module.exports = { connectDB, closeDB };