const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');

// Sample lead data (matching required columns)
const leads = [
  { Name: 'Alice Johnson', Contact: '+1-202-555-0112', Email: 'alice@example.com', City: 'New York', University: 'NYU', Course: 'MBA', Profession: 'Marketing Manager', Status: 'Fresh', Notes: 'Initial inquiry' },
  { Name: 'Bob Singh', Contact: '+1-202-555-0223', Email: 'bob@example.com', City: 'San Francisco', University: 'Stanford', Course: 'Data Science', Profession: 'Data Analyst', Status: 'Follow up', Notes: 'Interested in program' },
  { Name: 'Carla Mendes', Contact: '+1-202-555-0334', Email: 'carla@example.com', City: 'Boston', University: 'MIT', Course: 'Engineering', Profession: 'Software Engineer', Status: 'Counselled', Notes: 'Discussed options' },
  { Name: 'David Osei', Contact: '+1-202-555-0445', Email: 'david@example.com', City: 'Chicago', University: 'Northwestern', Course: 'Finance', Profession: 'Financial Analyst', Status: 'Request call back', Notes: 'Follow-up needed' },
  { Name: 'Emma Li', Contact: '+1-202-555-0556', Email: 'emma@example.com', City: 'Seattle', University: 'UW', Course: 'Computer Science', Profession: 'Developer', Status: 'Interested in next batch', Notes: 'Waiting for schedule' },
  { Name: 'Fahad Khan', Contact: '+1-202-555-0667', Email: 'fahad@example.com', City: 'Austin', University: 'UT Austin', Course: 'Business', Profession: 'Business Analyst', Status: 'Registration fees paid', Notes: 'Payment received' },
  { Name: 'Grace Park', Contact: '+1-202-555-0778', Email: 'grace@example.com', City: 'Los Angeles', University: 'UCLA', Course: 'Marketing', Profession: 'Marketing Executive', Status: 'Enrolled', Notes: 'Successfully enrolled' },
  { Name: 'Henry Adams', Contact: '+1-202-555-0889', Email: 'henry@example.com', City: 'Miami', University: 'FIU', Course: 'IT', Profession: 'IT Consultant', Status: 'Buffer fresh', Notes: 'Pending response' },
  { Name: 'Isabella Cruz', Contact: '+1-202-555-1000', Email: 'isabella@example.com', City: 'Denver', University: 'CU Boulder', Course: 'Design', Profession: 'Designer', Status: 'Did not pick', Notes: 'No answer' },
  { Name: 'Jack Miller', Contact: '+1-202-555-1001', Email: 'jack@example.com', City: 'Portland', University: 'PSU', Course: 'Management', Profession: 'Manager', Status: 'Junk/not interested', Notes: 'Not interested' },
  { Name: 'Karen Lopez', Contact: '+1-202-555-1112', Email: 'karen@example.com', City: 'Phoenix', University: 'ASU', Course: 'Economics', Profession: 'Economist', Status: 'Fresh', Notes: 'New inquiry' },
  { Name: 'Leo Brown', Contact: '+1-202-555-1223', Email: 'leo@example.com', City: 'Atlanta', University: 'Georgia Tech', Course: 'Engineering', Profession: 'Engineer', Status: 'Counselled', Notes: 'Consultation completed' },
  { Name: 'Maya Patel', Contact: '+1-202-555-1334', Email: 'maya@example.com', City: 'Dallas', University: 'SMU', Course: 'MBA', Profession: 'Business Owner', Status: 'Enrolled', Notes: 'Enrolled successfully' },
  { Name: 'Noah Kim', Contact: '+1-202-555-1445', Email: 'noah@example.com', City: 'Philadelphia', University: 'UPenn', Course: 'Finance', Profession: 'Accountant', Status: 'Follow up', Notes: 'Needs follow up' },
  { Name: 'Olivia Chen', Contact: '+1-202-555-1556', Email: 'olivia@example.com', City: 'San Diego', University: 'UCSD', Course: 'Biology', Profession: 'Researcher', Status: 'Fresh', Notes: 'First contact' },

  // 50 new entries
  { Name: 'Paul Rivera', Contact: '+1-202-555-2001', Email: 'paul@example.com', City: 'Houston', University: 'Rice', Course: 'MBA', Profession: 'Consultant', Status: 'Fresh', Notes: 'New inquiry' },
  { Name: 'Sophia Turner', Contact: '+1-202-555-2002', Email: 'sophia@example.com', City: 'Las Vegas', University: 'UNLV', Course: 'Hospitality', Profession: 'Hotel Manager', Status: 'Follow up', Notes: 'Requested brochure' },
  { Name: 'Marcus Green', Contact: '+1-202-555-2003', Email: 'marcus@example.com', City: 'Detroit', University: 'Wayne State', Course: 'Engineering', Profession: 'Mechanical Engineer', Status: 'Counselled', Notes: 'Discussed career path' },
  { Name: 'Natalie Brooks', Contact: '+1-202-555-2004', Email: 'natalie@example.com', City: 'Charlotte', University: 'UNC Charlotte', Course: 'Finance', Profession: 'Banker', Status: 'Request call back', Notes: 'Asked for details' },
  { Name: 'Omar Hassan', Contact: '+1-202-555-2005', Email: 'omar@example.com', City: 'Orlando', University: 'UCF', Course: 'Computer Science', Profession: 'Software Developer', Status: 'Interested in next batch', Notes: 'Waiting for schedule' },
  { Name: 'Priya Sharma', Contact: '+1-202-555-2006', Email: 'priya@example.com', City: 'San Jose', University: 'SJSU', Course: 'Business', Profession: 'Entrepreneur', Status: 'Registration fees paid', Notes: 'Payment confirmed' },
  { Name: 'Quentin Blake', Contact: '+1-202-555-2007', Email: 'quentin@example.com', City: 'Minneapolis', University: 'UMN', Course: 'Marketing', Profession: 'Brand Strategist', Status: 'Enrolled', Notes: 'Joined program' },
  { Name: 'Rosa Martinez', Contact: '+1-202-555-2008', Email: 'rosa@example.com', City: 'Tampa', University: 'USF', Course: 'Biology', Profession: 'Lab Technician', Status: 'Buffer fresh', Notes: 'Pending confirmation' },
  { Name: 'Samuel Wright', Contact: '+1-202-555-2009', Email: 'samuel@example.com', City: 'Cleveland', University: 'Case Western', Course: 'Law', Profession: 'Legal Assistant', Status: 'Did not pick', Notes: 'No response' },
  { Name: 'Tina Zhang', Contact: '+1-202-555-2010', Email: 'tina@example.com', City: 'Salt Lake City', University: 'U of Utah', Course: 'Design', Profession: 'Graphic Designer', Status: 'Junk/not interested', Notes: 'Not interested' },
  { Name: 'Usha Nair', Contact: '+1-202-555-2011', Email: 'usha@example.com', City: 'Baltimore', University: 'Johns Hopkins', Course: 'Medicine', Profession: 'Doctor', Status: 'Fresh', Notes: 'Initial inquiry' },
  { Name: 'Victor Hugo', Contact: '+1-202-555-2012', Email: 'victor@example.com', City: 'Kansas City', University: 'UMKC', Course: 'Economics', Profession: 'Economist', Status: 'Counselled', Notes: 'Consultation done' },
  { Name: 'Wendy Scott', Contact: '+1-202-555-2013', Email: 'wendy@example.com', City: 'Columbus', University: 'OSU', Course: 'Psychology', Profession: 'Therapist', Status: 'Enrolled', Notes: 'Joined successfully' },
  { Name: 'Xavier Lopez', Contact: '+1-202-555-2014', Email: 'xavier@example.com', City: 'Indianapolis', University: 'IUPUI', Course: 'IT', Profession: 'IT Specialist', Status: 'Follow up', Notes: 'Needs more info' },
  { Name: 'Yara Ali', Contact: '+1-202-555-2015', Email: 'yara@example.com', City: 'St. Louis', University: 'WashU', Course: 'Architecture', Profession: 'Architect', Status: 'Fresh', Notes: 'First contact' },
  { Name: 'Zane Carter', Contact: '+1-202-555-2016', Email: 'zane@example.com', City: 'Milwaukee', University: 'Marquette', Course: 'Engineering', Profession: 'Civil Engineer', Status: 'Request call back', Notes: 'Asked for callback' },
  { Name: 'Amira Khan', Contact: '+1-202-555-2017', Email: 'amira@example.com', City: 'Raleigh', University: 'NC State', Course: 'Data Science', Profession: 'Data Scientist', Status: 'Interested in next batch', Notes: 'Waiting for schedule' },
  { Name: 'Brian Lee', Contact: '+1-202-555-2018', Email: 'brian@example.com', City: 'Sacramento', University: 'CSUS', Course: 'Business', Profession: 'Business Consultant', Status: 'Registration fees paid', Notes: 'Payment received' },
  { Name: 'Clara Gomez', Contact: '+1-202-555-2019', Email: 'clara@example.com', City: 'San Antonio', University: 'UTSA', Course: 'Marketing', Profession: 'Marketing Specialist', Status: 'Enrolled', Notes: 'Enrolled successfully' },
  { Name: 'Derek White', Contact: '+1-202-555-2020', Email: 'derek@example.com', City: 'Nashville', University: 'Vanderbilt', Course: 'Music', Profession: 'Musician', Status: 'Buffer fresh', Notes: 'Pending response' },
  { Name: 'Elena Petrova', Contact: '+1-202-555-2021', Email: 'elena@example.com', City: 'Pittsburgh', University: 'CMU', Course: 'Robotics', Profession: 'Robotics Engineer', Status: 'Counselled', Notes: 'Discussed options' },
  { Name: 'Felix Brown', Contact: '+1-202-555-2022', Email: 'felix@example.com', City: 'Cincinnati', University: 'UC', Course: 'Chemistry', Profession: 'Chemist', Status: 'Follow up', Notes: 'Interested in program' },
  { Name: 'Gina Torres', Contact: '+1-202-555-2023', Email: 'gina@example.com', City: 'Buffalo', University: 'UB', Course: 'Law', Profession: 'Lawyer', Status: 'Fresh', Notes: 'Initial inquiry' },
  { Name: 'Hector Ramirez', Contact: '+1-202-555-2024', Email: 'hector@example.com', City: 'Richmond', University: 'VCU', Course: 'Finance', Profession: 'Financial Advisor', Status: 'Request call back', Notes: 'Follow-up needed' },
  { Name: 'Ivy Chen', Contact: '+1-202-555-2025', Email: 'ivy@example.com', City: 'Hartford', University: 'UConn', Course: 'Biology', Profession: 'Research Assistant', Status: 'Interested in next batch', Notes: 'Waiting for schedule' },
  { Name: 'James Bond', Contact: '+1-202-555-2026', Email: 'james@example.com', City: 'Anchorage', University: 'UAA', Course: 'Criminology', Profession: 'Investigator', Status: 'Junk/not interested', Notes: 'Not interested' },
  { Name: 'Kylie Morgan', Contact: '+1-202-555-2027', Email: 'kylie@example.com', City: 'Boise', University: 'BSU', Course: 'Education', Profession: 'Teacher', Status: 'Fresh', Notes: 'New inquiry' },
  { Name: 'Liam Davis', Contact: '+1-202-555-2028', Email: 'liam@example.com', City: 'Madison', University: 'UW Madison', Course: 'Economics', Profession: 'Economist', Status: 'Counselled', Notes: 'Consultation completed' },
  { Name: 'Mila Novak', Contact: '+1-202-555-2029', Email: 'mila@example.com', City: 'Albany', University: 'SUNY Albany', Course: 'Political Science', Profession: 'Policy Analyst', Status: 'Enrolled', Notes: 'Enrolled successfully' },
  { Name: 'Nate Robinson', Contact: '+1-202-555-2030', Email: 'nate@example.com', City: 'Des Moines', University: 'Drake', Course: 'Management', Profession: 'Manager', Status: 'Follow up', Notes: 'Pending meeting' },
  { Name: 'Olga Ivanova', Contact: '+1-202-555-2031', Email: 'olga@example.com', City: 'Spokane', University: 'WSU', Course: 'Nursing', Profession: 'Nurse', Status: 'Fresh', Notes: 'Initial inquiry' },
  { Name: 'Peter Wang', Contact: '+1-202-555-2032', Email: 'peter@example.com', City: 'New Orleans', University: 'Tulane', Course: 'Public Health', Profession: 'Coordinator', Status: 'Counselled', Notes: 'Explored syllabus' },
  { Name: 'Queenie Das', Contact: '+1-202-555-2033', Email: 'queenie@example.com', City: 'Omaha', University: 'UNO', Course: 'Accounting', Profession: 'Auditor', Status: 'Enrolled', Notes: 'Onboarded' },
  { Name: 'Rafael Costa', Contact: '+1-202-555-2034', Email: 'rafael@example.com', City: 'El Paso', University: 'UTEP', Course: 'Engineering', Profession: 'Electrical Engineer', Status: 'Buffer fresh', Notes: 'Awaiting reply' },
  { Name: 'Sara Ahmed', Contact: '+1-202-555-2035', Email: 'sara@example.com', City: 'Fresno', University: 'Fresno State', Course: 'Agriculture', Profession: 'Ag Specialist', Status: 'Request call back', Notes: 'Preferred afternoon call' },
  { Name: 'Tom Baker', Contact: '+1-202-555-2036', Email: 'tom@example.com', City: 'Reno', University: 'UNR', Course: 'Computer Science', Profession: 'Backend Developer', Status: 'Interested in next batch', Notes: 'Waiting next intake' },
  { Name: 'Uma Kapoor', Contact: '+1-202-555-2037', Email: 'uma@example.com', City: 'Birmingham', University: 'UAB', Course: 'Biotech', Profession: 'Researcher', Status: 'Registration fees paid', Notes: 'Payment verified' },
  { Name: 'Vikram Iyer', Contact: '+1-202-555-2038', Email: 'vikram@example.com', City: 'Tulsa', University: 'TU', Course: 'Energy', Profession: 'Energy Analyst', Status: 'Follow up', Notes: 'Requested case studies' },
  { Name: 'Will Harper', Contact: '+1-202-555-2039', Email: 'will@example.com', City: 'Wichita', University: 'WSU', Course: 'Aviation', Profession: 'Pilot', Status: 'Fresh', Notes: 'First contact' },
  { Name: 'Xenia Morales', Contact: '+1-202-555-2040', Email: 'xenia@example.com', City: 'Baton Rouge', University: 'LSU', Course: 'Chemistry', Profession: 'Lab Assistant', Status: 'Counselled', Notes: 'Compared programs' },
  { Name: 'Yusuf Khan', Contact: '+1-202-555-2041', Email: 'yusuf@example.com', City: 'Lexington', University: 'UK', Course: 'Statistics', Profession: 'Statistician', Status: 'Enrolled', Notes: 'Confirmed enrollment' },
  { Name: 'Zara Patel', Contact: '+1-202-555-2042', Email: 'zara@example.com', City: 'Lincoln', University: 'UNL', Course: 'Psychology', Profession: 'Counselor', Status: 'Buffer fresh', Notes: 'Pending confirmation' },
  { Name: 'Aiden Clark', Contact: '+1-202-555-2043', Email: 'aiden@example.com', City: 'Plano', University: 'UTD', Course: 'IT', Profession: 'Systems Admin', Status: 'Did not pick', Notes: 'Missed call' },
  { Name: 'Bella Rossi', Contact: '+1-202-555-2044', Email: 'bella@example.com', City: 'Chandler', University: 'ASU', Course: 'Design', Profession: 'UI Designer', Status: 'Junk/not interested', Notes: 'Not a fit' },
  { Name: 'Carlos Ortega', Contact: '+1-202-555-2045', Email: 'carlos@example.com', City: 'Glendale', University: 'NAU', Course: 'Business', Profession: 'Sales Lead', Status: 'Fresh', Notes: 'New inquiry' },
  { Name: 'Diana Prince', Contact: '+1-202-555-2046', Email: 'diana@example.com', City: 'Irving', University: 'UT Arlington', Course: 'Management', Profession: 'Operations Lead', Status: 'Follow up', Notes: 'Requested curriculum' },
  { Name: 'Ethan Young', Contact: '+1-202-555-2047', Email: 'ethan@example.com', City: 'Hialeah', University: 'FIU', Course: 'Finance', Profession: 'Trader', Status: 'Counselled', Notes: 'Explained fees' },
  { Name: 'Farah Ali', Contact: '+1-202-555-2048', Email: 'farah@example.com', City: 'Garland', University: 'UNT', Course: 'Marketing', Profession: 'Content Strategist', Status: 'Enrolled', Notes: 'Orientation scheduled' },
  { Name: 'George King', Contact: '+1-202-555-2049', Email: 'george@example.com', City: 'Scottsdale', University: 'ASU', Course: 'Computer Science', Profession: 'Full-stack Dev', Status: 'Buffer fresh', Notes: 'Awaiting email' },
  { Name: 'Hana Suzuki', Contact: '+1-202-555-2050', Email: 'hana@example.com', City: 'Lubbock', University: 'TTU', Course: 'Biology', Profession: 'Lab Tech', Status: 'Request call back', Notes: 'Prefers morning' },
  { Name: 'Ian McKay', Contact: '+1-202-555-2051', Email: 'ian@example.com', City: 'Chula Vista', University: 'SDSU', Course: 'Data Science', Profession: 'ML Engineer', Status: 'Interested in next batch', Notes: 'Waiting dates' },
  { Name: 'Jia Huang', Contact: '+1-202-555-2052', Email: 'jia@example.com', City: 'Norfolk', University: 'ODU', Course: 'Cybersecurity', Profession: 'Security Analyst', Status: 'Registration fees paid', Notes: 'Paid online' },
  { Name: 'Kabir Singh', Contact: '+1-202-555-2053', Email: 'kabir@example.com', City: 'Chesapeake', University: 'NSU', Course: 'Economics', Profession: 'Research Associate', Status: 'Follow up', Notes: 'Needs scholarship info' },
  { Name: 'Lara Croft', Contact: '+1-202-555-2054', Email: 'lara@example.com', City: 'Durham', University: 'Duke', Course: 'Anthropology', Profession: 'Field Researcher', Status: 'Fresh', Notes: 'Initial interest' },
  { Name: 'Mohammad Rahman', Contact: '+1-202-555-2055', Email: 'mohammad@example.com', City: 'Fort Wayne', University: 'Purdue Fort Wayne', Course: 'IT', Profession: 'Network Engineer', Status: 'Counselled', Notes: 'Compared tracks' },
  { Name: 'Nina Lopez', Contact: '+1-202-555-2056', Email: 'nina@example.com', City: 'St. Paul', University: 'UMN', Course: 'Psychology', Profession: 'Case Worker', Status: 'Enrolled', Notes: 'Welcome email sent' },
  { Name: 'Owen Parker', Contact: '+1-202-555-2057', Email: 'owen@example.com', City: 'Aurora', University: 'UC Denver', Course: 'Architecture', Profession: 'CAD Specialist', Status: 'Buffer fresh', Notes: 'Pending confirmation' },
  { Name: 'Pari Mehta', Contact: '+1-202-555-2058', Email: 'pari@example.com', City: 'Jersey City', University: 'NJIT', Course: 'Engineering', Profession: 'Process Engineer', Status: 'Did not pick', Notes: 'Voicemail left' },
  { Name: 'Rohan Desai', Contact: '+1-202-555-2059', Email: 'rohan@example.com', City: 'Irvine', University: 'UCI', Course: 'MBA', Profession: 'Product Manager', Status: 'Junk/not interested', Notes: 'Exploring other options' }
];
function generate() {
  const worksheet = xlsx.utils.json_to_sheet(leads);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Leads');

  const outputPath = path.join(process.cwd(), 'sample_leads.xlsx');
  xlsx.writeFile(workbook, outputPath);

  console.log('Sample Excel file created at:', outputPath);
  console.log('Columns: Name, Contact, Email, City, University, Course, Profession, Status, Notes');
}

generate();
