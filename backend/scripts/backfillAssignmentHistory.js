require('dotenv').config();
const mongoose = require('mongoose');
const Lead = require('../models/Lead');

async function run() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/telecrm';
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');

  const leads = await Lead.find({ $or: [{ assignmentHistory: { $exists: false } }, { assignmentHistory: { $size: 0 } }] });
  if (!leads.length) {
    console.log('No leads require backfill. Done.');
    await mongoose.disconnect();
    return;
  }

  const ops = leads.map(l => ({
    updateOne: {
      filter: { _id: l._id },
      update: {
        $set: { assignmentHistory: [{
          action: 'assigned',
          fromUser: null,
          toUser: l.assignedTo,
          changedBy: null,
          changedAt: l.createdAt || new Date()
        }] }
      }
    }
  }));

  const res = await Lead.bulkWrite(ops);
  console.log(`Backfilled assignmentHistory for ${res.modifiedCount || leads.length} leads.`);
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Backfill error:', err);
  mongoose.disconnect();
  process.exit(1);
});
