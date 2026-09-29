// ═══════════════════════════════════════════════════
// University Department Information System
// Client-side Application Logic
// ═══════════════════════════════════════════════════

const API = '';

// ── Utility Functions ──
async function api(endpoint, options = {}) {
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };
  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }
  const res = await fetch(`${API}${endpoint}`, config);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✓' : '✕'}</span> ${message}`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 3500);
}

function formatCurrency(val) {
  return '₹ ' + Number(val).toLocaleString('en-IN');
}

function badgeHTML(status) {
  return `<span class="badge badge-${status}">${status}</span>`;
}

// ── Navigation ──
const navItems = document.querySelectorAll('.nav-item');
const pages = document.querySelectorAll('.page-section');

function navigateTo(pageName) {
  navItems.forEach(n => n.classList.toggle('active', n.dataset.page === pageName));
  pages.forEach(p => p.classList.toggle('active', p.id === `page-${pageName}`));

  // Close mobile sidebar
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');

  // Load data for the page
  loadPageData(pageName);
}

navItems.forEach(item => {
  item.addEventListener('click', () => navigateTo(item.dataset.page));
});

// Mobile menu
document.getElementById('mobileToggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('open');
});
document.getElementById('sidebarOverlay').addEventListener('click', () => {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
});

// ── Page Data Loaders ──
async function loadPageData(page) {
  switch (page) {
    case 'dashboard':   await loadDashboard(); break;
    case 'students':    await loadStudents(); break;
    case 'courses':     await loadCourses(); break;
    case 'registrations': await loadRegistrations(); break;
    case 'grades':      await loadGrades(); break;
    case 'inventory':   await loadInventory(); break;
    case 'accounts':    await loadAccounts(); break;
    case 'faculty':     await loadFaculty(); break;
    case 'research':    await loadResearch(); break;
  }
}

// ══════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════
async function loadDashboard() {
  const data = await api('/api/dashboard');

  document.getElementById('dashboardStats').innerHTML = `
    <div class="stat-card">
      <div class="stat-icon">⊞</div>
      <div class="stat-value">${data.studentCount}</div>
      <div class="stat-label">Students</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">▤</div>
      <div class="stat-value">${data.courseCount}</div>
      <div class="stat-label">Courses</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">⊡</div>
      <div class="stat-value">${data.facultyCount}</div>
      <div class="stat-label">Faculty</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">▦</div>
      <div class="stat-value">${data.inventoryCount}</div>
      <div class="stat-label">Inventory Items</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">◇</div>
      <div class="stat-value">${data.projectCount}</div>
      <div class="stat-label">Active Projects</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">◆</div>
      <div class="stat-value">${data.publicationCount}</div>
      <div class="stat-label">Publications</div>
    </div>
  `;

  document.getElementById('dashboardTransactions').innerHTML = data.recentTransactions.map(t => `
    <tr>
      <td class="mono">${t.date}</td>
      <td>${t.description}</td>
      <td>${badgeHTML(t.type)}</td>
      <td class="amount ${t.type === 'income' ? 'positive' : 'negative'}">${t.type === 'income' ? '+' : '−'} ${formatCurrency(t.amount)}</td>
    </tr>
  `).join('');

  const a = data.account;
  document.getElementById('dashboardAccountSummary').innerHTML = `
    <div style="display:grid; gap:16px;">
      <div class="account-card">
        <div class="account-label">Annual Grant</div>
        <div class="account-value" style="color:var(--text-primary);">${formatCurrency(a.annualGrant)}</div>
      </div>
      <div class="account-card income">
        <div class="account-label">Total Income</div>
        <div class="account-value">${formatCurrency(a.income)}</div>
      </div>
      <div class="account-card expenditure">
        <div class="account-label">Total Expenditure</div>
        <div class="account-value">${formatCurrency(a.expenditure)}</div>
      </div>
      <div class="account-card balance">
        <div class="account-label">Balance</div>
        <div class="account-value">${formatCurrency(a.balance)}</div>
      </div>
    </div>
  `;
}

// ══════════════════════════════════
//  STUDENTS
// ══════════════════════════════════
async function loadStudents() {
  const students = await api('/api/students');
  document.getElementById('studentsTable').innerHTML = students.map(s => `
    <tr>
      <td class="mono">${s.rollNo}</td>
      <td>${s.name}</td>
      <td>${s.address || '—'}</td>
      <td><button class="btn btn-secondary btn-sm" onclick="queryStudent('${s.rollNo}')">View</button></td>
    </tr>
  `).join('');
}

async function queryStudent(rollNo) {
  try {
    const s = await api(`/api/students/${rollNo}`);
    const initials = s.name.split(' ').map(w => w[0]).join('').toUpperCase();

    let gradeSheetHTML = '';
    if (s.gradeSheets && s.gradeSheets.length > 0) {
      gradeSheetHTML = s.gradeSheets.map(gs => `
        <div class="grade-sheet-card">
          <div class="grade-sheet-header">
            <h3>Grade Sheet — ${gs.semester}</h3>
            <div class="gpa-badges">
              <div class="gpa-badge">
                <div class="gpa-label">SGPA</div>
                <div class="gpa-value">${gs.sgpa}</div>
              </div>
              <div class="gpa-badge">
                <div class="gpa-label">CGPA</div>
                <div class="gpa-value">${gs.cgpa}</div>
              </div>
            </div>
          </div>
          <table>
            <thead><tr><th>Course</th><th>Credits</th><th>Grade Point</th></tr></thead>
            <tbody>
              ${(s.grades || []).filter(g => g.semester === gs.semester).map(g => `
                <tr>
                  <td>${g.courseName} <span class="mono" style="color:var(--text-muted);">(${g.courseId})</span></td>
                  <td>${g.credits}</td>
                  <td class="mono">${g.gradePoint}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `).join('');
    }

    document.getElementById('studentDetail').style.display = 'block';
    document.getElementById('studentDetail').innerHTML = `
      <div class="student-detail">
        <div class="student-detail-header">
          <div class="student-avatar">${initials}</div>
          <div class="student-info">
            <h3>${s.name}</h3>
            <div class="roll-no">${s.rollNo}</div>
            <div class="address">${s.address || 'No address on file'}</div>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="document.getElementById('studentDetail').style.display='none'" style="margin-left:auto;">✕ Close</button>
        </div>
        <div class="student-courses-grid">
          <div class="course-group">
            <h4>✓ Completed</h4>
            <div class="count" style="color:var(--accent-green);">${s.completedCourses.length}</div>
            <ul>${s.completedCourses.map(c => `<li>${c.courseName} <span class="mono" style="color:var(--text-muted);">${c.courseId}</span></li>`).join('') || '<li style="color:var(--text-muted);">None</li>'}</ul>
          </div>
          <div class="course-group">
            <h4>⊕ Registered</h4>
            <div class="count" style="color:var(--accent-blue);">${s.currentCourses.length}</div>
            <ul>${s.currentCourses.map(c => `<li>${c.courseName} <span class="mono" style="color:var(--text-muted);">${c.courseId}</span></li>`).join('') || '<li style="color:var(--text-muted);">None</li>'}</ul>
          </div>
          <div class="course-group">
            <h4>⚠ Backlog</h4>
            <div class="count" style="color:var(--accent-crimson);">${s.backlogCourses.length}</div>
            <ul>${s.backlogCourses.map(c => `<li>${c.courseName} <span class="mono" style="color:var(--text-muted);">${c.courseId}</span></li>`).join('') || '<li style="color:var(--text-muted);">None</li>'}</ul>
          </div>
        </div>
      </div>
      ${gradeSheetHTML}
    `;

    // Scroll to detail
    document.getElementById('studentDetail').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (e) {
    showToast(e.message, 'error');
  }
}

document.getElementById('studentSearchBtn').addEventListener('click', () => {
  const rollNo = document.getElementById('studentSearchInput').value.trim();
  if (rollNo) queryStudent(rollNo);
});
document.getElementById('studentSearchInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const rollNo = e.target.value.trim();
    if (rollNo) queryStudent(rollNo);
  }
});

document.getElementById('addStudentForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api('/api/students', {
      method: 'POST',
      body: {
        rollNo: document.getElementById('sRollNo').value.trim(),
        name: document.getElementById('sName').value.trim(),
        address: document.getElementById('sAddress').value.trim(),
      }
    });
    showToast('Student added successfully');
    e.target.reset();
    await loadStudents();
    populateDropdowns();
  } catch (err) { showToast(err.message, 'error'); }
});

// ══════════════════════════════════
//  COURSES
// ══════════════════════════════════
async function loadCourses() {
  const courses = await api('/api/courses');
  document.getElementById('coursesTable').innerHTML = courses.map(c => `
    <tr>
      <td class="mono">${c.courseId}</td>
      <td>${c.courseName}</td>
      <td>${c.credits}</td>
    </tr>
  `).join('');
}

document.getElementById('addCourseForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api('/api/courses', {
      method: 'POST',
      body: {
        courseId: document.getElementById('cId').value.trim(),
        courseName: document.getElementById('cName').value.trim(),
        credits: parseInt(document.getElementById('cCredits').value),
      }
    });
    showToast('Course added successfully');
    e.target.reset();
    await loadCourses();
    populateDropdowns();
  } catch (err) { showToast(err.message, 'error'); }
});

// ══════════════════════════════════
//  REGISTRATIONS
// ══════════════════════════════════
async function loadRegistrations(filterRoll = '') {
  const query = filterRoll ? `?rollNo=${filterRoll}` : '';
  const regs = await api(`/api/registrations${query}`);
  document.getElementById('registrationsTable').innerHTML = regs.map(r => `
    <tr>
      <td class="mono">${r.rollNo}</td>
      <td>${r.studentName}</td>
      <td>${r.courseName} <span class="mono" style="color:var(--text-muted);">(${r.courseId})</span></td>
      <td>${r.semester}</td>
      <td class="mono">${r.registrationDate}</td>
      <td>${badgeHTML(r.status)}</td>
    </tr>
  `).join('');
}

document.getElementById('addRegistrationForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api('/api/registrations', {
      method: 'POST',
      body: {
        rollNo: document.getElementById('regRollNo').value,
        courseId: document.getElementById('regCourseId').value,
        semester: document.getElementById('regSemester').value.trim(),
      }
    });
    showToast('Registration successful');
    e.target.reset();
    await loadRegistrations();
  } catch (err) { showToast(err.message, 'error'); }
});

document.getElementById('regFilterBtn').addEventListener('click', () => {
  loadRegistrations(document.getElementById('regFilterRoll').value.trim());
});

// ══════════════════════════════════
//  GRADES
// ══════════════════════════════════
async function loadGrades() {
  const grades = await api('/api/grades');
  document.getElementById('gradesTable').innerHTML = grades.map(g => {
    const status = g.gradePoint >= 5.0 ? 'completed' : 'backlog';
    return `
      <tr>
        <td class="mono">${g.rollNo}</td>
        <td>${g.studentName}</td>
        <td>${g.courseName} <span class="mono" style="color:var(--text-muted);">(${g.courseId})</span></td>
        <td>${g.semester}</td>
        <td class="mono">${g.gradePoint}</td>
        <td>${badgeHTML(status)}</td>
      </tr>
    `;
  }).join('');
}

document.getElementById('addGradeForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const result = await api('/api/grades', {
      method: 'POST',
      body: {
        rollNo: document.getElementById('grRollNo').value,
        courseId: document.getElementById('grCourseId').value,
        semester: document.getElementById('grSemester').value.trim(),
        gradePoint: parseFloat(document.getElementById('grGradePoint').value),
      }
    });
    showToast(`Grade submitted — registration status: ${result.status}`);
    e.target.reset();
    await loadGrades();
  } catch (err) { showToast(err.message, 'error'); }
});

document.getElementById('generateGradeSheetForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const result = await api('/api/gradesheets/generate', {
      method: 'POST',
      body: {
        rollNo: document.getElementById('gsRollNo').value,
        semester: document.getElementById('gsSemester').value.trim(),
      }
    });
    document.getElementById('gradeSheetResult').innerHTML = `
      <div style="display:flex; gap:16px;">
        <div class="gpa-badge" style="flex:1; text-align:center; padding:16px; background:var(--bg-surface); border:1px solid var(--border-dim); border-radius:var(--radius-md);">
          <div class="gpa-label">SGPA</div>
          <div class="gpa-value">${result.sgpa}</div>
        </div>
        <div class="gpa-badge" style="flex:1; text-align:center; padding:16px; background:var(--bg-surface); border:1px solid var(--border-dim); border-radius:var(--radius-md);">
          <div class="gpa-label">CGPA</div>
          <div class="gpa-value">${result.cgpa}</div>
        </div>
      </div>
    `;
    showToast('Grade sheet generated successfully');
  } catch (err) { showToast(err.message, 'error'); }
});

// ══════════════════════════════════
//  INVENTORY
// ══════════════════════════════════
async function loadInventory() {
  const items = await api('/api/inventory');
  document.getElementById('inventoryTable').innerHTML = items.map(i => `
    <tr>
      <td class="mono">${i.itemId}</td>
      <td>${i.itemName}</td>
      <td>${i.location}</td>
      <td>${i.quantity}</td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="deleteInventory('${i.itemId}')">Delete</button>
      </td>
    </tr>
  `).join('');
}

document.getElementById('addInventoryForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api('/api/inventory', {
      method: 'POST',
      body: {
        itemId: document.getElementById('invId').value.trim(),
        itemName: document.getElementById('invName').value.trim(),
        location: document.getElementById('invLocation').value.trim(),
        quantity: parseInt(document.getElementById('invQuantity').value),
      }
    });
    showToast('Inventory item added');
    e.target.reset();
    await loadInventory();
  } catch (err) { showToast(err.message, 'error'); }
});

async function deleteInventory(itemId) {
  if (!confirm('Delete this inventory item?')) return;
  try {
    await api(`/api/inventory/${itemId}`, { method: 'DELETE' });
    showToast('Item deleted');
    await loadInventory();
  } catch (err) { showToast(err.message, 'error'); }
}

// ══════════════════════════════════
//  ACCOUNTS
// ══════════════════════════════════
async function loadAccounts() {
  const account = await api('/api/accounts');
  document.getElementById('accountSummary').innerHTML = `
    <div class="account-card">
      <div class="account-label">Annual Grant</div>
      <div class="account-value" style="color:var(--text-primary);">${formatCurrency(account.annualGrant)}</div>
    </div>
    <div class="account-card">
      <div class="account-label">Consultancy Funds</div>
      <div class="account-value" style="color:var(--text-primary);">${formatCurrency(account.consultancyFunds)}</div>
    </div>
    <div class="account-card income">
      <div class="account-label">Total Income</div>
      <div class="account-value">${formatCurrency(account.income)}</div>
    </div>
    <div class="account-card expenditure">
      <div class="account-label">Total Expenditure</div>
      <div class="account-value">${formatCurrency(account.expenditure)}</div>
    </div>
    <div class="account-card balance">
      <div class="account-label">Balance</div>
      <div class="account-value">${formatCurrency(account.balance)}</div>
    </div>
  `;

  // Pre-fill grants form
  document.getElementById('accGrant').value = account.annualGrant;
  document.getElementById('accConsultancy').value = account.consultancyFunds;

  // Load transactions
  const txs = await api('/api/transactions');
  document.getElementById('transactionsTable').innerHTML = txs.map(t => `
    <tr>
      <td class="mono">${t.date}</td>
      <td>${t.description}</td>
      <td>${badgeHTML(t.type)}</td>
      <td class="amount ${t.type === 'income' ? 'positive' : 'negative'}">${t.type === 'income' ? '+' : '−'} ${formatCurrency(t.amount)}</td>
    </tr>
  `).join('');
}

document.getElementById('updateGrantsForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api('/api/accounts', {
      method: 'PUT',
      body: {
        annualGrant: parseFloat(document.getElementById('accGrant').value),
        consultancyFunds: parseFloat(document.getElementById('accConsultancy').value),
      }
    });
    showToast('Grants updated');
    await loadAccounts();
  } catch (err) { showToast(err.message, 'error'); }
});

document.getElementById('addTransactionForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api('/api/transactions', {
      method: 'POST',
      body: {
        date: document.getElementById('txDate').value,
        amount: parseFloat(document.getElementById('txAmount').value),
        type: document.getElementById('txType').value,
        description: document.getElementById('txDesc').value.trim(),
      }
    });
    showToast('Transaction recorded');
    e.target.reset();
    await loadAccounts();
  } catch (err) { showToast(err.message, 'error'); }
});

// ══════════════════════════════════
//  FACULTY
// ══════════════════════════════════
async function loadFaculty() {
  const faculty = await api('/api/faculty');
  document.getElementById('facultyTable').innerHTML = faculty.map(f => `
    <tr>
      <td class="mono">${f.facultyId}</td>
      <td>${f.name}</td>
    </tr>
  `).join('');
}

document.getElementById('addFacultyForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api('/api/faculty', {
      method: 'POST',
      body: {
        facultyId: document.getElementById('facId').value.trim(),
        name: document.getElementById('facName').value.trim(),
      }
    });
    showToast('Faculty added');
    e.target.reset();
    await loadFaculty();
    populateDropdowns();
  } catch (err) { showToast(err.message, 'error'); }
});

// ══════════════════════════════════
//  RESEARCH & PUBLICATIONS
// ══════════════════════════════════
async function loadResearch() {
  const projects = await api('/api/research-projects');
  document.getElementById('researchTable').innerHTML = projects.map(p => `
    <tr>
      <td class="mono">${p.projectId}</td>
      <td>${p.title}</td>
      <td>${p.fundingSource || '—'}</td>
      <td>${p.facultyName || '—'}</td>
      <td>${badgeHTML(p.status)}</td>
    </tr>
  `).join('');

  const pubs = await api('/api/publications');
  document.getElementById('publicationsTable').innerHTML = pubs.map(p => `
    <tr>
      <td>${p.title}</td>
      <td>${p.journal || '—'}</td>
      <td class="mono">${p.publishedDate || '—'}</td>
      <td>${p.facultyName || '—'}</td>
    </tr>
  `).join('');
}

document.getElementById('addResearchForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api('/api/research-projects', {
      method: 'POST',
      body: {
        projectId: document.getElementById('rpId').value.trim(),
        title: document.getElementById('rpTitle').value.trim(),
        fundingSource: document.getElementById('rpFunding').value.trim(),
        status: document.getElementById('rpStatus').value,
        facultyId: document.getElementById('rpFaculty').value || null,
      }
    });
    showToast('Research project added');
    e.target.reset();
    await loadResearch();
  } catch (err) { showToast(err.message, 'error'); }
});

document.getElementById('addPublicationForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api('/api/publications', {
      method: 'POST',
      body: {
        title: document.getElementById('pubTitle').value.trim(),
        journal: document.getElementById('pubJournal').value.trim(),
        publishedDate: document.getElementById('pubDate').value || null,
        facultyId: document.getElementById('pubFaculty').value || null,
      }
    });
    showToast('Publication added');
    e.target.reset();
    await loadResearch();
  } catch (err) { showToast(err.message, 'error'); }
});

// ══════════════════════════════════
//  POPULATE DROPDOWNS
// ══════════════════════════════════
async function populateDropdowns() {
  const students = await api('/api/students');
  const courses = await api('/api/courses');
  const faculty = await api('/api/faculty');

  // Student dropdowns
  const studentSelects = ['regRollNo', 'grRollNo', 'gsRollNo'];
  studentSelects.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const current = el.value;
    el.innerHTML = '<option value="">Select student…</option>' +
      students.map(s => `<option value="${s.rollNo}">${s.rollNo} — ${s.name}</option>`).join('');
    el.value = current;
  });

  // Course dropdowns
  const courseSelects = ['regCourseId', 'grCourseId'];
  courseSelects.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const current = el.value;
    el.innerHTML = '<option value="">Select course…</option>' +
      courses.map(c => `<option value="${c.courseId}">${c.courseId} — ${c.courseName}</option>`).join('');
    el.value = current;
  });

  // Faculty dropdowns
  const facultySelects = ['rpFaculty', 'pubFaculty'];
  facultySelects.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const current = el.value;
    el.innerHTML = '<option value="">Select faculty…</option>' +
      faculty.map(f => `<option value="${f.facultyId}">${f.name}</option>`).join('');
    el.value = current;
  });
}

// ══════════════════════════════════
//  INIT
// ══════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  await populateDropdowns();
  await loadDashboard();
});
