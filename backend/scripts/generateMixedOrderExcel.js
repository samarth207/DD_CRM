const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');

// Sample lead data with mixed column order and some blank fields
// Notice: Different column ordering and case variations to test smart mapping
const leadsWithMixedOrder = [
  // Different column order and case - some empty fields
  { Contact: '9876543210', City: 'Mumbai', 'Full Name': 'Rajesh Kumar', email: 'rajesh@test.com', course: 'MBA', university: '', profession: 'Business Analyst' },
  
  // Missing university and course (should default to N/A)
  { 'E-mail': 'priya@test.com', Name: 'Priya Sharma', Phone: '9876543211', location: 'Delhi', Profession: 'Marketing Manager', Status: 'Fresh' },
  
  // All lowercase with variations
  { 'phone number': '9876543212', 'student name': 'Amit Patel', 'e-mail address': 'amit@test.com', city: 'Bangalore', program: 'Data Science', institution: 'IIT Delhi', 'current profession': 'Software Engineer' },
  
  // Mixed case, some blank fields
  { Email: 'sneha@test.com', mobile: '9876543213', name: 'Sneha Reddy', City: 'Hyderabad', Course: '', University: 'BITS Pilani', Occupation: 'Designer', notes: 'Interested in online program' },
  
  // Standard format with all fields
  { Name: 'Vikram Singh', Contact: '9876543214', Email: 'vikram@test.com', City: 'Pune', University: 'IIM Ahmedabad', Course: 'Executive MBA', Profession: 'Manager', Status: 'Follow up', Notes: 'Requested brochure' },
  
  // Completely different order with blank university
  { course: 'Digital Marketing', contact: '9876543215', city: 'Chennai', Name: 'Anita Desai', email: 'anita@test.com', profession: 'Content Writer', university: '' },
  
  // Some fields missing completely
  { 'Full Name': 'Sanjay Gupta', Mobile: '9876543216', Mail: 'sanjay@test.com', Place: 'Kolkata' },
  
  // With variations in column names
  { 'Lead Name': 'Meera Nair', Telephone: '9876543217', 'Email Address': 'meera@test.com', Town: 'Kochi', School: 'Xavier Institute', 'Program Name': 'Finance', Job: 'Accountant' },
  
  // All fields present but different case
  { EMAIL: 'arjun@test.com', CONTACT: '9876543218', NAME: 'Arjun Mehta', CITY: 'Jaipur', UNIVERSITY: 'Manipal University', COURSE: 'Engineering', PROFESSION: 'Engineer' },
  
  // Minimal information
  { name: 'Kavita Shah', phone: '9876543219', email: 'kavita@test.com' },
  
  // With notes and status
  { Contact: '9876543220', Name: 'Deepak Verma', Email: 'deepak@test.com', City: 'Ahmedabad', University: 'NIT Surat', Course: 'Computer Science', Profession: 'Developer', Status: 'Counselled', Comments: 'Very interested, follow up next week' },
  
  // Blank course and university
  { Name: 'Pooja Iyer', 'Phone Number': '9876543221', 'E-mail': 'pooja@test.com', Location: 'Coimbatore', Course: '', University: '', Profassion: 'Teacher', remarks: 'Exploring options' },
  
  // Standard but with different field names
  { 'Student Name': 'Rohit Kapoor', Cell: '9876543222', Mail: 'rohit@test.com', City: 'Lucknow', College: 'Amity University', Degree: 'BBA', Work: 'Sales Executive' },
  
  // With empty strings for course/university
  { Name: 'Simran Kaur', Contact: '9876543223', Email: 'simran@test.com', City: 'Chandigarh', University: '   ', Course: '   ', Profession: 'HR Manager', Note: 'Schedule a call' },
  
  // International format
  { Name: 'David Wilson', Contact: '+1-555-0199', Email: 'david@test.com', City: 'New York', University: '', Course: 'MBA', Profession: 'Consultant' }
];

// Create worksheet
const worksheet = xlsx.utils.json_to_sheet(leadsWithMixedOrder);

// Create workbook
const workbook = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(workbook, worksheet, 'Leads');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Write file
const filePath = path.join(uploadsDir, 'sample-leads-mixed-order.xlsx');
xlsx.writeFile(workbook, filePath);

console.log(`✅ Sample Excel file with mixed field order created at: ${filePath}`);
console.log('\nFeatures demonstrated:');
console.log('- Different column orders');
console.log('- Various column name variations (Name/Full Name/Student Name, etc.)');
console.log('- Mixed case (email/Email/EMAIL/E-mail)');
console.log('- Blank/empty fields for course and university (will default to N/A)');
console.log('- Missing columns entirely');
console.log('- Additional field variations (Phone/Mobile/Contact/Telephone)');
console.log('\nYou can use this file to test the smart Excel field mapping!');
