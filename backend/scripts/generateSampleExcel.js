const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');

// Sample lead data
const leads = [
  { Name: 'Alice Johnson', Email: 'alice@example.com', Phone: '+1-202-555-0111', Contact: '+1-202-555-0112', City: 'New York', University: 'NYU', Course: 'MBA', Profession: 'Marketing Manager', Company: 'Alpha Corp', Status: 'Fresh', Notes: 'Initial inquiry' },
  { Name: 'Bob Singh', Email: 'bob@example.com', Phone: '+1-202-555-0222', Contact: '+1-202-555-0223', City: 'San Francisco', University: 'Stanford', Course: 'Data Science', Profession: 'Data Analyst', Company: 'Beta LLC', Status: 'Follow up', Notes: 'Interested in program' },
  { Name: 'Carla Mendes', Email: 'carla@example.com', Phone: '+1-202-555-0333', Contact: '+1-202-555-0334', City: 'Boston', University: 'MIT', Course: 'Engineering', Profession: 'Software Engineer', Company: 'Gamma Industries', Status: 'Counselled', Notes: 'Discussed options' },
  { Name: 'David Osei', Email: 'david@example.com', Phone: '+1-202-555-0444', Contact: '+1-202-555-0445', City: 'Chicago', University: 'Northwestern', Course: 'Finance', Profession: 'Financial Analyst', Company: 'Delta Partners', Status: 'Request call back', Notes: 'Follow-up needed' },
  { Name: 'Emma Li', Email: 'emma@example.com', Phone: '+1-202-555-0555', Contact: '+1-202-555-0556', City: 'Seattle', University: 'UW', Course: 'Computer Science', Profession: 'Developer', Company: 'Epsilon Tech', Status: 'Interested in next batch', Notes: 'Waiting for schedule' },
  { Name: 'Fahad Khan', Email: 'fahad@example.com', Phone: '+1-202-555-0666', Contact: '+1-202-555-0667', City: 'Austin', University: 'UT Austin', Course: 'Business', Profession: 'Business Analyst', Company: 'Zeta Group', Status: 'Registration fees paid', Notes: 'Payment received' },
  { Name: 'Grace Park', Email: 'grace@example.com', Phone: '+1-202-555-0777', Contact: '+1-202-555-0778', City: 'Los Angeles', University: 'UCLA', Course: 'Marketing', Profession: 'Marketing Executive', Company: 'Eta Solutions', Status: 'Enrolled', Notes: 'Successfully enrolled' },
  { Name: 'Henry Adams', Email: 'henry@example.com', Phone: '+1-202-555-0888', Contact: '+1-202-555-0889', City: 'Miami', University: 'FIU', Course: 'IT', Profession: 'IT Consultant', Company: 'Theta Ventures', Status: 'Buffer fresh', Notes: 'Pending response' },
  { Name: 'Isabella Cruz', Email: 'isabella@example.com', Phone: '+1-202-555-0999', Contact: '+1-202-555-1000', City: 'Denver', University: 'CU Boulder', Course: 'Design', Profession: 'Designer', Company: 'Iota Labs', Status: 'Did not pick', Notes: 'No answer' },
  { Name: 'Jack Miller', Email: 'jack@example.com', Phone: '+1-202-555-1000', Contact: '+1-202-555-1001', City: 'Portland', University: 'PSU', Course: 'Management', Profession: 'Manager', Company: 'Kappa Systems', Status: 'Junk/not interested', Notes: 'Not interested' },
  { Name: 'Karen Lopez', Email: 'karen@example.com', Phone: '+1-202-555-1111', Contact: '+1-202-555-1112', City: 'Phoenix', University: 'ASU', Course: 'Economics', Profession: 'Economist', Company: 'Lambda Consulting', Status: 'Fresh', Notes: 'New inquiry' },
  { Name: 'Leo Brown', Email: 'leo@example.com', Phone: '+1-202-555-1222', Contact: '+1-202-555-1223', City: 'Atlanta', University: 'Georgia Tech', Course: 'Engineering', Profession: 'Engineer', Company: 'Mu Enterprises', Status: 'Counselled', Notes: 'Consultation completed' },
  { Name: 'Maya Patel', Email: 'maya@example.com', Phone: '+1-202-555-1333', Contact: '+1-202-555-1334', City: 'Dallas', University: 'SMU', Course: 'MBA', Profession: 'Business Owner', Company: 'Nu Technologies', Status: 'Enrolled', Notes: 'Enrolled successfully' },
  { Name: 'Noah Kim', Email: 'noah@example.com', Phone: '+1-202-555-1444', Contact: '+1-202-555-1445', City: 'Philadelphia', University: 'UPenn', Course: 'Finance', Profession: 'Accountant', Company: 'Xi Innovations', Status: 'Follow up', Notes: 'Needs follow up' },
  { Name: 'Olivia Chen', Email: 'olivia@example.com', Phone: '+1-202-555-1555', Contact: '+1-202-555-1556', City: 'San Diego', University: 'UCSD', Course: 'Biology', Profession: 'Researcher', Company: 'Omicron Global', Status: 'Fresh', Notes: 'First contact' }
];

function generate() {
  const worksheet = xlsx.utils.json_to_sheet(leads);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Leads');

  const outputPath = path.join(process.cwd(), 'sample_leads.xlsx');
  xlsx.writeFile(workbook, outputPath);

  console.log('Sample Excel file created at:', outputPath);
  console.log('Columns: Name, Email, Phone, Contact, City, University, Course, Profession, Company, Status, Notes');
}

generate();
