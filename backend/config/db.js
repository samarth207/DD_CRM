const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Use test database if NODE_ENV is set to 'test', otherwise use main database
    const dbUri = process.env.NODE_ENV === 'test' 
      ? process.env.MONGODB_TEST_URI 
      : process.env.MONGODB_URI;
    
    await mongoose.connect(dbUri);
    console.log(`MongoDB connected successfully to ${process.env.NODE_ENV === 'test' ? 'TEST' : 'PRODUCTION'} database`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
