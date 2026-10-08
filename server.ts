import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { db, initMongo, User, Notice, Exam, EventItem, EventRegistration, ResourceItem, LostFoundItem, DirectoryContact, HelpdeskInquiry } from './src/server/db.js';
import { generateToken, hashPassword, comparePassword, authenticate, optionalAuth, requireAdmin, AuthRequest } from './src/server/auth.js';
import { summarizeNotice, askCampusAssistant } from './src/server/ai.js';
import { sendOtpEmail, verifyOtpCode } from './src/server/email.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();
let isAppConfigured = false;

export async function configureApp() {
  if (isAppConfigured) return app;
  isAppConfigured = true;
  await initMongo();

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // CORS headers
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // ----------------------------------------------------
  // HEALTH CHECK
  // ----------------------------------------------------
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'CampusOS API',
      institution: 'City University, Bangladesh',
      campus: 'Khagan, Birulia, Savar, Dhaka',
      timestamp: new Date().toISOString(),
    });
  });

  // ----------------------------------------------------
  // AUTHENTICATION & EMAIL OTP ROUTES
  // ----------------------------------------------------

  // Step 1: Initiate Login -> checks password and sends 6-digit OTP to Gmail
  app.post('/api/auth/send-login-otp', async (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const state = db.getState();
    const user = state.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user || !comparePassword(password, user.passwordHash)) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Please verify your email and password.' });
    }

    const emailResult = await sendOtpEmail(user.email, 'LOGIN', user.name);
    res.json({
      success: true,
      message: emailResult.message || `A 6-digit verification code has been sent to ${user.email}.`,
      email: user.email,
      demoOtp: emailResult.code,
    });
  });

  // Step 2: Verify Login OTP
  app.post('/api/auth/verify-login-otp', (req: Request, res: Response) => {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP code are required' });
    }

    const isValid = verifyOtpCode(email, otp, 'LOGIN');
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid or expired OTP code. Please check your email inbox.' });
    }

    const state = db.getState();
    const user = state.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found' });
    }

    const token = generateToken(user);
    const { passwordHash: _, ...safeUser } = user;
    res.json({ success: true, token, user: safeUser, message: 'OTP verified. Successfully logged in!' });
  });

  // Direct login endpoint (fallback & instant demo)
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const state = db.getState();
    const user = state.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user || !comparePassword(password, user.passwordHash)) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Please verify email and password.' });
    }

    const token = generateToken(user);
    const { passwordHash: _, ...safeUser } = user;
    res.json({ success: true, token, user: safeUser });
  });

  // Send Registration OTP
  app.post('/api/auth/send-register-otp', async (req: Request, res: Response) => {
    const { name, email, password, department } = req.body;
    if (!name || !email || !password || !department) {
      return res.status(400).json({ success: false, message: 'Please fill in all required fields' });
    }

    const state = db.getState();
    const existing = state.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists' });
    }

    const emailResult = await sendOtpEmail(email, 'REGISTER', name);
    res.json({
      success: true,
      message: emailResult.message || `A 6-digit verification code has been sent to ${email}.`,
      demoOtp: emailResult.code,
    });
  });

  // Complete Registration with OTP (Always default role STUDENT)
  app.post('/api/auth/verify-register-otp', (req: Request, res: Response) => {
    const { name, email, password, department, batch, section, studentId, otp } = req.body;
    if (!name || !email || !password || !department || !otp) {
      return res.status(400).json({ success: false, message: 'All fields and OTP are required' });
    }

    const isValid = verifyOtpCode(email, otp, 'REGISTER');
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid or expired OTP code. Please check your email inbox.' });
    }

    const state = db.getState();
    const existing = state.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists' });
    }

    // Default role is strictly STUDENT for every registered university member!
    const isAdminEmail = email.toLowerCase() === 'admin@cityuniversity.ac.bd' || email.toLowerCase() === 'sahinfdr89@gmail.com';
    const role = isAdminEmail ? 'ADMIN' : 'STUDENT';

    const newUser: User = {
      id: `usr_${Date.now()}`,
      name,
      email: email.toLowerCase(),
      passwordHash: hashPassword(password),
      role,
      department,
      batch: batch || '65',
      section: section || 'B',
      studentId: studentId || `213-15-${Math.floor(1000 + Math.random() * 9000)}`,
      savedNotices: [],
      savedExams: [],
      savedResources: [],
      rsvps: [],
      createdAt: new Date().toISOString(),
    };

    state.users.push(newUser);
    db.save();

    const token = generateToken(newUser);
    const { passwordHash: _, ...safeUser } = newUser;
    res.status(201).json({ success: true, token, user: safeUser, message: 'Account verified and registered successfully!' });
  });

  // Forgot Password: Step 1 - Send Reset OTP
  app.post('/api/auth/send-forgot-otp', async (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Please enter your registered email' });
    }

    const state = db.getState();
    const user = state.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account registered with this email address' });
    }

    const emailResult = await sendOtpEmail(user.email, 'FORGOT_PASSWORD', user.name);
    res.json({
      success: true,
      message: emailResult.message || `Password reset OTP has been sent to ${user.email}.`,
      demoOtp: emailResult.code,
    });
  });

  // Forgot Password: Step 2 - Verify OTP & Set New Password
  app.post('/api/auth/reset-password', (req: Request, res: Response) => {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email, OTP, and new password are required' });
    }

    const isValid = verifyOtpCode(email, otp, 'FORGOT_PASSWORD');
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid or expired OTP code. Please check your email inbox.' });
    }

    const state = db.getState();
    const user = state.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found' });
    }

    user.passwordHash = hashPassword(newPassword);
    db.save();

    res.json({ success: true, message: 'Password has been reset successfully! You can now log in.' });
  });

  app.get('/api/auth/me', authenticate, (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { passwordHash: _, ...safeUser } = req.user;
    res.json({ success: true, user: safeUser });
  });

  // Update profile / avatar
  app.put('/api/auth/profile', authenticate, (req: AuthRequest, res: Response) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const state = db.getState();
    const userIndex = state.users.findIndex((u) => u.id === req.user!.id);
    if (userIndex === -1) return res.status(404).json({ success: false, message: 'User not found' });

    const { name, avatarUrl, studentId, batch, section, department } = req.body;
    const user = state.users[userIndex];
    if (name) user.name = name.trim();
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
    if (studentId !== undefined) user.studentId = studentId;
    if (batch !== undefined) user.batch = batch;
    if (section !== undefined) user.section = section;
    if (department !== undefined) user.department = department;

    db.save();
    const { passwordHash: _, ...safeUser } = user;
    res.json({ success: true, user: safeUser, message: 'Profile updated successfully!' });
  });

  // Helper for batch matching
  function matchesBatch(itemBatch: string | undefined, queryBatch: string | undefined): boolean {
    if (!queryBatch || queryBatch === 'All' || queryBatch === 'All Batches' || queryBatch === 'undefined') return true;
    if (!itemBatch || itemBatch === 'All' || itemBatch === 'All Batches') return true;
    const qb = String(queryBatch).replace(/\D/g, '');
    const ib = String(itemBatch).replace(/\D/g, '');
    if (qb && ib && qb === ib) return true;
    return String(itemBatch).toLowerCase().includes(String(queryBatch).toLowerCase());
  }

  // Helper for section matching
  function matchesSection(itemSection: string | undefined, querySection: string | undefined): boolean {
    if (!querySection || querySection === 'All' || querySection === 'All Sections' || querySection === 'undefined') return true;
    if (!itemSection || itemSection === 'All' || itemSection === 'All Sections') return true;
    return String(itemSection).trim().toLowerCase() === String(querySection).trim().toLowerCase() || String(itemSection).toLowerCase().includes(String(querySection).toLowerCase());
  }

  // Comprehensive search text builder for any campus entity
  function getSearchCorpus(item: any): (string | undefined)[] {
    const b = item.batch ? String(item.batch) : '';
    const s = item.section ? String(item.section) : '';
    return [
      item.title,
      item.description,
      item.category,
      item.department,
      item.course,
      item.courseCode,
      item.club,
      item.host,
      item.location,
      item.notes,
      item.semester,
      item.uploadedBy,
      b,
      b ? `Batch ${b}` : '',
      b ? `Batch-${b}` : '',
      b ? `${b} Batch` : '',
      b ? `${b}th Batch` : '',
      s,
      s ? `Section ${s}` : '',
      s ? `Sec ${s}` : '',
      s ? `Sec-${s}` : '',
      b && s ? `${b}${s}` : '',
      b && s ? `${b}-${s}` : '',
      b && s ? `${b} ${s}` : '',
      b && s ? `Batch ${b} Section ${s}` : '',
      b && s ? `Batch ${b} Sec ${s}` : '',
      b && s ? `Batch ${b}-${s}` : '',
      b && s ? `${b} Batch ${s} Section` : '',
      b && s ? `${b} Batch Sec ${s}` : '',
      b && s ? `CSE ${b}${s}` : '',
      b && s ? `CSE-${b}${s}` : '',
      b && s ? `CSE ${b} ${s}` : '',
    ];
  }

  // Helper for smart search matching
  function matchesSearchText(textList: (string | undefined)[], search: string): boolean {
    if (!search || search === 'undefined' || !search.trim()) return true;
    const cleanSearch = search.toLowerCase().trim();
    const searchNoSpace = cleanSearch.replace(/[\s\-_]+/g, '');

    const combined = textList.filter(Boolean).join(' ').toLowerCase();
    const combinedNoSpace = combined.replace(/[\s\-_]+/g, '');

    if (combined.includes(cleanSearch) || combinedNoSpace.includes(searchNoSpace)) return true;

    // Check if search has patterns like "65b", "65-b", "65 b", "batch 65", "65 batch"
    const batchSectionMatch = cleanSearch.match(/(\d+)\s*[-_]?\s*([a-zA-Z])/);
    if (batchSectionMatch) {
      const [, bNum, sChar] = batchSectionMatch;
      const hasBatch = combined.includes(bNum);
      const hasSection = combined.includes(sChar.toLowerCase()) || combined.includes(`sec ${sChar.toLowerCase()}`) || combined.includes(`section ${sChar.toLowerCase()}`);
      if (hasBatch && (hasSection || combined.includes('all sections') || !combined.includes('section'))) return true;
    }

    const words = cleanSearch.split(/[\s\-_,]+/).filter((w) => w.length > 0);
    if (words.length > 0 && words.every((w) => combined.includes(w) || combinedNoSpace.includes(w))) return true;

    return false;
  }

  // ----------------------------------------------------
  // NOTICES
  // ----------------------------------------------------
  app.get('/api/notices', (req: Request, res: Response) => {
    const { category, department, batch, section, search, priority, verified } = req.query;
    let list = [...db.getState().notices];

    if (category && category !== 'All' && category !== 'undefined') {
      list = list.filter((n) => n.category && n.category.toLowerCase() === String(category).toLowerCase());
    }
    if (department && department !== 'All' && department !== 'undefined') {
      const deptStr = String(department).toLowerCase();
      list = list.filter((n) => !n.department || n.department === 'All Departments' || n.department.toLowerCase().includes(deptStr));
    }
    if (batch && batch !== 'All' && batch !== 'undefined') {
      list = list.filter((n) => matchesBatch(n.batch, String(batch)));
    }
    if (section && section !== 'All' && section !== 'undefined') {
      list = list.filter((n) => matchesSection(n.section, String(section)));
    }
    if (priority && priority !== 'All' && priority !== 'undefined') {
      list = list.filter((n) => n.priority === priority);
    }
    if (verified === 'true') {
      list = list.filter((n) => n.verified);
    }
    if (search && search !== 'undefined' && String(search).trim() !== '') {
      list = list.filter((n) => matchesSearchText(getSearchCorpus(n), String(search)));
    }

    // Sort by priority then publishedAt desc
    const priorityWeight: Record<string, number> = { URGENT: 3, IMPORTANT: 2, NORMAL: 1 };
    list.sort((a, b) => {
      const pDiff = (priorityWeight[b.priority] || 1) - (priorityWeight[a.priority] || 1);
      if (pDiff !== 0) return pDiff;
      return new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime();
    });

    res.json({ success: true, data: list });
  });

  app.get('/api/notices/:id', (req: Request, res: Response) => {
    const notice = db.getState().notices.find((n) => n.id === req.params.id);
    if (!notice) return res.status(404).json({ success: false, message: 'Notice not found' });
    notice.views += 1;
    db.save();
    res.json({ success: true, data: notice });
  });

  app.post('/api/notices', requireAdmin, (req: AuthRequest, res: Response) => {
    const { title, description, category, department, batch, section, deadline, sourceUrl, sourceType, verified, priority, actionPrompt, actionUrl } = req.body;
    if (!title || !description || !category) {
      return res.status(400).json({ success: false, message: 'Title, description, and category are required' });
    }

    const newNotice: Notice = {
      id: `not_${Date.now()}`,
      title,
      description,
      category,
      department: department || 'All Departments',
      batch: batch || 'All Batches',
      section: section || 'All Sections',
      publishedAt: new Date().toISOString().split('T')[0],
      deadline,
      sourceUrl: sourceUrl || 'https://cityuniversity.ac.bd/notices',
      sourceType: sourceType || 'OFFICIAL_CITY_UNIVERSITY',
      verified: verified !== false,
      priority: priority || 'NORMAL',
      actionPrompt,
      actionUrl,
      createdBy: req.user?.name || 'Registrar Office',
      views: 0,
    };

    db.getState().notices.unshift(newNotice);
    db.save();
    res.status(201).json({ success: true, data: newNotice });
  });

  app.put('/api/notices/:id', requireAdmin, (req: Request, res: Response) => {
    const notice = db.getState().notices.find((n) => n.id === req.params.id);
    if (!notice) return res.status(404).json({ success: false, message: 'Notice not found' });

    Object.assign(notice, req.body);
    db.save();
    res.json({ success: true, data: notice });
  });

  app.delete('/api/notices/:id', requireAdmin, (req: Request, res: Response) => {
    const idx = db.getState().notices.findIndex((n) => n.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Notice not found' });
    db.getState().notices.splice(idx, 1);
    db.save();
    res.json({ success: true, message: 'Notice deleted successfully' });
  });

  app.post('/api/notices/:id/toggle-save', authenticate, (req: AuthRequest, res: Response) => {
    const user = req.user!;
    if (!user.savedNotices) user.savedNotices = [];
    const id = req.params.id;
    const isSaved = user.savedNotices.includes(id);
    if (isSaved) {
      user.savedNotices = user.savedNotices.filter((nId) => nId !== id);
    } else {
      user.savedNotices.push(id);
    }
    db.save();
    res.json({ success: true, saved: !isSaved, savedNotices: user.savedNotices });
  });

  // ----------------------------------------------------
  // EXAMS
  // ----------------------------------------------------
  app.get('/api/exams', (req: Request, res: Response) => {
    const { department, batch, section, examType, search } = req.query;
    let list = [...db.getState().exams];

    if (department && department !== 'All' && department !== 'undefined') {
      const deptStr = String(department).toLowerCase();
      list = list.filter((e) => e.department && (e.department === 'All Departments' || e.department.toLowerCase().includes(deptStr)));
    }
    if (batch && batch !== 'All' && batch !== 'undefined') {
      list = list.filter((e) => matchesBatch(e.batch, String(batch)));
    }
    if (section && section !== 'All' && section !== 'undefined') {
      list = list.filter((e) => matchesSection(e.section, String(section)));
    }
    if (examType && examType !== 'All' && examType !== 'undefined') {
      list = list.filter((e) => e.examType && e.examType.toLowerCase() === String(examType).toLowerCase());
    }
    if (search && search !== 'undefined' && String(search).trim() !== '') {
      list = list.filter((e) => matchesSearchText(getSearchCorpus(e), String(search)));
    }

    list.sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
    res.json({ success: true, data: list });
  });

  app.post('/api/exams', requireAdmin, (req: Request, res: Response) => {
    const { course, courseCode, department, batch, section, examType, date, time, location, sourceUrl, verified, notes } = req.body;
    if (!course || !courseCode || !date || !time) {
      return res.status(400).json({ success: false, message: 'Course, code, date, and time are required' });
    }

    const newExam: Exam = {
      id: `ex_${Date.now()}`,
      course,
      courseCode,
      department: department || 'Computer Science & Engineering',
      batch: batch || 'All Batches',
      section: section || 'All Sections',
      examType: examType || 'Final',
      date,
      time,
      location: location || 'Academic Building 1, Khagan Campus',
      sourceUrl: sourceUrl || 'https://cityuniversity.ac.bd/exams',
      verified: verified !== false,
      notes,
    };

    db.getState().exams.unshift(newExam);
    db.save();
    res.status(201).json({ success: true, data: newExam });
  });

  app.put('/api/exams/:id', requireAdmin, (req: Request, res: Response) => {
    const exam = db.getState().exams.find((e) => e.id === req.params.id);
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });
    Object.assign(exam, req.body);
    db.save();
    res.json({ success: true, data: exam });
  });

  app.delete('/api/exams/:id', requireAdmin, (req: Request, res: Response) => {
    const idx = db.getState().exams.findIndex((e) => e.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Exam not found' });
    db.getState().exams.splice(idx, 1);
    db.save();
    res.json({ success: true, message: 'Exam routine item deleted' });
  });

  app.post('/api/exams/:id/toggle-save', authenticate, (req: AuthRequest, res: Response) => {
    const user = req.user!;
    if (!user.savedExams) user.savedExams = [];
    const id = req.params.id;
    const isSaved = user.savedExams.includes(id);
    if (isSaved) {
      user.savedExams = user.savedExams.filter((eId) => eId !== id);
    } else {
      user.savedExams.push(id);
    }
    db.save();
    res.json({ success: true, saved: !isSaved, savedExams: user.savedExams });
  });

  // ----------------------------------------------------
  // EVENTS & REGISTRATION / RSVP & QR CHECK-IN
  // ----------------------------------------------------
  app.get('/api/events', (req: Request, res: Response) => {
    const { category, club, department, batch, section, timeline, eventType, upcoming, search } = req.query;
    let list = [...db.getState().events];

    const today = new Date().toISOString().split('T')[0];

    // Timeline filtering
    if (timeline === 'today') {
      list = list.filter((e) => e.date === today);
    } else if (timeline === 'this-week') {
      const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      list = list.filter((e) => e.date >= today && e.date <= in7Days);
    } else if (timeline === 'this-month') {
      const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      list = list.filter((e) => e.date >= today && e.date <= in30Days);
    } else if (timeline === 'upcoming' || upcoming === 'true') {
      list = list.filter((e) => !e.date || e.date >= today);
    } else if (timeline === 'past') {
      list = list.filter((e) => e.date && e.date < today);
    }

    // Event format (Physical / Online / Hybrid)
    if (eventType && eventType !== 'All' && eventType !== 'undefined') {
      list = list.filter((e) => e.eventType && e.eventType.toUpperCase() === String(eventType).toUpperCase());
    }

    if (category && category !== 'All' && category !== 'undefined') {
      list = list.filter((e) => e.category && e.category.toLowerCase() === String(category).toLowerCase());
    }
    if (club && club !== 'All' && club !== 'undefined') {
      list = list.filter((e) => e.club && e.club.toLowerCase().includes(String(club).toLowerCase()));
    }
    if (department && department !== 'All' && department !== 'undefined') {
      const deptStr = String(department).toLowerCase();
      list = list.filter((e) => !e.department || e.department === 'All Departments' || e.department.toLowerCase().includes(deptStr));
    }
    if (batch && batch !== 'All' && batch !== 'undefined') {
      list = list.filter((e) => matchesBatch(e.batch, String(batch)));
    }
    if (section && section !== 'All' && section !== 'undefined') {
      list = list.filter((e) => matchesSection(e.section, String(section)));
    }
    if (search && search !== 'undefined' && String(search).trim() !== '') {
      list = list.filter((e) => matchesSearchText(getSearchCorpus(e), String(search)));
    }

    list.sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
    res.json({ success: true, data: list });
  });

  // User's own registered event tickets
  app.get('/api/events/my/registrations', authenticate, (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const registrations = (db.getState().eventRegistrations || []).filter((r) => r.userId === userId);
    const events = db.getState().events;

    const ticketsWithEvent = registrations.map((reg) => {
      const event = events.find((e) => e.id === reg.eventId);
      return {
        ...reg,
        event,
      };
    });

    res.json({ success: true, data: ticketsWithEvent });
  });

  app.get('/api/events/:id', (req: Request, res: Response) => {
    const event = db.getState().events.find((e) => e.id === req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    const regs = (db.getState().eventRegistrations || []).filter((r) => r.eventId === req.params.id);
    const checkedInCount = regs.filter((r) => r.checkedIn).length;
    res.json({ success: true, data: { ...event, totalRegistrations: regs.length, checkedInCount } });
  });

  // Get all registered attendees for an event (for Admin & Door Staff)
  app.get('/api/events/:id/attendees', authenticate, (req: AuthRequest, res: Response) => {
    const event = db.getState().events.find((e) => e.id === req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    const registrations = (db.getState().eventRegistrations || []).filter((r) => r.eventId === req.params.id);
    const checkedInCount = registrations.filter((r) => r.checkedIn).length;

    res.json({
      success: true,
      data: {
        event,
        registrations,
        stats: {
          total: registrations.length,
          checkedIn: checkedInCount,
          pending: registrations.length - checkedInCount,
          maxCapacity: event.maxCapacity || 0,
        },
      },
    });
  });

  app.post('/api/events', requireAdmin, (req: AuthRequest, res: Response) => {
    const { title, description, club, host, department, batch, section, date, time, location, category, eventType, onlineMeetingUrl, maxCapacity, registrationDeadline, sourceUrl, sourceType, verified, bannerImage } = req.body;
    if (!title || !description || !date || !time) {
      return res.status(400).json({ success: false, message: 'Title, description, date, and time are required' });
    }

    const newEvent: EventItem = {
      id: `evt_${Date.now()}`,
      title,
      description,
      club: club || 'City University General',
      host: host || 'CampusOS Community',
      department: department || 'All Departments',
      batch: batch || 'All Batches',
      section: section || 'All Sections',
      date,
      time,
      location: location || 'Khagan Permanent Campus',
      category: category || 'Workshop',
      eventType: eventType || (location?.toLowerCase().includes('online') ? 'ONLINE' : 'PHYSICAL'),
      onlineMeetingUrl,
      maxCapacity: maxCapacity ? parseInt(String(maxCapacity), 10) : undefined,
      registrationDeadline,
      sourceUrl: sourceUrl || 'https://cityuniversity.ac.bd/events',
      sourceType: sourceType || 'OFFICIAL_CITY_UNIVERSITY',
      verified: verified !== false,
      attendeesCount: 0,
      attendees: [],
      createdBy: req.user?.name || 'Administrator',
      bannerImage,
    };

    db.getState().events.unshift(newEvent);
    db.save();
    res.status(201).json({ success: true, data: newEvent });
  });

  app.put('/api/events/:id', requireAdmin, (req: Request, res: Response) => {
    const event = db.getState().events.find((e) => e.id === req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    Object.assign(event, req.body);
    db.save();
    res.json({ success: true, data: event });
  });

  app.delete('/api/events/:id', requireAdmin, (req: Request, res: Response) => {
    const idx = db.getState().events.findIndex((e) => e.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Event not found' });
    db.getState().events.splice(idx, 1);
    // clean up registrations
    if (db.getState().eventRegistrations) {
      db.getState().eventRegistrations = db.getState().eventRegistrations.filter((r) => r.eventId !== req.params.id);
    }
    db.save();
    res.json({ success: true, message: 'Event deleted successfully' });
  });

  // Enhanced RSVP / Registration with Scannable QR Ticket Generation
  app.post('/api/events/:id/rsvp', authenticate, (req: AuthRequest, res: Response) => {
    const event = db.getState().events.find((e) => e.id === req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    const user = req.user!;
    const userId = user.id;
    if (!event.attendees) event.attendees = [];
    if (!user.rsvps) user.rsvps = [];
    if (!db.getState().eventRegistrations) db.getState().eventRegistrations = [];

    const existingRegIdx = db.getState().eventRegistrations.findIndex((r) => r.eventId === event.id && r.userId === userId);
    const isRsvped = event.attendees.includes(userId) || existingRegIdx !== -1;

    if (isRsvped) {
      // Unregister / Cancel RSVP
      event.attendees = event.attendees.filter((uid) => uid !== userId);
      event.attendeesCount = Math.max(0, event.attendeesCount - 1);
      user.rsvps = user.rsvps.filter((eid) => eid !== event.id);
      if (existingRegIdx !== -1) {
        db.getState().eventRegistrations.splice(existingRegIdx, 1);
      }
      db.save();
      return res.json({ success: true, rsvped: false, count: event.attendeesCount, message: 'Registration cancelled' });
    } else {
      // Register & Generate Ticket Code
      const shortId = event.id.replace('evt_', '').slice(-4).toUpperCase();
      const rand = Math.floor(1000 + Math.random() * 9000);
      const ticketCode = `CU-EVT-${shortId}-${rand}`;

      const { participationType, notes } = req.body || {};

      const newRegistration: EventRegistration = {
        id: `reg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        ticketCode,
        eventId: event.id,
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        studentId: user.studentId || 'N/A',
        department: user.department || event.department || 'City University',
        batch: user.batch || '65',
        section: user.section || 'B',
        registeredAt: new Date().toISOString(),
        checkedIn: false,
        participationType: participationType || (event.eventType === 'ONLINE' ? 'ONLINE' : 'IN_PERSON'),
        notes: notes || undefined,
      };

      db.getState().eventRegistrations.push(newRegistration);
      event.attendees.push(userId);
      event.attendeesCount += 1;
      user.rsvps.push(event.id);
      db.save();

      return res.json({
        success: true,
        rsvped: true,
        count: event.attendeesCount,
        registration: newRegistration,
        ticketCode,
        message: `Registered successfully! Your Ticket Pass code is ${ticketCode}.`,
      });
    }
  });

  // Check-In Endpoint (Used by Admin / Door Scanner)
  app.post('/api/events/check-in', authenticate, (req: AuthRequest, res: Response) => {
    const { ticketCode, eventId, searchCode } = req.body;
    const query = String(ticketCode || searchCode || '').trim();

    if (!query) {
      return res.status(400).json({ success: false, message: 'Please provide a valid ticket code or QR payload' });
    }

    const state = db.getState();
    if (!state.eventRegistrations) state.eventRegistrations = [];

    // Match by exact ticketCode, or partial ticket code, or student ID
    const reg = state.eventRegistrations.find((r) => {
      const codeMatch = r.ticketCode.toLowerCase() === query.toLowerCase();
      const idMatch = r.studentId && r.studentId.toLowerCase() === query.toLowerCase();
      const eventMatch = !eventId || r.eventId === eventId;
      return (codeMatch || idMatch) && eventMatch;
    });

    if (!reg) {
      return res.status(404).json({
        success: false,
        message: `No matching registration found for "${query}". Please check the ticket number.`,
      });
    }

    const event = state.events.find((e) => e.id === reg.eventId);

    if (reg.checkedIn) {
      return res.json({
        success: true,
        alreadyCheckedIn: true,
        registration: reg,
        event,
        message: `Already Checked-In on ${new Date(reg.checkedInAt || '').toLocaleTimeString()} for ${reg.userName} (${reg.studentId}).`,
      });
    }

    // Mark as Checked-In
    reg.checkedIn = true;
    reg.checkedInAt = new Date().toISOString();
    db.save();

    return res.json({
      success: true,
      alreadyCheckedIn: false,
      registration: reg,
      event,
      message: `Checked-In Successfully! Welcome ${reg.userName} (${reg.studentId}) to ${event?.title || 'the event'}.`,
    });
  });

  // Admin Manual Toggle of Check-In
  app.post('/api/events/toggle-attendee-checkin', requireAdmin, (req: Request, res: Response) => {
    const { registrationId } = req.body;
    if (!registrationId) {
      return res.status(400).json({ success: false, message: 'Registration ID is required' });
    }

    const state = db.getState();
    const reg = (state.eventRegistrations || []).find((r) => r.id === registrationId);
    if (!reg) return res.status(404).json({ success: false, message: 'Registration record not found' });

    reg.checkedIn = !reg.checkedIn;
    reg.checkedInAt = reg.checkedIn ? new Date().toISOString() : undefined;
    db.save();

    res.json({
      success: true,
      registration: reg,
      message: reg.checkedIn ? `Attendee marked as Checked In` : `Attendee check-in status revoked`,
    });
  });

  // ----------------------------------------------------
  // CLUBS
  // ----------------------------------------------------
  app.get('/api/clubs', (_req: Request, res: Response) => {
    res.json({ success: true, data: db.getState().clubs });
  });

  app.get('/api/clubs/:id', (req: Request, res: Response) => {
    const club = db.getState().clubs.find((c) => c.id === req.params.id || c.code.toLowerCase() === req.params.id.toLowerCase());
    if (!club) return res.status(404).json({ success: false, message: 'Club not found' });
    res.json({ success: true, data: club });
  });

  // ----------------------------------------------------
  // RESOURCES HUB
  // ----------------------------------------------------
  app.get('/api/resources', (req: Request, res: Response) => {
    const { department, batch, section, category, search, courseCode } = req.query;
    let list = [...db.getState().resources];

    if (department && department !== 'All' && department !== 'undefined') {
      const deptStr = String(department).toLowerCase();
      list = list.filter((r) => r.department && (r.department === 'All Departments' || r.department.toLowerCase().includes(deptStr)));
    }
    if (batch && batch !== 'All' && batch !== 'undefined') {
      list = list.filter((r) => matchesBatch(r.batch, String(batch)));
    }
    if (section && section !== 'All' && section !== 'undefined') {
      list = list.filter((r) => matchesSection(r.section, String(section)));
    }
    if (category && category !== 'All' && category !== 'undefined') {
      list = list.filter((r) => r.category && r.category.toLowerCase() === String(category).toLowerCase());
    }
    if (courseCode && courseCode !== 'undefined' && String(courseCode).trim() !== '') {
      const cCode = String(courseCode).toLowerCase().replace(/\s+/g, '');
      list = list.filter((r) => r.courseCode && r.courseCode.toLowerCase().replace(/\s+/g, '') === cCode);
    }
    if (search && search !== 'undefined' && String(search).trim() !== '') {
      list = list.filter((r) => matchesSearchText(getSearchCorpus(r), String(search)));
    }

    res.json({ success: true, data: list });
  });

  app.post('/api/resources', authenticate, (req: AuthRequest, res: Response) => {
    const { title, description, department, batch, section, course, courseCode, semester, category, resourceUrl, fileSize } = req.body;
    if (!title || !department || !course || !resourceUrl) {
      return res.status(400).json({ success: false, message: 'Title, department, course name, and resource URL are required' });
    }

    const newRes: ResourceItem = {
      id: `res_${Date.now()}`,
      title,
      description: description || 'Academic course material shared on CampusOS.',
      department,
      batch: batch || 'All Batches',
      section: section || 'All Sections',
      course,
      courseCode: courseCode || 'GEN 101',
      semester: semester || 'Current Trimester',
      category: category || 'Notes',
      resourceUrl,
      fileSize: fileSize || 'PDF / External Doc',
      verified: req.user?.role === 'ADMIN',
      uploadedBy: req.user?.name || 'Student Contributor',
      uploadedByRole: req.user?.role || 'STUDENT',
      downloadCount: 1,
      createdAt: new Date().toISOString().split('T')[0],
    };

    db.getState().resources.unshift(newRes);
    db.save();
    res.status(201).json({ success: true, data: newRes });
  });

  app.post('/api/resources/:id/download', (req: Request, res: Response) => {
    const item = db.getState().resources.find((r) => r.id === req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Resource not found' });
    item.downloadCount += 1;
    db.save();
    res.json({ success: true, downloadCount: item.downloadCount, resourceUrl: item.resourceUrl });
  });

  app.post('/api/resources/:id/toggle-save', authenticate, (req: AuthRequest, res: Response) => {
    const user = req.user!;
    if (!user.savedResources) user.savedResources = [];
    const id = req.params.id;
    const isSaved = user.savedResources.includes(id);
    if (isSaved) {
      user.savedResources = user.savedResources.filter((rId) => rId !== id);
    } else {
      user.savedResources.push(id);
    }
    db.save();
    res.json({ success: true, saved: !isSaved, savedResources: user.savedResources });
  });

  app.delete('/api/resources/:id', requireAdmin, (req: Request, res: Response) => {
    const idx = db.getState().resources.findIndex((r) => r.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Resource not found' });
    db.getState().resources.splice(idx, 1);
    db.save();
    res.json({ success: true, message: 'Resource deleted' });
  });

  // ----------------------------------------------------
  // HELP DESK & FAQS & BUS SCHEDULES
  // ----------------------------------------------------
  app.get('/api/faqs', (req: Request, res: Response) => {
    const { category, search } = req.query;
    let list = [...db.getState().faqs];
    if (category && category !== 'All' && category !== 'undefined') {
      list = list.filter((f) => f.category && f.category.toLowerCase() === String(category).toLowerCase());
    }
    if (search && search !== 'undefined' && String(search).trim() !== '') {
      const q = String(search).toLowerCase().trim();
      list = list.filter((f) => (f.question && f.question.toLowerCase().includes(q)) || (f.answer && f.answer.toLowerCase().includes(q)));
    }
    res.json({ success: true, data: list });
  });

  app.get('/api/bus-schedules', (_req: Request, res: Response) => {
    res.json({ success: true, data: db.getState().busSchedules });
  });

  app.post('/api/bus-schedules', requireAdmin, (req: Request, res: Response) => {
    const { routeName, routeNumber, departurePoint, destination, morningDepTime, returnDepTime, viaPoints, status, contactPerson } = req.body;
    if (!routeName || !departurePoint || !destination) {
      return res.status(400).json({ success: false, message: 'Route name, departure point, and destination are required' });
    }

    const newBus = {
      id: `bus_${Date.now()}`,
      routeName,
      routeNumber: routeNumber || 'CU Shuttle',
      departurePoint,
      destination,
      viaPoints: Array.isArray(viaPoints) ? viaPoints : [departurePoint, 'Birulia', destination],
      morningDepTime: morningDepTime || '07:30 AM',
      returnDepTime: returnDepTime || '04:30 PM',
      status: status || 'Normal',
      contactPerson: contactPerson || 'Transport Desk (01711-000000)',
    };

    db.getState().busSchedules.unshift(newBus as any);
    db.save();
    res.status(201).json({ success: true, data: newBus });
  });

  app.delete('/api/bus-schedules/:id', requireAdmin, (req: Request, res: Response) => {
    const idx = db.getState().busSchedules.findIndex((b) => b.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Bus schedule not found' });
    db.getState().busSchedules.splice(idx, 1);
    db.save();
    res.json({ success: true, message: 'Bus schedule removed' });
  });

  // ----------------------------------------------------
  // LOST & FOUND
  // ----------------------------------------------------
  app.get('/api/lost-found', (req: Request, res: Response) => {
    const { type, status } = req.query;
    let list = [...db.getState().lostFound];
    if (type && type !== 'All' && type !== 'undefined') {
      list = list.filter((item) => item.type === type);
    }
    if (status && status !== 'All' && status !== 'undefined') {
      list = list.filter((item) => item.status === status);
    }
    res.json({ success: true, data: list });
  });

  app.post('/api/lost-found', authenticate, (req: AuthRequest, res: Response) => {
    const { type, title, description, location, date, category, contactMethod, contactName, imageUrl } = req.body;
    if (!type || !title || !location) {
      return res.status(400).json({ success: false, message: 'Type, title, and location are required' });
    }

    const item: LostFoundItem = {
      id: `lf_${Date.now()}`,
      type: type === 'LOST' ? 'LOST' : 'FOUND',
      title,
      description: description || '',
      location,
      date: date || new Date().toISOString().split('T')[0],
      category: category || 'Other',
      contactMethod: contactMethod || 'Inquire at campus security desk',
      contactName: contactName || req.user?.name || 'Student',
      status: 'OPEN',
      reportedBy: req.user?.id || 'usr_anonymous',
      createdAt: new Date().toISOString(),
      imageUrl,
    };

    db.getState().lostFound.unshift(item);
    db.save();
    res.status(201).json({ success: true, data: item });
  });

  app.put('/api/lost-found/:id/resolve', authenticate, (req: Request, res: Response) => {
    const item = db.getState().lostFound.find((i) => i.id === req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    item.status = 'RESOLVED';
    db.save();
    res.json({ success: true, data: item });
  });

  app.delete('/api/lost-found/:id', requireAdmin, (req: Request, res: Response) => {
    const idx = db.getState().lostFound.findIndex((i) => i.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Item not found' });
    db.getState().lostFound.splice(idx, 1);
    db.save();
    res.json({ success: true, message: 'Item removed' });
  });

  // ----------------------------------------------------
  // CAMPUS DIRECTORY & FACULTY
  // ----------------------------------------------------
  app.get('/api/directory', (req: Request, res: Response) => {
    const { department, category, search } = req.query;
    let list = [...(db.getState().directory || [])];

    if (department && department !== 'All' && department !== 'undefined') {
      const deptStr = String(department).toLowerCase();
      list = list.filter((c) => c.department.toLowerCase().includes(deptStr) || deptStr.includes(c.department.toLowerCase()));
    }

    if (category && category !== 'All' && category !== 'undefined') {
      list = list.filter((c) => c.category === category);
    }

    if (search && String(search).trim()) {
      const q = String(search).toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.designation.toLowerCase().includes(q) ||
          c.department.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          c.officeLocation.toLowerCase().includes(q)
      );
    }

    res.json({ success: true, data: list });
  });

  app.post('/api/directory', requireAdmin, (req: Request, res: Response) => {
    const { name, designation, department, category, email, phone, officeLocation, availableHours, avatarUrl } = req.body;
    if (!name || !designation || !department) {
      return res.status(400).json({ success: false, message: 'Name, designation, and department are required' });
    }

    const newContact: DirectoryContact = {
      id: `dir_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      designation: designation.trim(),
      department: department.trim(),
      category: category || 'FACULTY',
      email: email ? email.trim() : 'info@cityuniversity.ac.bd',
      phone: phone ? phone.trim() : '+880 1711-000000',
      officeLocation: officeLocation ? officeLocation.trim() : 'Permanent Campus, Ashulia',
      availableHours: availableHours ? availableHours.trim() : undefined,
      avatarUrl: avatarUrl || undefined,
    };

    if (!db.getState().directory) db.getState().directory = [];
    db.getState().directory.unshift(newContact);
    db.save();

    res.status(201).json({ success: true, data: newContact, message: `${newContact.name} added to Campus Directory!` });
  });

  app.put('/api/directory/:id', requireAdmin, (req: Request, res: Response) => {
    const state = db.getState();
    if (!state.directory) state.directory = [];
    const contact = state.directory.find((c) => c.id === req.params.id);
    if (!contact) return res.status(404).json({ success: false, message: 'Contact not found' });

    const { name, designation, department, category, email, phone, officeLocation, availableHours, avatarUrl } = req.body;
    if (name) contact.name = name.trim();
    if (designation) contact.designation = designation.trim();
    if (department) contact.department = department.trim();
    if (category) contact.category = category;
    if (email !== undefined) contact.email = email.trim();
    if (phone !== undefined) contact.phone = phone.trim();
    if (officeLocation !== undefined) contact.officeLocation = officeLocation.trim();
    if (availableHours !== undefined) contact.availableHours = availableHours.trim();
    if (avatarUrl !== undefined) contact.avatarUrl = avatarUrl;

    db.save();
    res.json({ success: true, data: contact, message: 'Directory contact updated successfully!' });
  });

  app.delete('/api/directory/:id', requireAdmin, (req: Request, res: Response) => {
    const state = db.getState();
    if (!state.directory) state.directory = [];
    const idx = state.directory.findIndex((c) => c.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Contact not found' });

    state.directory.splice(idx, 1);
    db.save();
    res.json({ success: true, message: 'Directory contact removed successfully' });
  });

  // ----------------------------------------------------
  // HELPDESK INQUIRIES & STUDENT TICKETS
  // ----------------------------------------------------
  app.get('/api/helpdesk/inquiries', authenticate, (req: AuthRequest, res: Response) => {
    const state = db.getState();
    if (!state.helpdeskInquiries) state.helpdeskInquiries = [];

    const { status, search } = req.query;
    let list = [...state.helpdeskInquiries];

    // If student, show only their own tickets
    if (req.user?.role !== 'ADMIN') {
      list = list.filter((inq) => inq.userId === req.user?.id || inq.userEmail.toLowerCase() === req.user?.email.toLowerCase());
    }

    if (status && status !== 'All' && status !== 'undefined') {
      list = list.filter((inq) => inq.status === status);
    }

    if (search && String(search).trim()) {
      const q = String(search).toLowerCase();
      list = list.filter(
        (inq) =>
          inq.subject.toLowerCase().includes(q) ||
          inq.details.toLowerCase().includes(q) ||
          inq.studentId.toLowerCase().includes(q) ||
          inq.userName.toLowerCase().includes(q) ||
          inq.category.toLowerCase().includes(q)
      );
    }

    // Sort newest first
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ success: true, data: list });
  });

  app.post('/api/helpdesk/inquiries', authenticate, (req: AuthRequest, res: Response) => {
    const { subject, details, category, department, studentId, attachmentUrl } = req.body;
    if (!subject || !details) {
      return res.status(400).json({ success: false, message: 'Subject and inquiry details are required' });
    }

    const randId = Math.floor(1000 + Math.random() * 9000);
    const newInquiry: HelpdeskInquiry = {
      id: `inq_${Date.now()}_${randId}`,
      userId: req.user?.id,
      userName: req.user?.name || 'City University Student',
      userEmail: req.user?.email || 'student@cityuniversity.ac.bd',
      studentId: studentId || req.user?.studentId || '213-15-4921',
      department: department || req.user?.department || 'Computer Science & Engineering',
      category: category || 'Academic Advising',
      subject: subject.trim(),
      details: details.trim(),
      attachmentUrl: attachmentUrl || undefined,
      status: 'OPEN',
      createdAt: new Date().toISOString(),
    };

    const state = db.getState();
    if (!state.helpdeskInquiries) state.helpdeskInquiries = [];
    state.helpdeskInquiries.unshift(newInquiry);
    db.save();

    res.status(201).json({
      success: true,
      data: newInquiry,
      message: `Inquiry Ticket #${newInquiry.id.slice(-6).toUpperCase()} submitted successfully! Admin and department advisors have been notified.`,
    });
  });

  app.post('/api/helpdesk/inquiries/:id/reply', requireAdmin, (req: Request, res: Response) => {
    const { adminReply, status } = req.body;
    if (!adminReply) {
      return res.status(400).json({ success: false, message: 'Admin reply content is required' });
    }

    const state = db.getState();
    if (!state.helpdeskInquiries) state.helpdeskInquiries = [];
    const inq = state.helpdeskInquiries.find((i) => i.id === req.params.id);
    if (!inq) return res.status(404).json({ success: false, message: 'Inquiry ticket not found' });

    inq.adminReply = adminReply.trim();
    inq.repliedAt = new Date().toISOString();
    inq.status = status || 'RESOLVED';
    db.save();

    res.json({ success: true, data: inq, message: 'Reply sent and inquiry status updated!' });
  });

  app.delete('/api/helpdesk/inquiries/:id', requireAdmin, (req: Request, res: Response) => {
    const state = db.getState();
    if (!state.helpdeskInquiries) state.helpdeskInquiries = [];
    const idx = state.helpdeskInquiries.findIndex((i) => i.id === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Inquiry ticket not found' });

    state.helpdeskInquiries.splice(idx, 1);
    db.save();
    res.json({ success: true, message: 'Inquiry ticket removed' });
  });

  // ----------------------------------------------------
  // DASHBOARD STATS
  // ----------------------------------------------------
  app.get('/api/dashboard/stats', (_req: Request, res: Response) => {
    const state = db.getState();
    const today = new Date().toISOString().split('T')[0];
    const upcomingExamsCount = state.exams.filter((e) => e.date >= today).length;
    const upcomingEventsCount = state.events.filter((e) => e.date >= today).length;
    const urgentNoticesCount = state.notices.filter((n) => n.priority === 'URGENT').length;
    const totalRsvps = state.events.reduce((acc, ev) => acc + (ev.attendeesCount || 0), 0);

    res.json({
      success: true,
      data: {
        totalUsers: state.users.length,
        totalNotices: state.notices.length,
        urgentNoticesCount,
        upcomingExamsCount,
        upcomingEventsCount,
        totalResources: state.resources.length,
        totalClubs: state.clubs.length,
        totalRsvps,
        busRoutesCount: state.busSchedules.length,
        openLostFoundCount: state.lostFound.filter((l) => l.status === 'OPEN').length,
      },
    });
  });

  // ----------------------------------------------------
  // AI MODULES (Notice Summarizer & Campus Assistant)
  // ----------------------------------------------------
  app.post('/api/ai/summarize', async (req: Request, res: Response) => {
    const { noticeId, customNotice } = req.body;
    let noticeToSummarize: Notice | undefined;

    if (noticeId) {
      noticeToSummarize = db.getState().notices.find((n) => n.id === noticeId);
    } else if (customNotice) {
      noticeToSummarize = customNotice;
    }

    if (!noticeToSummarize) {
      return res.status(400).json({ success: false, message: 'Notice not provided or notice ID not found' });
    }

    try {
      const summary = await summarizeNotice(noticeToSummarize);
      res.json({ success: true, data: summary });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Summarization failed' });
    }
  });

  app.post('/api/ai/ask', async (req: Request, res: Response) => {
    const { query } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ success: false, message: 'Query is required' });
    }

    try {
      const result = await askCampusAssistant(query);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Campus assistant query failed' });
    }
  });

}

export async function startServer() {
  await configureApp();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  // ----------------------------------------------------
  // VITE DEV MIDDLEWARE / STATIC PROD
  // ----------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[CampusOS Server] Running on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error('Fatal server startup failure:', err);
    process.exit(1);
  });
}
