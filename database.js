const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'department.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS faculty (
      facultyId TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS students (
      rollNo TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT,
      coursesRegistered TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS courses (
      courseId TEXT PRIMARY KEY,
      courseName TEXT NOT NULL,
      credits INTEGER NOT NULL DEFAULT 3
    );

    CREATE TABLE IF NOT EXISTS registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rollNo TEXT NOT NULL,
      courseId TEXT NOT NULL,
      semester TEXT NOT NULL,
      registrationDate TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'registered',
      FOREIGN KEY (rollNo) REFERENCES students(rollNo),
      FOREIGN KEY (courseId) REFERENCES courses(courseId)
    );

    CREATE TABLE IF NOT EXISTS grades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rollNo TEXT NOT NULL,
      courseId TEXT NOT NULL,
      semester TEXT NOT NULL,
      gradePoint REAL NOT NULL,
      FOREIGN KEY (rollNo) REFERENCES students(rollNo),
      FOREIGN KEY (courseId) REFERENCES courses(courseId)
    );

    CREATE TABLE IF NOT EXISTS grade_sheets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rollNo TEXT NOT NULL,
      semester TEXT NOT NULL,
      sgpa REAL NOT NULL,
      cgpa REAL NOT NULL,
      FOREIGN KEY (rollNo) REFERENCES students(rollNo)
    );

    CREATE TABLE IF NOT EXISTS inventory_items (
      itemId TEXT PRIMARY KEY,
      itemName TEXT NOT NULL,
      location TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS department_account (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      annualGrant REAL NOT NULL DEFAULT 0,
      consultancyFunds REAL NOT NULL DEFAULT 0,
      income REAL NOT NULL DEFAULT 0,
      expenditure REAL NOT NULL DEFAULT 0,
      balance REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL,
      description TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS research_projects (
      projectId TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      fundingSource TEXT,
      status TEXT NOT NULL DEFAULT 'ongoing',
      facultyId TEXT,
      FOREIGN KEY (facultyId) REFERENCES faculty(facultyId)
    );

    CREATE TABLE IF NOT EXISTS publications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      journal TEXT,
      publishedDate TEXT,
      facultyId TEXT,
      FOREIGN KEY (facultyId) REFERENCES faculty(facultyId)
    );
  `);

  // Initialize the single department account row if not present
  const accountExists = db.prepare('SELECT COUNT(*) as count FROM department_account').get();
  if (accountExists.count === 0) {
    db.prepare('INSERT INTO department_account (id, annualGrant, consultancyFunds, income, expenditure, balance) VALUES (1, 0, 0, 0, 0, 0)').run();
  }

  // Seed some sample data for demonstration
  seedSampleData();
}

function seedSampleData() {
  const studentCount = db.prepare('SELECT COUNT(*) as count FROM students').get();
  if (studentCount.count > 0) return; // Already seeded

  // Faculty
  const insertFaculty = db.prepare('INSERT OR IGNORE INTO faculty (facultyId, name) VALUES (?, ?)');
  insertFaculty.run('FAC001', 'Dr. Ananya Sharma');
  insertFaculty.run('FAC002', 'Prof. Rajesh Kumar');
  insertFaculty.run('FAC003', 'Dr. Priya Nair');

  // Courses
  const insertCourse = db.prepare('INSERT OR IGNORE INTO courses (courseId, courseName, credits) VALUES (?, ?, ?)');
  insertCourse.run('CS101', 'Data Structures', 4);
  insertCourse.run('CS102', 'Algorithms', 4);
  insertCourse.run('CS201', 'Operating Systems', 3);
  insertCourse.run('CS202', 'Database Systems', 3);
  insertCourse.run('CS301', 'Computer Networks', 3);
  insertCourse.run('CS302', 'Software Engineering', 3);
  insertCourse.run('MA101', 'Discrete Mathematics', 3);
  insertCourse.run('MA201', 'Probability & Statistics', 3);

  // Students
  const insertStudent = db.prepare('INSERT OR IGNORE INTO students (rollNo, name, address, coursesRegistered) VALUES (?, ?, ?, ?)');
  insertStudent.run('2024CS001', 'Aarav Patel', '12 MG Road, Delhi', 'CS101,CS102,MA101');
  insertStudent.run('2024CS002', 'Meera Iyer', '45 Park Street, Kolkata', 'CS101,CS201,MA101');
  insertStudent.run('2024CS003', 'Rohan Singh', '78 Brigade Road, Bangalore', 'CS102,CS202,CS301');

  // Registrations
  const insertReg = db.prepare('INSERT INTO registrations (rollNo, courseId, semester, registrationDate, status) VALUES (?, ?, ?, ?, ?)');
  insertReg.run('2024CS001', 'CS101', 'Fall 2024', '2024-08-01', 'completed');
  insertReg.run('2024CS001', 'CS102', 'Fall 2024', '2024-08-01', 'completed');
  insertReg.run('2024CS001', 'MA101', 'Fall 2024', '2024-08-01', 'completed');
  insertReg.run('2024CS001', 'CS201', 'Spring 2025', '2025-01-10', 'registered');
  insertReg.run('2024CS002', 'CS101', 'Fall 2024', '2024-08-01', 'completed');
  insertReg.run('2024CS002', 'CS201', 'Fall 2024', '2024-08-01', 'backlog');
  insertReg.run('2024CS002', 'MA101', 'Fall 2024', '2024-08-01', 'completed');

  // Grades
  const insertGrade = db.prepare('INSERT INTO grades (rollNo, courseId, semester, gradePoint) VALUES (?, ?, ?, ?)');
  insertGrade.run('2024CS001', 'CS101', 'Fall 2024', 9.0);
  insertGrade.run('2024CS001', 'CS102', 'Fall 2024', 8.5);
  insertGrade.run('2024CS001', 'MA101', 'Fall 2024', 8.0);
  insertGrade.run('2024CS002', 'CS101', 'Fall 2024', 7.5);
  insertGrade.run('2024CS002', 'CS201', 'Fall 2024', 3.5);
  insertGrade.run('2024CS002', 'MA101', 'Fall 2024', 8.0);

  // Grade sheets
  const insertGS = db.prepare('INSERT INTO grade_sheets (rollNo, semester, sgpa, cgpa) VALUES (?, ?, ?, ?)');
  insertGS.run('2024CS001', 'Fall 2024', 8.5, 8.5);
  insertGS.run('2024CS002', 'Fall 2024', 6.33, 6.33);

  // Inventory
  const insertInv = db.prepare('INSERT OR IGNORE INTO inventory_items (itemId, itemName, location, quantity) VALUES (?, ?, ?, ?)');
  insertInv.run('INV001', 'Dell Optiplex Workstation', 'Lab 101', 30);
  insertInv.run('INV002', 'HP LaserJet Printer', 'Office Room', 2);
  insertInv.run('INV003', 'Projector Epson EB-X51', 'Lecture Hall A', 3);
  insertInv.run('INV004', 'Office Desk (Wood)', 'Faculty Block', 15);
  insertInv.run('INV005', 'Cisco Router 2901', 'Networking Lab', 5);

  // Department Account
  db.prepare('UPDATE department_account SET annualGrant = 1500000, consultancyFunds = 350000, income = 1850000, expenditure = 720000, balance = 1130000 WHERE id = 1').run();

  // Transactions
  const insertTx = db.prepare('INSERT INTO transactions (date, amount, type, description) VALUES (?, ?, ?, ?)');
  insertTx.run('2024-04-01', 1500000, 'income', 'Annual University Grant FY 2024-25');
  insertTx.run('2024-06-15', 200000, 'income', 'Consultancy: Network Audit for TechCorp');
  insertTx.run('2024-07-20', 150000, 'income', 'Consultancy: ML Workshop for DataInc');
  insertTx.run('2024-05-10', 320000, 'expenditure', 'Purchase: 10x Dell Workstations');
  insertTx.run('2024-06-01', 85000, 'expenditure', 'Books & Journals Annual Subscription');
  insertTx.run('2024-08-15', 45000, 'expenditure', 'Stationery & Office Supplies');
  insertTx.run('2024-09-01', 270000, 'expenditure', 'Lab Equipment: Cisco Routers');

  // Research Projects
  const insertRP = db.prepare('INSERT OR IGNORE INTO research_projects (projectId, title, fundingSource, status, facultyId) VALUES (?, ?, ?, ?, ?)');
  insertRP.run('RP001', 'Deep Learning for Medical Imaging', 'DST-SERB', 'ongoing', 'FAC001');
  insertRP.run('RP002', 'IoT-based Smart Campus', 'MHRD', 'ongoing', 'FAC002');
  insertRP.run('RP003', 'NLP for Regional Languages', 'CSIR', 'completed', 'FAC003');

  // Publications
  const insertPub = db.prepare('INSERT INTO publications (title, journal, publishedDate, facultyId) VALUES (?, ?, ?, ?)');
  insertPub.run('Attention Mechanisms in Medical Image Segmentation', 'IEEE Trans. Medical Imaging', '2024-03-15', 'FAC001');
  insertPub.run('Edge Computing Architectures for IoT', 'ACM Computing Surveys', '2024-05-20', 'FAC002');
  insertPub.run('Transformer Models for Hindi-English Translation', 'Computational Linguistics', '2024-01-10', 'FAC003');
  insertPub.run('Federated Learning in Healthcare', 'Nature Machine Intelligence', '2024-07-01', 'FAC001');
}

module.exports = { db, initializeDatabase };
