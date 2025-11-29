require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const mongoose = require('mongoose');
const Lead = require('../models/Lead');

(async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI missing in .env');
    await mongoose.connect(uri);

    const leads = await Lead.find({});
    let updated = 0;
    for (const lead of leads) {
      // Map legacy fields if present on the document (raw data may still have them)
      const doc = lead.toObject();

      // phone -> contact (string)
      if (!lead.contact && doc.phone) {
        lead.contact = String(doc.phone);
      }
      // company -> profession (best-effort)
      if (!lead.profession && doc.company) {
        lead.profession = doc.company;
      }

      // Normalize status values to new set
      const mapStatus = (s) => {
        if (!s) return undefined;
        const t = String(s).trim().toLowerCase();
        if (['fresh', 'new'].includes(t)) return 'Fresh';
        if (['buffer fresh', 'buffer'].includes(t)) return 'Buffer fresh';
        if (['did not pick', 'dnp', 'no answer'].includes(t)) return 'Did not pick';
        if (['request call back', 'callback', 'call back'].includes(t)) return 'Request call back';
        if (['follow up', 'follow-up', 'contacted'].includes(t)) return 'Follow up';
        if (['counselled', 'counseled'].includes(t)) return 'Counselled';
        if (['interested in next batch', 'interested', 'next batch'].includes(t)) return 'Interested in next batch';
        if (['registration fees paid', 'fees paid', 'advance'].includes(t)) return 'Registration fees paid';
        if (['enrolled', 'converted', 'won'].includes(t)) return 'Enrolled';
        if (['junk/not interested', 'junk', 'not interested', 'lost'].includes(t)) return 'Junk/not interested';
        return 'Fresh';
      };
      if (lead.status) {
        lead.status = mapStatus(lead.status);
      }

      // Ensure statusHistory exists and includes current status
      if (!Array.isArray(lead.statusHistory) || lead.statusHistory.length === 0) {
        lead.statusHistory = [{ status: lead.status || 'Fresh', changedAt: new Date() }];
      }

      await lead.save();
      updated++;
    }

    console.log(`Migrated ${updated} leads to new schema fields.`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
})();
