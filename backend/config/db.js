const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Use test database if NODE_ENV is set to 'test', otherwise use main database
    const dbUri = process.env.NODE_ENV === 'test' 
      ? process.env.MONGODB_TEST_URI 
      : process.env.MONGODB_URI;
    
    await mongoose.connect(dbUri, {
      // Performance optimizations
      maxPoolSize: 50, // Increase connection pool size
      minPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4, // Use IPv4, skip trying IPv6
      // Connection optimization
      compressors: ['zlib'],
      zlibCompressionLevel: 6
    });
    
    console.log(`MongoDB connected successfully to ${process.env.NODE_ENV === 'test' ? 'TEST' : 'PRODUCTION'} database`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
