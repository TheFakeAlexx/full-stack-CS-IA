import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: './.env' })

const app = express();
const PORT = 5000;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images (jpeg, jpg, png, gif) and videos (mp4, mov, avi) are allowed.'));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 7 // Max 5 photos + 2 videos = 7 files
  }
});

const MONGO_URI = process.env.mongodb;
const JWT_SECRET = process.env.jwt;

// Email transporter setup
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});


mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));


const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  approved: { type: Boolean, default: false },
  role: { type: String, enum: ['admin', 'teacher', 'student'], default: 'student' },
  active: { type: Boolean, default: true },
  otp: { type: String },
  otpExpires: { type: Date }
});

const User = mongoose.model('User', userSchema);

const sectionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

const Section = mongoose.model('Section', sectionSchema);

const casProjectSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: [{ type: String, enum: ['Creativity', 'Activity', 'Service'], required: true }],
  location: { type: String, enum: ['In the school', 'Outside'], required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  learningOutcomes: [{ type: String, enum: [
    'LO1 - Identify own strengths and develop areas for growth',
    'LO2 - Demonstrate that challenges have been undertaken, developing new skills',
    'LO3 - Initiate and plan a CAS experience',
    'LO4 - Show perseverance and commitment in CAS experience',
    'LO5 - Demonstrate skills and benefits of working collaboratively',
    'LO6 - Engagement with issues of global significance',
    'LO7 - Recognise and consider the ethics of choices and actions'
  ], required: true }],
  unGoals: [{ type: String, enum: [
    'No Poverty',
    'Zero Hunger',
    'Good Health and Well-being',
    'Quality Education',
    'Gender Equality',
    'Clean Water and Sanitation',
    'Affordable and Clean Energy',
    'Decent Work and Economic Growth',
    'Industry, Innovation and Infrastructure',
    'Reduced Inequalities',
    'Sustainable Cities and Communities',
    'Responsible Consumption and Production',
    'Climate Action',
    'Life Below Water',
    'Life on Land',
    'Peace and Justice Strong Institutions',
    'Partnerships for the Goals'
  ], required: true }],
  investigation: { type: String, required: true },
  learnerProfile: { type: String, required: true },
  supervisorName: { type: String, required: true },
  status: { type: String, enum: ['For approval', 'In progress'], required: true },
  evidence: [{
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedAt: { type: Date, default: Date.now }
  }],
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section' },
  approved: { type: Boolean, default: false },
  denied: { type: Boolean, default: false },
  teacherComments: { type: String },
  denialComments: { type: String },
  submittedAt: { type: Date, default: Date.now },
  reviewedAt: { type: Date }
});

const CASProject = mongoose.model('CASProject', casProjectSchema);


const createAdmin = async () => {
  const adminExists = await User.findOne({ email: 'admin@fountainheadschools.org' });
  if (!adminExists) {
    const hashedPassword = await bcrypt.hash(process.env.adpass, 10);
    const admin = new User({
      email: 'admin@fountainheadschools.org',
      password: hashedPassword,
      approved: true,
      role: 'admin',
      active: true
    });
    await admin.save();
    console.log('Admin user created');
  }
};

createAdmin();

app.use(cors());
app.use(express.json());

// Serve uploaded files statically
app.use('/uploads', express.static(uploadsDir));


const authenticateToken = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access denied' });
  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).json({ message: 'Invalid token' });
  }
};

// Password strength validation function
const validatePasswordStrength = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const missing = [];
  if (password.length < minLength) missing.push('at least 8 characters');
  if (!hasUpperCase) missing.push('1 uppercase letter');
  if (!hasLowerCase) missing.push('1 lowercase letter');
  if (!hasNumbers) missing.push('1 number');
  if (!hasSpecialChar) missing.push('1 special character');

  return missing.length === 0 ? true : `Password must include: ${missing.join(', ')}.`;
};

// Generate a strong password
const generateStrongPassword = () => {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*(),.?":{}|<>';

  let password = '';
  password += upper[Math.floor(Math.random() * upper.length)];
  password += lower[Math.floor(Math.random() * lower.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  const allChars = upper + lower + numbers + special;
  for (let i = 4; i < 12; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password
  password = password.split('').sort(() => 0.5 - Math.random()).join('');

  return password;
};


app.post('/api/auth/signup', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  if (!email.endsWith('@fountainheadschools.org')) {
    return res.status(400).json({ message: 'Invalid email domain. Must be @fountainheadschools.org' });
  }
  const passwordCheck = validatePasswordStrength(password);
  if (passwordCheck !== true) {
    return res.status(400).json({ message: passwordCheck });
  }
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword, approved: false, role: 'student', active: true });
    await user.save();
    res.status(201).json({ message: 'User registered successfully. Awaiting admin approval.' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});


app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    if (!user.approved) {
      return res.status(403).json({ message: 'Account not approved yet. Please contact admin.' });
    }
    if (!user.active) {
      return res.status(403).json({ message: 'Account is deactivated. Please contact admin.' });
    }
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET);
    res.json({ token, role: user.role });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get("/api", (req, res) => {
  res.json({ message: "Welcome to CAS Tracker API 🚀" });
});


app.get('/api/admin/users', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
  try {
    const unapprovedUsers = await User.find({ approved: false });
    res.json(unapprovedUsers);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/admin/approve/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
  const { role } = req.body;
  if (!role || !['teacher', 'student'].includes(role)) {
    return res.status(400).json({ message: 'Role must be teacher or student' });
  }
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.approved = true;
    user.role = role;
    await user.save();
    res.json({ message: `User approved as ${role} successfully` });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/admin/deactivate/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.active = false;
    await user.save();
    res.json({ message: 'User deactivated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});
app.post('/api/admin/reactivate/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.active = true;
    await user.save();
    res.json({ message: 'User reactivated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/admin/all-users', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
  try {
    const allUsers = await User.find({});
    res.json(allUsers);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Get all sections
app.get('/api/admin/sections', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
  try {
    const sections = await Section.find({}).populate('teacher', 'email').populate('students', 'email');
    res.json(sections);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Create a new section and assign a teacher
app.post('/api/admin/create-section', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
  const { name, teacherId } = req.body;
  if (!name || !teacherId) {
    return res.status(400).json({ message: 'Name and teacherId are required' });
  }
  try {
    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(400).json({ message: 'Invalid teacher' });
    }
    const section = new Section({ name, teacher: teacherId, students: [] });
    await section.save();
    res.status(201).json({ message: 'Section created successfully', section });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Add a student to a section
app.post('/api/admin/add-student-to-section', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
  const { sectionId, studentId } = req.body;
  if (!sectionId || !studentId) {
    return res.status(400).json({ message: 'SectionId and studentId are required' });
  }
  try {
    const section = await Section.findById(sectionId);
    const student = await User.findById(studentId);
    if (!section || !student || student.role !== 'student') {
      return res.status(400).json({ message: 'Invalid section or student' });
    }
    if (!section.students.includes(studentId)) {
      section.students.push(studentId);
      await section.save();
    }
    res.json({ message: 'Student added to section successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Assign or update teacher to a section
app.post('/api/admin/assign-teacher-to-section', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
  const { sectionId, teacherId } = req.body;
  if (!sectionId || !teacherId) {
    return res.status(400).json({ message: 'SectionId and teacherId are required' });
  }
  try {
    const section = await Section.findById(sectionId);
    const teacher = await User.findById(teacherId);
    if (!section || !teacher || teacher.role !== 'teacher') {
      return res.status(400).json({ message: 'Invalid section or teacher' });
    }
    section.teacher = teacherId;
    await section.save();
    res.json({ message: 'Teacher assigned to section successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});


app.get("/api/user/stats", authenticateToken, async (req, res) => {
  try {
    const projects = await CASProject.find({ student: req.user.id, approved: true });
    let creativity = 0, activity = 0, service = 0;
    projects.forEach(project => {
      const cats = Array.isArray(project.category) ? project.category : [project.category];
      cats.forEach(cat => {
        if (cat === 'Creativity') creativity += 1;
        else if (cat === 'Activity') activity += 1;
        else if (cat === 'Service') service += 1;
      });
    });
    res.json({
      creativity: { projects: creativity, goal: 3 },
      activity: { projects: activity, goal: 3 },
      service: { projects: service, goal: 3 }
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


app.get("/api/activities/recent", authenticateToken, async (req, res) => {
  try {
    const projects = await CASProject.find({ student: req.user.id }).sort({ submittedAt: -1 }).limit(5);
    const activities = projects.map(project => ({
      id: project._id,
      title: project.title,
      category: Array.isArray(project.category) ? project.category.join(', ').toLowerCase() : project.category.toLowerCase(),
      projects: 1,
      date: project.submittedAt.toISOString().split('T')[0]
    }));
    res.json(activities);
  } catch (err) {
    console.error('Error fetching activities:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Student: Submit a CAS project
app.post('/api/student/submit-project', authenticateToken, upload.array('evidence', 7), async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ message: 'Access denied' });

  try {
    const {
      title,
      description,
      category,
      location,
      startDate,
      endDate,
      learningOutcomes,
      unGoals,
      investigation,
      learnerProfile,
      supervisorName,
      status
    } = req.body;

    // Validation
    if (!title || !description || !category || !location || !startDate || !endDate ||
        !learningOutcomes || !unGoals || !investigation || !learnerProfile || !supervisorName || !status) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    // Validate file uploads
    const files = req.files || [];
    const imageCount = files.filter(file => file.mimetype.startsWith('image/')).length;
    const videoCount = files.filter(file => file.mimetype.startsWith('video/')).length;

    if (imageCount > 5) {
      return res.status(400).json({ message: 'Maximum 5 photos allowed' });
    }
    if (videoCount > 2) {
      return res.status(400).json({ message: 'Maximum 2 videos allowed' });
    }

    // Find the section where the student is enrolled
    const section = await Section.findOne({ students: req.user.id });
    if (!section) {
      return res.status(400).json({ message: 'Student not assigned to any section. Please contact admin.' });
    }

    // Process evidence files
    const evidence = files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    }));

    const project = new CASProject({
      title,
      description,
      category: Array.isArray(category) ? category : [category],
      location,
      startDate,
      endDate,
      learningOutcomes: Array.isArray(learningOutcomes) ? learningOutcomes : [learningOutcomes],
      unGoals: Array.isArray(unGoals) ? unGoals : [unGoals],
      investigation,
      learnerProfile,
      supervisorName,
      status,
      evidence,
      student: req.user.id,
      section: section._id,
      approved: false,
      denied: false,
      teacherComments: '',
      denialComments: ''
    });

    await project.save();
    res.status(201).json({ message: 'Project submitted successfully', project });
  } catch (err) {
    // Clean up uploaded files if project creation fails
    if (req.files) {
      req.files.forEach(file => {
        fs.unlinkSync(file.path);
      });
    }
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

// Student: Edit and resubmit a denied project
app.put('/api/student/edit-project/:id', authenticateToken, upload.array('evidence', 7), async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ message: 'Access denied' });

  try {
    const project = await CASProject.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    if (project.student.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied: Not your project' });
    }
    if (!project.denied) {
      return res.status(400).json({ message: 'Only denied projects can be edited' });
    }

    const {
      title,
      description,
      category,
      location,
      startDate,
      endDate,
      learningOutcomes,
      unGoals,
      investigation,
      learnerProfile,
      supervisorName,
      status
    } = req.body;

    // Validation
    if (!title || !description || !category || !location || !startDate || !endDate ||
        !learningOutcomes || !unGoals || !investigation || !learnerProfile || !supervisorName || !status) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    // Validate file uploads
    const files = req.files || [];
    const imageCount = files.filter(file => file.mimetype.startsWith('image/')).length;
    const videoCount = files.filter(file => file.mimetype.startsWith('video/')).length;

    if (imageCount > 5) {
      return res.status(400).json({ message: 'Maximum 5 photos allowed' });
    }
    if (videoCount > 2) {
      return res.status(400).json({ message: 'Maximum 2 videos allowed' });
    }

    // Process evidence files
    const evidence = files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    }));

    // Update project
    project.title = title;
    project.description = description;
    project.category = Array.isArray(category) ? category : [category];
    project.location = location;
    project.startDate = startDate;
    project.endDate = endDate;
    project.learningOutcomes = Array.isArray(learningOutcomes) ? learningOutcomes : [learningOutcomes];
    project.unGoals = Array.isArray(unGoals) ? unGoals : [unGoals];
    project.investigation = investigation;
    project.learnerProfile = learnerProfile;
    project.supervisorName = supervisorName;
    project.status = status;
    project.evidence = evidence;
    project.approved = false;
    project.denied = false;
    project.teacherComments = '';
    project.denialComments = '';
    project.reviewedAt = undefined;
    project.submittedAt = new Date();

    await project.save();
    res.json({ message: 'Project updated and resubmitted successfully', project });
  } catch (err) {
    // Clean up uploaded files if project update fails
    if (req.files) {
      req.files.forEach(file => {
        fs.unlinkSync(file.path);
      });
    }
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

// Student: View their own projects
app.get('/api/student/projects', authenticateToken, async (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ message: 'Access denied' });
  try {
    const projects = await CASProject.find({ student: req.user.id });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Teacher: View projects in their section
app.get('/api/teacher/projects', authenticateToken, async (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Access denied' });
  try {
    const section = await Section.findOne({ teacher: req.user.id });
    if (!section) {
      return res.status(404).json({ message: 'No section assigned to this teacher' });
    }
    const projects = await CASProject.find({ section: section._id }).populate('student', 'email');
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Teacher: Get students in section with project counts
app.get('/api/teacher/section-students', authenticateToken, async (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Access denied' });
  try {
    const section = await Section.findOne({ teacher: req.user.id }).populate('students', 'email');
    if (!section) {
      return res.status(404).json({ message: 'No section assigned to this teacher' });
    }

    // Get project counts for each student
    const studentsWithCounts = await Promise.all(
      section.students.map(async (student) => {
        const projectCount = await CASProject.countDocuments({
          student: student._id,
          section: section._id,
          approved: true
        });
        return {
          _id: student._id,
          email: student.email,
          projectCount: projectCount
        };
      })
    );

    res.json({
      sectionName: section.name,
      students: studentsWithCounts
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Teacher: Get specific student's projects
app.get('/api/teacher/student-projects/:studentId', authenticateToken, async (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Access denied' });
  try {
    const section = await Section.findOne({ teacher: req.user.id });
    if (!section) {
      return res.status(404).json({ message: 'No section assigned to this teacher' });
    }

    // Check if student is in teacher's section
    if (!section.students.includes(req.params.studentId)) {
      return res.status(403).json({ message: 'Student not in your section' });
    }

    const projects = await CASProject.find({
      student: req.params.studentId,
      section: section._id
    }).populate('student', 'email').sort({ submittedAt: -1 });

    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Teacher: Approve a project
app.post('/api/teacher/approve-project/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Access denied' });
  const { teacherComments } = req.body;
  try {
    const project = await CASProject.findById(req.params.id).populate('section').populate('student', 'email');
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    if (project.section.teacher.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied: Project not in your section' });
    }
    project.approved = true;
    project.denied = false;
    project.teacherComments = teacherComments || '';
    project.denialComments = '';
    project.reviewedAt = new Date();
    await project.save();

    // Send email notification
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: project.student.email,
      subject: 'CAS Project Approved',
      text: `Your CAS project "${project.title}" has been approved.\n\nTeacher Comments: ${teacherComments || 'No comments provided.'}\n\nCongratulations!`
    };
    await transporter.sendMail(mailOptions);

    res.json({ message: 'Project approved successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Teacher: Deny a project
app.post('/api/teacher/deny-project/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Access denied' });
  const { denialComments } = req.body;
  if (!denialComments) {
    return res.status(400).json({ message: 'Denial comments are required' });
  }
  try {
    const project = await CASProject.findById(req.params.id).populate('section').populate('student', 'email');
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    if (project.section.teacher.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied: Project not in your section' });
    }
    project.denied = true;
    project.approved = false;
    project.denialComments = denialComments;
    project.teacherComments = '';
    project.reviewedAt = new Date();
    await project.save();

    // Send email notification
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: project.student.email,
      subject: 'CAS Project Denied',
      text: `Your CAS project "${project.title}" has been denied.\n\nReason: ${denialComments}\n\nPlease edit and resubmit your project.`
    };
    await transporter.sendMail(mailOptions);

    res.json({ message: 'Project denied successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Forgot Password: Send OTP or reset for admin
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (email === 'admin@fountainheadschools.org') {
      // Generate new strong password for admin
      const newPassword = generateStrongPassword();
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;
      await user.save();

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: 's.jaanav.salia2@fountainheadschools.org',
        subject: 'Admin Password Reset',
        text: `Your new admin password is: ${newPassword}. Please change it after logging in.`
      };

      await transporter.sendMail(mailOptions);
      res.json({ message: 'New password sent to admin email' });
    } else {
      // Normal user: Send OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
      user.otp = otp;
      user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      await user.save();

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Password Reset OTP',
        text: `Your OTP for password reset is: ${otp}. It expires in 10 minutes.`
      };

      await transporter.sendMail(mailOptions);
      res.json({ message: 'OTP sent to your email' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify OTP
app.post('/api/auth/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ message: 'Email and OTP are required' });
  }
  try {
    const user = await User.findOne({ email, otp, otpExpires: { $gt: new Date() } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }
    res.json({ message: 'OTP verified' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Reset Password
app.post('/api/auth/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) {
    return res.status(400).json({ message: 'Email, OTP, and new password are required' });
  }
  const passwordCheck = validatePasswordStrength(newPassword);
  if (passwordCheck !== true) {
    return res.status(400).json({ message: passwordCheck });
  }
  try {
    const user = await User.findOne({ email, otp, otpExpires: { $gt: new Date() } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }
    user.password = await bcrypt.hash(newPassword, 10);
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
