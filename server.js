const express = require('express');
const cors = require('cors');
const path = require('path');
const { db, initializeDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize database
initializeDatabase();

// ─────────────────────────────────────────────
// STUDENTS
// ─────────────────────────────────────────────
app.get('/api/students', (req, res) => {
  const students = db.prepare('SELECT * FROM students').all();
  res.json(students);
});

app.get('/api/students/:rollNo', (req, res) => {
  const student = db.prepare('SELECT * FROM students WHERE rollNo = ?').get(req.params.rollNo);
  if (!student) return res.status(404).json({ error: 'Student not found' });

  // Get registrations with course details
  const registrations = db.prepare(`
    SELECT r.*, c.courseName, c.credits
    FROM registrations r
    JOIN courses c ON r.courseId = c.courseId
    WHERE r.rollNo = ?
    ORDER BY r.semester DESC, c.courseName
  `).all(req.params.rollNo);

  // Get grade sheets
  const gradeSheets = db.prepare('SELECT * FROM grade_sheets WHERE rollNo = ? ORDER BY semester DESC').all(req.params.rollNo);

  // Get grades with course details
  const grades = db.prepare(`
    SELECT g.*, c.courseName, c.credits
    FROM grades g
    JOIN courses c ON g.courseId = c.courseId
    WHERE g.rollNo = ?
    ORDER BY g.semester DESC
  `).all(req.params.rollNo);

  const completed = registrations.filter(r => r.status === 'completed');
  const backlogs = registrations.filter(r => r.status === 'backlog');
  const current = registrations.filter(r => r.status === 'registered');

  res.json({
    ...student,
    registrations,
    completedCourses: completed,
    backlogCourses: backlogs,
    currentCourses: current,
    gradeSheets,
    grades
  });
});

app.post('/api/students', (req, res) => {
  const { rollNo, name, address, coursesRegistered } = req.body;
  if (!rollNo || !name) return res.status(400).json({ error: 'Roll number and name are required' });

  try {
    db.prepare('INSERT INTO students (rollNo, name, address, coursesRegistered) VALUES (?, ?, ?, ?)').run(
      rollNo, name, address || '', coursesRegistered || ''
    );
    res.json({ success: true, rollNo });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────
// COURSES
// ─────────────────────────────────────────────
app.get('/api/courses', (req, res) => {
  const courses = db.prepare('SELECT * FROM courses ORDER BY courseId').all();
  res.json(courses);
});

app.post('/api/courses', (req, res) => {
  const { courseId, courseName, credits } = req.body;
  if (!courseId || !courseName) return res.status(400).json({ error: 'Course ID and name are required' });

  try {
    db.prepare('INSERT INTO courses (courseId, courseName, credits) VALUES (?, ?, ?)').run(
      courseId, courseName, credits || 3
    );
    res.json({ success: true, courseId });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────
// REGISTRATIONS (Activity Diagram + State Diagram)
// ─────────────────────────────────────────────
app.get('/api/registrations', (req, res) => {
  const { rollNo, semester } = req.query;
  let query = `
    SELECT r.*, s.name as studentName, c.courseName, c.credits
    FROM registrations r
    JOIN students s ON r.rollNo = s.rollNo
    JOIN courses c ON r.courseId = c.courseId
  `;
  const params = [];
  const conditions = [];

  if (rollNo) { conditions.push('r.rollNo = ?'); params.push(rollNo); }
  if (semester) { conditions.push('r.semester = ?'); params.push(semester); }
  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY r.semester DESC, s.name';

  res.json(db.prepare(query).all(...params));
});

app.post('/api/registrations', (req, res) => {
  const { rollNo, courseId, semester } = req.body;
  if (!rollNo || !courseId || !semester) return res.status(400).json({ error: 'All fields required' });

  // Activity Diagram: Check if course already completed
  const completed = db.prepare(
    "SELECT * FROM registrations WHERE rollNo = ? AND courseId = ? AND status = 'completed'"
  ).get(rollNo, courseId);

  if (completed) {
    return res.status(400).json({ error: 'Course already completed. Cannot re-register.' });
  }

  // Check if already registered for this semester
  const existing = db.prepare(
    "SELECT * FROM registrations WHERE rollNo = ? AND courseId = ? AND semester = ? AND status = 'registered'"
  ).get(rollNo, courseId, semester);

  if (existing) {
    return res.status(400).json({ error: 'Already registered for this course in this semester.' });
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    db.prepare('INSERT INTO registrations (rollNo, courseId, semester, registrationDate, status) VALUES (?, ?, ?, ?, ?)').run(
      rollNo, courseId, semester, today, 'registered'
    );
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────
// GRADES & GRADE SHEETS
// ─────────────────────────────────────────────
app.get('/api/grades', (req, res) => {
  const { rollNo, semester } = req.query;
  let query = `
    SELECT g.*, s.name as studentName, c.courseName, c.credits
    FROM grades g
    JOIN students s ON g.rollNo = s.rollNo
    JOIN courses c ON g.courseId = c.courseId
  `;
  const params = [];
  const conditions = [];

  if (rollNo) { conditions.push('g.rollNo = ?'); params.push(rollNo); }
  if (semester) { conditions.push('g.semester = ?'); params.push(semester); }
  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY g.semester DESC, s.name';

  res.json(db.prepare(query).all(...params));
});

app.post('/api/grades', (req, res) => {
  const { rollNo, courseId, semester, gradePoint } = req.body;
  if (!rollNo || !courseId || !semester || gradePoint === undefined) {
    return res.status(400).json({ error: 'All fields required' });
  }

  try {
    // Check if grade already exists for this combo
    const existing = db.prepare('SELECT * FROM grades WHERE rollNo = ? AND courseId = ? AND semester = ?').get(rollNo, courseId, semester);
    if (existing) {
      db.prepare('UPDATE grades SET gradePoint = ? WHERE rollNo = ? AND courseId = ? AND semester = ?').run(gradePoint, rollNo, courseId, semester);
    } else {
      db.prepare('INSERT INTO grades (rollNo, courseId, semester, gradePoint) VALUES (?, ?, ?, ?)').run(rollNo, courseId, semester, gradePoint);
    }

    // State Diagram: Update registration status based on grade
    // gradePoint >= 5.0 → completed, < 5.0 → backlog
    const newStatus = gradePoint >= 5.0 ? 'completed' : 'backlog';
    db.prepare("UPDATE registrations SET status = ? WHERE rollNo = ? AND courseId = ? AND semester = ?").run(newStatus, rollNo, courseId, semester);

    res.json({ success: true, status: newStatus });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Generate grade sheet (SGPA & CGPA)
app.get('/api/gradesheets/:rollNo', (req, res) => {
  const sheets = db.prepare('SELECT * FROM grade_sheets WHERE rollNo = ? ORDER BY semester DESC').all(req.params.rollNo);
  res.json(sheets);
});

app.post('/api/gradesheets/generate', (req, res) => {
  const { rollNo, semester } = req.body;
  if (!rollNo || !semester) return res.status(400).json({ error: 'Roll number and semester required' });

  // Get grades for this semester with credits
  const semGrades = db.prepare(`
    SELECT g.gradePoint, c.credits
    FROM grades g
    JOIN courses c ON g.courseId = c.courseId
    WHERE g.rollNo = ? AND g.semester = ?
  `).all(rollNo, semester);

  if (semGrades.length === 0) return res.status(400).json({ error: 'No grades found for this semester' });

  // Calculate SGPA: sum(gradePoint * credits) / sum(credits)
  let totalWeighted = 0;
  let totalCredits = 0;
  for (const g of semGrades) {
    totalWeighted += g.gradePoint * g.credits;
    totalCredits += g.credits;
  }
  const sgpa = parseFloat((totalWeighted / totalCredits).toFixed(2));

  // Calculate CGPA: average of all semester SGPAs including this one
  const allGrades = db.prepare(`
    SELECT g.gradePoint, c.credits
    FROM grades g
    JOIN courses c ON g.courseId = c.courseId
    WHERE g.rollNo = ?
  `).all(rollNo);

  let cumulativeWeighted = 0;
  let cumulativeCredits = 0;
  for (const g of allGrades) {
    cumulativeWeighted += g.gradePoint * g.credits;
    cumulativeCredits += g.credits;
  }
  const cgpa = parseFloat((cumulativeWeighted / cumulativeCredits).toFixed(2));

  // Upsert grade sheet
  const existing = db.prepare('SELECT * FROM grade_sheets WHERE rollNo = ? AND semester = ?').get(rollNo, semester);
  if (existing) {
    db.prepare('UPDATE grade_sheets SET sgpa = ?, cgpa = ? WHERE rollNo = ? AND semester = ?').run(sgpa, cgpa, rollNo, semester);
  } else {
    db.prepare('INSERT INTO grade_sheets (rollNo, semester, sgpa, cgpa) VALUES (?, ?, ?, ?)').run(rollNo, semester, sgpa, cgpa);
  }

  res.json({ success: true, sgpa, cgpa });
});

// ─────────────────────────────────────────────
// INVENTORY
// ─────────────────────────────────────────────
app.get('/api/inventory', (req, res) => {
  res.json(db.prepare('SELECT * FROM inventory_items ORDER BY itemName').all());
});

app.post('/api/inventory', (req, res) => {
  const { itemId, itemName, location, quantity } = req.body;
  if (!itemId || !itemName || !location) return res.status(400).json({ error: 'All fields required' });

  try {
    db.prepare('INSERT INTO inventory_items (itemId, itemName, location, quantity) VALUES (?, ?, ?, ?)').run(
      itemId, itemName, location, quantity || 1
    );
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/inventory/:itemId', (req, res) => {
  const { itemName, location, quantity } = req.body;
  try {
    db.prepare('UPDATE inventory_items SET itemName = ?, location = ?, quantity = ? WHERE itemId = ?').run(
      itemName, location, quantity, req.params.itemId
    );
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/inventory/:itemId', (req, res) => {
  db.prepare('DELETE FROM inventory_items WHERE itemId = ?').run(req.params.itemId);
  res.json({ success: true });
});

// ─────────────────────────────────────────────
// ACCOUNTS & TRANSACTIONS
// ─────────────────────────────────────────────
app.get('/api/accounts', (req, res) => {
  const account = db.prepare('SELECT * FROM department_account WHERE id = 1').get();
  res.json(account);
});

app.put('/api/accounts', (req, res) => {
  const { annualGrant, consultancyFunds } = req.body;
  const current = db.prepare('SELECT * FROM department_account WHERE id = 1').get();

  const newGrant = annualGrant !== undefined ? annualGrant : current.annualGrant;
  const newConsultancy = consultancyFunds !== undefined ? consultancyFunds : current.consultancyFunds;
  const newIncome = newGrant + newConsultancy;
  const newBalance = newIncome - current.expenditure;

  db.prepare('UPDATE department_account SET annualGrant = ?, consultancyFunds = ?, income = ?, balance = ? WHERE id = 1').run(
    newGrant, newConsultancy, newIncome, newBalance
  );
  res.json({ success: true });
});

app.get('/api/transactions', (req, res) => {
  res.json(db.prepare('SELECT * FROM transactions ORDER BY date DESC').all());
});

app.post('/api/transactions', (req, res) => {
  const { date, amount, type, description } = req.body;
  if (!date || !amount || !type || !description) return res.status(400).json({ error: 'All fields required' });

  try {
    db.prepare('INSERT INTO transactions (date, amount, type, description) VALUES (?, ?, ?, ?)').run(date, amount, type, description);

    // Update department account
    const account = db.prepare('SELECT * FROM department_account WHERE id = 1').get();
    if (type === 'income') {
      const newIncome = account.income + amount;
      const newBalance = newIncome - account.expenditure;
      db.prepare('UPDATE department_account SET income = ?, balance = ? WHERE id = 1').run(newIncome, newBalance);
    } else {
      const newExpenditure = account.expenditure + amount;
      const newBalance = account.income - newExpenditure;
      db.prepare('UPDATE department_account SET expenditure = ?, balance = ? WHERE id = 1').run(newExpenditure, newBalance);
    }

    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────
// FACULTY
// ─────────────────────────────────────────────
app.get('/api/faculty', (req, res) => {
  res.json(db.prepare('SELECT * FROM faculty ORDER BY name').all());
});

app.post('/api/faculty', (req, res) => {
  const { facultyId, name } = req.body;
  if (!facultyId || !name) return res.status(400).json({ error: 'All fields required' });

  try {
    db.prepare('INSERT INTO faculty (facultyId, name) VALUES (?, ?)').run(facultyId, name);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────
// RESEARCH PROJECTS
// ─────────────────────────────────────────────
app.get('/api/research-projects', (req, res) => {
  const projects = db.prepare(`
    SELECT rp.*, f.name as facultyName
    FROM research_projects rp
    LEFT JOIN faculty f ON rp.facultyId = f.facultyId
    ORDER BY rp.status, rp.title
  `).all();
  res.json(projects);
});

app.post('/api/research-projects', (req, res) => {
  const { projectId, title, fundingSource, status, facultyId } = req.body;
  if (!projectId || !title) return res.status(400).json({ error: 'Project ID and title required' });

  try {
    db.prepare('INSERT INTO research_projects (projectId, title, fundingSource, status, facultyId) VALUES (?, ?, ?, ?, ?)').run(
      projectId, title, fundingSource || '', status || 'ongoing', facultyId || null
    );
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────
// PUBLICATIONS
// ─────────────────────────────────────────────
app.get('/api/publications', (req, res) => {
  const pubs = db.prepare(`
    SELECT p.*, f.name as facultyName
    FROM publications p
    LEFT JOIN faculty f ON p.facultyId = f.facultyId
    ORDER BY p.publishedDate DESC
  `).all();
  res.json(pubs);
});

app.post('/api/publications', (req, res) => {
  const { title, journal, publishedDate, facultyId } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  try {
    db.prepare('INSERT INTO publications (title, journal, publishedDate, facultyId) VALUES (?, ?, ?, ?)').run(
      title, journal || '', publishedDate || new Date().toISOString().split('T')[0], facultyId || null
    );
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────
// DASHBOARD STATS
// ─────────────────────────────────────────────
app.get('/api/dashboard', (req, res) => {
  const studentCount = db.prepare('SELECT COUNT(*) as count FROM students').get().count;
  const courseCount = db.prepare('SELECT COUNT(*) as count FROM courses').get().count;
  const facultyCount = db.prepare('SELECT COUNT(*) as count FROM faculty').get().count;
  const inventoryCount = db.prepare('SELECT COUNT(*) as count FROM inventory_items').get().count;
  const projectCount = db.prepare("SELECT COUNT(*) as count FROM research_projects WHERE status = 'ongoing'").get().count;
  const publicationCount = db.prepare('SELECT COUNT(*) as count FROM publications').get().count;
  const account = db.prepare('SELECT * FROM department_account WHERE id = 1').get();
  const recentTransactions = db.prepare('SELECT * FROM transactions ORDER BY date DESC LIMIT 5').all();

  res.json({
    studentCount, courseCount, facultyCount, inventoryCount,
    projectCount, publicationCount, account, recentTransactions
  });
});

// Catch-all: serve the SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n  ╔══════════════════════════════════════════════╗`);
  console.log(`  ║  University Department Information System    ║`);
  console.log(`  ║  Running at http://localhost:${PORT}            ║`);
  console.log(`  ╚══════════════════════════════════════════════╝\n`);
});
