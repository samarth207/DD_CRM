const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const seedUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing users
    await User.deleteMany({});
    console.log('Cleared existing users');

    // Hash passwords
    const adminPassword = await bcrypt.hash('admin123', 10);
    const userPassword = await bcrypt.hash('user123', 10);

    // Create admin user
    const admin = new User({
      name: 'Admin',
      email: 'admin@telecrm.com',
      password: adminPassword,
      role: 'admin'
    });

    // Create regular user
    const user = new User({
      name: 'John Doe',
      email: 'user@telecrm.com',
      password: userPassword,
      role: 'user'
    });

    await admin.save();
    await user.save();

    console.log('Admin created: admin@telecrm.com / admin123');
    console.log('User created: user@telecrm.com / user123');

    mongoose.connection.close();
  } catch (error) {
    console.error('Error seeding users:', error);
    process.exit(1);
  }
};

seedUsers();
