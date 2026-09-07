/* ==========================================================================
   NestKey — Smart PG/Hostel Management System
   Front-end only demo. All data lives in memory (resets on page reload)
   because this file is designed to also run inside sandboxed viewers that
   block localStorage. Swap `store` for real API calls in production.
   ========================================================================== */

/* ---------------------------------------------------------------------- *
 * 1. VERHOEFF CHECKSUM — the real algorithm UIDAI uses for Aadhaar numbers.
 *    This validates that a 12-digit number is STRUCTURALLY a valid Aadhaar
 *    (correct checksum digit). It cannot confirm the card is real, belongs
 *    to the applicant, or exists in UIDAI's database — that needs a live
 *    UIDAI/DigiLocker API call from a server, which a static front end
 *    can't do.
 * ---------------------------------------------------------------------- */
const VERHOEFF_D = [
  [0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],
  [3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],
  [6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],
  [9,8,7,6,5,4,3,2,1,0]
];
const VERHOEFF_P = [
  [0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],
  [8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],
  [2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8]
];

function verhoeffChecksumOk(numStr){
  let c = 0;
  const digits = numStr.split('').reverse().map(Number);
  for (let i = 0; i < digits.length; i++){
    c = VERHOEFF_D[c][VERHOEFF_P[i % 8][digits[i]]];
  }
  return c === 0;
}
function verhoeffGenerateCheckDigit(base11){
  let c = 0;
  const digits = base11.split('').reverse().map(Number);
  for (let i = 0; i < digits.length; i++){
    c = VERHOEFF_D[c][VERHOEFF_P[(i + 1) % 8][digits[i]]];
  }
  // find x such that d[c][p[0][x]] == 0
  for (let x = 0; x <= 9; x++){
    if (VERHOEFF_D[c][VERHOEFF_P[0][x]] === 0) return String(x);
  }
  return '0';
}

/* ---------------------------------------------------------------------- *
 * 2. FIELD-LEVEL VALIDATORS
 * ---------------------------------------------------------------------- */
const Validate = {
  name(v){
    v = (v || '').trim();
    if (v.length < 3) return { ok:false, msg:'Enter the full name (min 3 letters)' };
    if (!/^[A-Za-z][A-Za-z .]*$/.test(v)) return { ok:false, msg:'Letters and spaces only' };
    return { ok:true, msg:'Looks good' };
  },
  phone(v){
    v = (v || '').trim();
    if (!/^[6-9]\d{9}$/.test(v)) return { ok:false, msg:'Enter a valid 10-digit mobile number' };
    return { ok:true, msg:'Valid mobile number' };
  },
  password(v){
    if (!v || v.length < 6) return { ok:false, msg:'At least 6 characters' };
    return { ok:true, msg:'Strong enough' };
  },
  aadhaar(v){
    v = (v || '').trim();
    if (!/^\d{12}$/.test(v)) return { ok:false, msg:'Aadhaar must be exactly 12 digits' };
    if (/^0/.test(v) || /^1/.test(v)) return { ok:false, msg:'Aadhaar numbers do not start with 0 or 1' };
    if (/^(\d)\1{11}$/.test(v)) return { ok:false, msg:'That number looks fake — all digits repeat' };
    if (!verhoeffChecksumOk(v)) return { ok:false, msg:'Checksum failed — this is not a valid Aadhaar number' };
    return { ok:true, msg:'Format & checksum verified' };
  },
  file(fileList, kind){
    const f = fileList && fileList[0];
    if (!f) return { ok:false, msg:'Upload required' };
    const maxSize = 5 * 1024 * 1024;
    if (f.size > maxSize) return { ok:false, msg:'File too large — under 5 MB please' };
    const okTypes = kind === 'photo'
      ? ['image/jpeg','image/png','image/webp']
      : ['image/jpeg','image/png','image/webp','application/pdf'];
    if (!okTypes.includes(f.type)) return { ok:false, msg: kind === 'photo' ? 'Upload a JPG/PNG photo' : 'Upload a JPG, PNG or PDF' };
    return { ok:true, msg:`${f.name} — looks valid` };
  }
};

/* ---------------------------------------------------------------------- *
 * 3. IN-MEMORY DATA STORE (seeded with demo data)
 * ---------------------------------------------------------------------- */
const store = {
  currentResident: null,
  currentOwner: null,

  residents: [
    {
      id: 'R-1001', name: 'Ananya Rao', fatherName: 'Suresh Rao', phone: '9876543210',
      password: 'pass123', aadhaar: '234123412346', room: 'Room 204', sharing: 'Double sharing',
      moveIn: '2026-06-01', verification: 'verified',
      rentStatus: 'pending', rentAmount: 8500, rentDue: '5 Sep',
      attendancePct: 92, attendanceLog: [
        { date: 'Sep 6', status: 'Present' }, { date: 'Sep 5', status: 'Present' }, { date: 'Sep 4', status: 'Absent' }
      ],
      rentHistory: [
        { month: 'August 2026', amount: 8500, status: 'Paid' },
        { month: 'July 2026', amount: 8500, status: 'Paid' }
      ]
    }
  ],

  owner: {
    name: 'Ramesh Kumar', fatherName: 'Krishna Kumar', phone: '9000000001',
    password: 'owner123', pgName: 'Sunrise PG for Gents', location: 'Vijayawada'
  },

  rooms: [
    { id: 'Room 101', type: 'Single occupancy', capacity: 1, occupied: 1 },
    { id: 'Room 204', type: 'Double sharing', capacity: 2, occupied: 1 },
    { id: 'Room 305', type: 'Triple sharing', capacity: 3, occupied: 2 }
  ],

  bookingRequests: [],
  complaints: [
    { id: 'C-1', resident: 'Ananya Rao', category: 'Wi-Fi / Internet', description: 'Wi-Fi disconnects every night after 11 PM.', status: 'In Progress', date: 'Sep 4' }
  ],
  visitors: [
    { name: 'Suresh Rao', resident: 'Ananya Rao', purpose: 'Family visit', time: '11:20 AM' }
  ]
};

let nextResidentSeq = 1002;
let nextComplaintSeq = 2;

/* ---------------------------------------------------------------------- *
 * 4. NAVIGATION
 * ---------------------------------------------------------------------- */
const history_ = ['screen-splash'];

function showScreen(id, { replace = false } = {}){
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
  if (replace) history_[history_.length - 1] = id;
  else history_.push(id);
  window.scrollTo(0, 0);
}
function goBack(){
  if (history_.length > 1){
    history_.pop();
    const prev = history_[history_.length - 1];
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(prev).classList.add('active');
    window.scrollTo(0, 0);
  }
}
document.querySelectorAll('[data-back]').forEach(btn => btn.addEventListener('click', goBack));

document.getElementById('btn-get-started').addEventListener('click', () => showScreen('screen-role'));

document.querySelectorAll('.role-card').forEach(card => {
  card.addEventListener('click', () => {
    const role = card.dataset.role;
    showScreen(role === 'resident' ? 'screen-resident-auth' : 'screen-owner-auth');
  });
});

document.querySelectorAll('.dash-card, .wide-card').forEach(card => {
  card.addEventListener('click', () => showScreen('screen-' + card.dataset.goto));
});

/* ---------------------------------------------------------------------- *
 * 5. TABS (login / signup)
 * ---------------------------------------------------------------------- */
document.querySelectorAll('.tabs').forEach(tabs => {
  tabs.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const scope = tabs.parentElement;
      scope.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      scope.querySelector(`[data-panel="${tab.dataset.tab}"]`).classList.add('active');
    });
  });
});

/* ---------------------------------------------------------------------- *
 * 6. TOAST
 * ---------------------------------------------------------------------- */
let toastTimer;
function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

/* ---------------------------------------------------------------------- *
 * 7. RESIDENT SIGNUP — LIVE VERIFICATION PANEL
 * ---------------------------------------------------------------------- */
const signupForm = document.getElementById('form-resident-signup');
const verifyPanel = document.getElementById('resident-verify-panel');

// show a guaranteed-valid sample Aadhaar number as a hint
(function seedSample(){
  const base = '234123412340'.slice(0, 11);
  const check = verhoeffGenerateCheckDigit(base);
  document.getElementById('aadhaar-sample').textContent = `Try a valid sample: ${base}${check}`;
})();

function setRowState(name, result){
  const row = verifyPanel.querySelector(`[data-check="${name}"]`);
  if (!row) return;
  row.classList.remove('ok','bad');
  row.classList.add(result.ok ? 'ok' : 'bad');
  row.textContent = result.msg;
}
function setFieldError(form, name, msg){
  const el = form.querySelector(`[data-err="${name}"]`);
  if (el) el.textContent = msg || '';
}

function liveValidateField(name, value){
  let result;
  if (name === 'name' || name === 'fatherName') result = Validate.name(value);
  else if (name === 'phone') result = Validate.phone(value);
  else if (name === 'password') result = Validate.password(value);
  else if (name === 'aadhaar') result = Validate.aadhaar(value);
  else return;
  verifyPanel.hidden = false;
  setRowState(name, result);
  setFieldError(signupForm, name, result.ok ? '' : result.msg);
}

['name','fatherName','phone','aadhaar'].forEach(fieldName => {
  signupForm.querySelector(`[name="${fieldName}"]`).addEventListener('input', e => liveValidateField(fieldName, e.target.value));
});
signupForm.querySelector('[name="password"]').addEventListener('input', e => liveValidateField('password', e.target.value));

['aadhaarFile','photoFile'].forEach(inputName => {
  const input = signupForm.querySelector(`[name="${inputName}"]`);
  input.addEventListener('change', () => {
    const kind = inputName === 'photoFile' ? 'photo' : 'doc';
    const result = Validate.file(input.files, kind);
    const box = input.closest('.upload-box');
    box.classList.remove('has-file','has-error');
    box.classList.add(result.ok ? 'has-file' : 'has-error');
    box.querySelector('.upload-status').textContent = result.msg;
    verifyPanel.hidden = false;
    setRowState(inputName, result);
  });
});

/* ---------------------------------------------------------------------- *
 * 8. RESIDENT SIGNUP SUBMIT
 * ---------------------------------------------------------------------- */
signupForm.addEventListener('submit', e => {
  e.preventDefault();
  const fd = new FormData(signupForm);
  const values = Object.fromEntries(fd.entries());

  const checks = {
    name: Validate.name(values.name),
    fatherName: Validate.name(values.fatherName),
    phone: Validate.phone(values.phone),
    password: Validate.password(values.password),
    aadhaar: Validate.aadhaar(values.aadhaar),
    aadhaarFile: Validate.file(signupForm.aadhaarFile.files, 'doc'),
    photoFile: Validate.file(signupForm.photoFile.files, 'photo')
  };

  verifyPanel.hidden = false;
  Object.entries(checks).forEach(([k, r]) => setRowState(k, r));
  ['name','fatherName','phone','password','aadhaar'].forEach(k => setFieldError(signupForm, k, checks[k].ok ? '' : checks[k].msg));

  // Reflect file check results on the upload boxes even if the user
  // never touched the file input (so a skipped upload is visibly flagged).
  ['aadhaarFile','photoFile'].forEach(k => {
    const input = signupForm.querySelector(`[name="${k}"]`);
    const box = input.closest('.upload-box');
    box.classList.remove('has-file','has-error');
    box.classList.add(checks[k].ok ? 'has-file' : 'has-error');
    box.querySelector('.upload-status').textContent = checks[k].msg;
  });

  const fieldLabels = {
    name: 'Full name', fatherName: "Father's name", phone: 'Phone number',
    password: 'Password', aadhaar: 'Aadhaar number',
    aadhaarFile: 'Aadhaar upload', photoFile: 'Photo upload'
  };
  const failed = Object.entries(checks).filter(([, r]) => !r.ok).map(([k]) => fieldLabels[k]);

  if (!values.sharing || !values.moveIn){
    failed.push(!values.sharing ? 'Sharing type' : 'Move-in date');
  }

  if (failed.length){
    toast('Please fix: ' + failed.join(', '));
    verifyPanel.scrollIntoView({ behavior:'smooth', block:'center' });
    return;
  }

  if (store.residents.some(r => r.phone === values.phone)){
    toast('An account with this phone number already exists');
    return;
  }

  const sharingLabel = { single:'Single occupancy', double:'Double sharing', triple:'Triple sharing' }[values.sharing];
  const resident = {
    id: `R-${nextResidentSeq++}`,
    name: values.name.trim(),
    fatherName: values.fatherName.trim(),
    phone: values.phone,
    password: values.password,
    aadhaar: values.aadhaar,
    room: 'Awaiting assignment',
    sharing: sharingLabel,
    moveIn: values.moveIn,
    verification: 'pending',       // owner reviews documents before final approval
    rentStatus: 'pending', rentAmount: 8500, rentDue: 'TBD',
    attendancePct: 0, attendanceLog: [], rentHistory: []
  };
  store.residents.push(resident);
  store.bookingRequests.push({ residentId: resident.id, name: resident.name, sharing: sharingLabel, moveIn: values.moveIn, status: 'Pending' });

  toast('Account created — documents submitted for verification');
  signupForm.reset();
  verifyPanel.hidden = true;
  signupForm.querySelectorAll('.upload-box').forEach(b => { b.classList.remove('has-file','has-error'); });
  document.querySelector('[data-tab="resident-login"]').click();
});

/* ---------------------------------------------------------------------- *
 * 9. LOGIN HANDLERS
 * ---------------------------------------------------------------------- */
document.getElementById('form-resident-login').addEventListener('submit', e => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const phone = fd.get('phone'), password = fd.get('password');
  const resident = store.residents.find(r => r.phone === phone && r.password === password);
  if (!resident){ toast('No matching account — check phone/password'); return; }
  store.currentResident = resident;
  enterResidentDashboard(resident);
});

document.getElementById('form-owner-login').addEventListener('submit', e => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const phone = fd.get('phone'), password = fd.get('password');
  if (phone !== store.owner.phone || password !== store.owner.password){
    toast('No matching account — check phone/password'); return;
  }
  store.currentOwner = store.owner;
  enterOwnerDashboard();
});

document.getElementById('form-owner-signup').addEventListener('submit', e => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const values = Object.fromEntries(fd.entries());
  const checks = {
    name: Validate.name(values.name),
    fatherName: Validate.name(values.fatherName),
    phone: Validate.phone(values.phone),
    password: Validate.password(values.password)
  };
  Object.entries(checks).forEach(([k, r]) => setFieldError(e.target, k, r.ok ? '' : r.msg));
  if (!Object.values(checks).every(r => r.ok)){ toast('Please fix the highlighted fields'); return; }

  store.owner = { ...values };
  store.currentOwner = store.owner;
  toast('Owner account created');
  e.target.reset();
  enterOwnerDashboard();
});

document.getElementById('btn-resident-logout').addEventListener('click', () => {
  store.currentResident = null;
  history_.length = 0; history_.push('screen-splash');
  showScreen('screen-role', { replace:false });
});
document.getElementById('btn-owner-logout').addEventListener('click', () => {
  store.currentOwner = null;
  history_.length = 0; history_.push('screen-splash');
  showScreen('screen-role', { replace:false });
});

/* ---------------------------------------------------------------------- *
 * 10. RESIDENT DASHBOARD RENDERING
 * ---------------------------------------------------------------------- */
function verificationPill(status){
  if (status === 'verified') return `<span class="pill pill-success">Documents verified</span>`;
  if (status === 'rejected') return `<span class="pill pill-danger">Documents rejected</span>`;
  return `<span class="pill pill-warning">Verification pending</span>`;
}

function enterResidentDashboard(resident){
  document.getElementById('resident-name-label').textContent = resident.name;
  document.getElementById('resident-status-strip').innerHTML = verificationPill(resident.verification);
  renderResidentRent(resident);
  renderResidentAttendance(resident);
  renderResidentOwner();
  renderResidentComplaints(resident);
  renderResidentBooking(resident);
  history_.length = 0; history_.push('screen-splash', 'screen-role');
  showScreen('screen-resident-home');
}

function renderResidentRent(resident){
  const pill = document.getElementById('rent-status-pill');
  const isPaid = resident.rentStatus === 'paid';
  pill.textContent = isPaid ? 'Paid for this cycle' : 'Payment pending';
  pill.className = 'pill ' + (isPaid ? 'pill-success' : 'pill-warning');
  document.querySelector('#screen-resident-rent .rent-amount').innerHTML =
    `₹${resident.rentAmount.toLocaleString('en-IN')} <span class="rent-due">due ${resident.rentDue}</span>`;
  document.getElementById('btn-pay-rent').disabled = isPaid;
  document.getElementById('btn-pay-rent').textContent = isPaid ? 'Paid ✓' : 'Pay now';

  const list = document.getElementById('rent-history');
  list.innerHTML = resident.rentHistory.length
    ? resident.rentHistory.map(h => `
      <li class="list-item">
        <div class="li-top"><span class="li-title">${h.month}</span><span class="pill pill-success">${h.status}</span></div>
        <span class="li-meta">₹${h.amount.toLocaleString('en-IN')}</span>
      </li>`).join('')
    : `<li class="empty-note">No payment history yet</li>`;
}
document.getElementById('btn-pay-rent').addEventListener('click', () => {
  const r = store.currentResident; if (!r) return;
  r.rentStatus = 'paid';
  r.rentHistory.unshift({ month: 'September 2026', amount: r.rentAmount, status: 'Paid' });
  renderResidentRent(r);
  toast('Rent marked as paid (demo)');
});

function renderResidentAttendance(resident){
  document.getElementById('attendance-pct').textContent = resident.attendancePct + '%';
  document.getElementById('attendance-ring').style.background =
    `conic-gradient(var(--sky-500) 0 ${resident.attendancePct}%, var(--sky-100) ${resident.attendancePct}% 100%)`;
  const list = document.getElementById('attendance-history');
  list.innerHTML = resident.attendanceLog.length
    ? resident.attendanceLog.map(a => `
      <li class="list-item"><div class="li-top"><span class="li-title">${a.date}</span>
      <span class="pill ${a.status === 'Present' ? 'pill-success' : 'pill-danger'}">${a.status}</span></div></li>`).join('')
    : `<li class="empty-note">No attendance recorded yet</li>`;
}
document.getElementById('btn-mark-attendance').addEventListener('click', () => {
  const r = store.currentResident; if (!r) return;
  r.attendanceLog.unshift({ date: 'Today', status: 'Present' });
  const total = r.attendanceLog.length;
  const present = r.attendanceLog.filter(a => a.status === 'Present').length;
  r.attendancePct = Math.round((present / total) * 100);
  renderResidentAttendance(r);
  toast('Marked present for today');
});

function renderResidentOwner(){
  const o = store.owner;
  document.getElementById('ro-owner-name').textContent = o.name;
  document.getElementById('ro-pg-name').textContent = o.pgName || 'PG / Hostel';
  document.getElementById('ro-phone').textContent = o.phone;
  document.getElementById('ro-location').textContent = o.location || '—';
}

function renderResidentComplaints(resident){
  const list = document.getElementById('resident-complaint-list');
  const mine = store.complaints.filter(c => c.resident === resident.name);
  list.innerHTML = mine.length
    ? mine.map(c => `
      <li class="list-item">
        <div class="li-top"><span class="li-title">${c.category}</span>${statusPill(c.status)}</div>
        <span class="li-meta">${c.description}</span>
        <span class="li-meta">Filed ${c.date}</span>
      </li>`).join('')
    : `<li class="empty-note">You haven't raised any complaints yet</li>`;
}
function statusPill(status){
  const map = { 'Pending':'pill-warning', 'In Progress':'pill-neutral', 'Resolved':'pill-success' };
  return `<span class="pill ${map[status] || 'pill-neutral'}">${status}</span>`;
}
document.getElementById('form-complaint').addEventListener('submit', e => {
  e.preventDefault();
  const r = store.currentResident; if (!r) return;
  const fd = new FormData(e.target);
  store.complaints.unshift({
    id: `C-${nextComplaintSeq++}`,
    resident: r.name,
    category: fd.get('category'),
    description: fd.get('description').trim(),
    status: 'Pending',
    date: 'Today'
  });
  e.target.reset();
  renderResidentComplaints(r);
  toast('Complaint submitted to the owner');
});

function renderResidentBooking(resident){
  document.getElementById('rb-room').textContent = resident.room;
  document.getElementById('rb-sharing').textContent = resident.sharing;
  document.getElementById('rb-movein').textContent = resident.moveIn || '—';
}

/* ---------------------------------------------------------------------- *
 * 11. OWNER DASHBOARD RENDERING
 * ---------------------------------------------------------------------- */
function enterOwnerDashboard(){
  document.getElementById('owner-name-label').textContent = store.owner.name;
  const pending = store.residents.filter(r => r.verification === 'pending').length;
  document.getElementById('owner-status-strip').innerHTML =
    `<span class="pill pill-neutral">${store.residents.length} residents</span>` +
    (pending ? `<span class="pill pill-warning">${pending} awaiting verification</span>` : `<span class="pill pill-success">All documents reviewed</span>`);
  renderOwnerResidents();
  renderOwnerRent();
  renderOwnerAttendance();
  renderOwnerRooms();
  renderOwnerComplaints();
  renderOwnerDocuments();
  renderOwnerVisitors();
  history_.length = 0; history_.push('screen-splash', 'screen-role');
  showScreen('screen-owner-home');
}

function refreshOwnerStrip(){
  const pending = store.residents.filter(r => r.verification === 'pending').length;
  document.getElementById('owner-status-strip').innerHTML =
    `<span class="pill pill-neutral">${store.residents.length} residents</span>` +
    (pending ? `<span class="pill pill-warning">${pending} awaiting verification</span>` : `<span class="pill pill-success">All documents reviewed</span>`);
}

function renderOwnerResidents(){
  const list = document.getElementById('owner-resident-list');
  list.innerHTML = store.residents.map(r => `
    <li class="list-item">
      <div class="li-top"><span class="li-title">${r.name}</span>${verificationPill(r.verification)}</div>
      <span class="li-meta">${r.phone} · ${r.room} · ${r.sharing}</span>
      <span class="li-meta">Father's name: ${r.fatherName}</span>
    </li>`).join('') || `<li class="empty-note">No residents yet</li>`;
}

function renderOwnerRent(){
  const list = document.getElementById('owner-rent-list');
  list.innerHTML = store.residents.map(r => `
    <li class="list-item">
      <div class="li-top"><span class="li-title">${r.name}</span>
        <span class="pill ${r.rentStatus === 'paid' ? 'pill-success' : 'pill-warning'}">${r.rentStatus === 'paid' ? 'Paid' : 'Pending'}</span></div>
      <span class="li-meta">₹${r.rentAmount.toLocaleString('en-IN')} · due ${r.rentDue}</span>
      <div class="li-actions">
        <button class="btn-sm success" data-mark-paid="${r.id}" ${r.rentStatus === 'paid' ? 'disabled' : ''}>Mark as paid</button>
      </div>
    </li>`).join('') || `<li class="empty-note">No residents yet</li>`;
  list.querySelectorAll('[data-mark-paid]').forEach(btn => btn.addEventListener('click', () => {
    const r = store.residents.find(x => x.id === btn.dataset.markPaid);
    r.rentStatus = 'paid';
    r.rentHistory.unshift({ month: 'September 2026', amount: r.rentAmount, status: 'Paid' });
    renderOwnerRent();
    toast(`${r.name}'s rent marked as paid`);
  }));
}

function renderOwnerAttendance(){
  const list = document.getElementById('owner-attendance-list');
  list.innerHTML = store.residents.map(r => `
    <li class="list-item">
      <div class="li-top"><span class="li-title">${r.name}</span><span class="pill pill-neutral">${r.attendancePct}% this month</span></div>
      <div class="li-actions">
        <button class="btn-sm success" data-present="${r.id}">Mark present today</button>
        <button class="btn-sm danger" data-absent="${r.id}">Mark absent today</button>
      </div>
    </li>`).join('') || `<li class="empty-note">No residents yet</li>`;
  list.querySelectorAll('[data-present]').forEach(btn => btn.addEventListener('click', () => markAttendance(btn.dataset.present, 'Present')));
  list.querySelectorAll('[data-absent]').forEach(btn => btn.addEventListener('click', () => markAttendance(btn.dataset.absent, 'Absent')));
}
function markAttendance(id, status){
  const r = store.residents.find(x => x.id === id);
  r.attendanceLog.unshift({ date: 'Today', status });
  const total = r.attendanceLog.length;
  const present = r.attendanceLog.filter(a => a.status === 'Present').length;
  r.attendancePct = Math.round((present / total) * 100);
  renderOwnerAttendance();
  toast(`${r.name} marked ${status.toLowerCase()} for today`);
}

function renderOwnerRooms(){
  const roomList = document.getElementById('owner-room-list');
  roomList.innerHTML = store.rooms.map(room => `
    <li class="list-item">
      <div class="li-top"><span class="li-title">${room.id}</span><span class="pill pill-neutral">${room.occupied}/${room.capacity} occupied</span></div>
      <span class="li-meta">${room.type}</span>
    </li>`).join('');

  const reqList = document.getElementById('owner-booking-requests');
  const pending = store.bookingRequests.filter(b => b.status === 'Pending');
  reqList.innerHTML = pending.length
    ? pending.map((b, i) => `
      <li class="list-item">
        <div class="li-top"><span class="li-title">${b.name}</span><span class="pill pill-warning">Pending</span></div>
        <span class="li-meta">${b.sharing} · move-in ${b.moveIn}</span>
        <div class="li-actions">
          <button class="btn-sm success" data-approve="${b.residentId}">Approve</button>
          <button class="btn-sm danger" data-reject="${b.residentId}">Reject</button>
        </div>
      </li>`).join('')
    : `<li class="empty-note">No pending booking requests</li>`;
  reqList.querySelectorAll('[data-approve]').forEach(btn => btn.addEventListener('click', () => resolveBooking(btn.dataset.approve, true)));
  reqList.querySelectorAll('[data-reject]').forEach(btn => btn.addEventListener('click', () => resolveBooking(btn.dataset.reject, false)));
}
function resolveBooking(residentId, approve){
  const booking = store.bookingRequests.find(b => b.residentId === residentId);
  const resident = store.residents.find(r => r.id === residentId);
  if (!booking || !resident) return;
  booking.status = approve ? 'Approved' : 'Rejected';
  if (approve){
    const room = store.rooms.find(rm => rm.occupied < rm.capacity) || store.rooms[0];
    room.occupied = Math.min(room.capacity, room.occupied + 1);
    resident.room = room.id;
  }
  renderOwnerRooms();
  renderOwnerResidents();
  toast(`Booking ${approve ? 'approved' : 'rejected'} for ${resident.name}`);
}

function renderOwnerComplaints(){
  const list = document.getElementById('owner-complaint-list');
  list.innerHTML = store.complaints.length
    ? store.complaints.map(c => `
      <li class="list-item">
        <div class="li-top"><span class="li-title">${c.category}</span>${statusPill(c.status)}</div>
        <span class="li-meta">${c.resident} · filed ${c.date}</span>
        <span class="li-meta">${c.description}</span>
        <div class="li-actions">
          <select class="status-select" data-complaint="${c.id}">
            <option ${c.status==='Pending'?'selected':''}>Pending</option>
            <option ${c.status==='In Progress'?'selected':''}>In Progress</option>
            <option ${c.status==='Resolved'?'selected':''}>Resolved</option>
          </select>
        </div>
      </li>`).join('')
    : `<li class="empty-note">No complaints filed yet</li>`;
  list.querySelectorAll('[data-complaint]').forEach(sel => sel.addEventListener('change', () => {
    const c = store.complaints.find(x => x.id === sel.dataset.complaint);
    c.status = sel.value;
    renderOwnerComplaints();
    if (store.currentResident) renderResidentComplaints(store.currentResident);
    toast('Complaint status updated');
  }));
}

/* ---- Document verification (owner view): re-runs the same automated
   checks used at signup, then lets the owner confirm or reject manually. ---- */
function renderOwnerDocuments(){
  const list = document.getElementById('owner-document-list');
  list.innerHTML = store.residents.map(r => {
    const aadhaarCheck = Validate.aadhaar(r.aadhaar);
    return `
      <li class="list-item">
        <div class="li-top"><span class="li-title">${r.name}</span>${verificationPill(r.verification)}</div>
        <span class="li-meta">Aadhaar: ${r.aadhaar.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3')}</span>
        <span class="li-meta ${aadhaarCheck.ok ? '' : 'bad'}" style="color:${aadhaarCheck.ok ? 'var(--success)' : 'var(--danger)'}">
          Automated check: ${aadhaarCheck.msg}
        </span>
        <div class="li-actions">
          <button class="btn-sm success" data-verify="${r.id}" ${r.verification==='verified'?'disabled':''}>Mark verified</button>
          <button class="btn-sm danger" data-doc-reject="${r.id}" ${r.verification==='rejected'?'disabled':''}>Reject</button>
        </div>
      </li>`;
  }).join('') || `<li class="empty-note">No resident documents yet</li>`;

  list.querySelectorAll('[data-verify]').forEach(btn => btn.addEventListener('click', () => setVerification(btn.dataset.verify, 'verified')));
  list.querySelectorAll('[data-doc-reject]').forEach(btn => btn.addEventListener('click', () => setVerification(btn.dataset.docReject, 'rejected')));
}
function setVerification(id, status){
  const r = store.residents.find(x => x.id === id);
  r.verification = status;
  renderOwnerDocuments();
  renderOwnerResidents();
  refreshOwnerStrip();
  if (store.currentResident && store.currentResident.id === id){
    document.getElementById('resident-status-strip').innerHTML = verificationPill(status);
  }
  toast(`${r.name}'s documents marked as ${status}`);
}

function renderOwnerVisitors(){
  const list = document.getElementById('owner-visitor-list');
  list.innerHTML = store.visitors.length
    ? store.visitors.map(v => `
      <li class="list-item">
        <div class="li-top"><span class="li-title">${v.name}</span><span class="pill pill-neutral">${v.time}</span></div>
        <span class="li-meta">Visiting ${v.resident} · ${v.purpose}</span>
      </li>`).join('')
    : `<li class="empty-note">No visitors logged today</li>`;
}
document.getElementById('form-visitor').addEventListener('submit', e => {
  e.preventDefault();
  const fd = new FormData(e.target);
  store.visitors.unshift({
    name: fd.get('visitorName').trim(),
    resident: fd.get('residentName').trim(),
    purpose: fd.get('purpose').trim(),
    time: new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })
  });
  e.target.reset();
  renderOwnerVisitors();
  toast('Visitor entry logged');
});
