// Migration script to rename followUpDateTime to nextCallDateTime
// Run this once to migrate existing data in the database

const mongoose = require('mongoose');
require('dotenv').config();

async function migrateFollowUpField() {
  try {
    // Connect to MongoDB
    const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dd_crm';
    await mongoose.connect(dbUri);
    console.log('Connected to MongoDB');

    // Get the leads collection
    const db = mongoose.connection.db;
    const leadsCollection = db.collection('leads');

    // Find all documents that have followUpDateTime field
    const leadsWithOldField = await leadsCollection.find({ 
      followUpDateTime: { $exists: true } 
    }).toArray();

    console.log(`Found ${leadsWithOldField.length} leads with followUpDateTime field`);

    if (leadsWithOldField.length > 0) {
      // Update each document: rename followUpDateTime to nextCallDateTime
      const bulkOps = leadsWithOldField.map(lead => ({
        updateOne: {
          filter: { _id: lead._id },
          update: {
            $rename: { followUpDateTime: 'nextCallDateTime' }
          }
        }
      }));

      const result = await leadsCollection.bulkWrite(bulkOps);
      console.log(`Migration complete! Updated ${result.modifiedCount} documents`);
    } else {
      console.log('No documents to migrate');
    }

    await mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrateFollowUpField();
