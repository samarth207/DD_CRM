const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Connect to database
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/telecrm', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const brochureSchema = new mongoose.Schema({
  university: String,
  course: String,
  filePath: String,
  uploadedAt: Date,
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const Brochure = mongoose.model('Brochure', brochureSchema);

async function fixBrochurePaths() {
  try {
    console.log('Starting brochure path migration...');
    
    const brochures = await Brochure.find({});
    console.log(`Found ${brochures.length} brochures to check`);
    
    let fixed = 0;
    
    for (const brochure of brochures) {
      // Check if the path is absolute (contains : or starts with /)
      if (brochure.filePath.includes(':') || brochure.filePath.startsWith('/')) {
        console.log(`\nFixing: ${brochure.filePath}`);
        
        // Extract just the filename from the absolute path
        const fileName = path.basename(brochure.filePath);
        const newPath = `uploads/${fileName}`;
        
        brochure.filePath = newPath;
        await brochure.save();
        
        console.log(`Fixed to: ${newPath}`);
        fixed++;
      }
    }
    
    console.log(`\n✅ Migration complete! Fixed ${fixed} out of ${brochures.length} brochures.`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

fixBrochurePaths();
