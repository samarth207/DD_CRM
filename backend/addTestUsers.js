const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const addTestUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Hash passwords
    const password1 = await bcrypt.hash('user123', 10);
    const password2 = await bcrypt.hash('user123', 10);

    // Create additional test users
    const user1 = new User({
      name: 'Sarah Williams',
      email: 'sarah@telecrm.com',
      password: password1,
      role: 'user'
    });

    const user2 = new User({
      name: 'Michael Chen',
      email: 'michael@telecrm.com',
      password: password2,
      role: 'user'
    });

    // Check if users already exist
    const existingUser1 = await User.findOne({ email: 'sarah@telecrm.com' });
    const existingUser2 = await User.findOne({ email: 'michael@telecrm.com' });

    if (!existingUser1) {
      await user1.save();
      console.log('User created: sarah@telecrm.com / user123');
    } else {
      console.log('Sarah already exists');
    }

    if (!existingUser2) {
      await user2.save();
      console.log('User created: michael@telecrm.com / user123');
    } else {
      console.log('Michael already exists');
    }

    mongoose.connection.close();
  } catch (error) {
    console.error('Error adding test users:', error);
    process.exit(1);
  }
};

addTestUsers();
