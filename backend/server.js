// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const csv = require('csv-parser');
const { Readable } = require('stream');

const app = express();
const port = 5000;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

mongoose.connect('mongodb://localhost:27017/collegeResults', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

// Models
const resultSchema = new mongoose.Schema({
  name: String,
  registerNumber: String,
  semester: String,
  branch: String,
  subjects: [{ subjectName: String, marks: Number }],
  totalMarks: Number,
  percentage: Number,
  status: String,
});
const Result = mongoose.model('Result', resultSchema);

const lecturerSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  lecturerId: { type: String, unique: true },
});
const Lecturer = mongoose.model('Lecturer', lecturerSchema);

const sessionalMarksSchema = new mongoose.Schema({
  lecturerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lecturer', required: true },
  registerNumber: { type: String, required: true },
  semester: { type: String, required: true },
  branch: { type: String, required: true },
  subjectName: { type: String, required: true },
  marks: { type: Number, required: true },
  status: { type: String, default: 'Pending', enum: ['Pending', 'Approved', 'Rejected'] },
});
const SessionalMarks = mongoose.model('SessionalMarks', sessionalMarksSchema);

// Middleware
const authenticateLecturer = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  jwt.verify(token, 'secret-key', (err, lecturer) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.lecturer = lecturer;
    next();
  });
};

// Email Setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: 'your-email@gmail.com', pass: 'your-app-password' },
});

// Hardcoded Admin
const adminCredentials = { username: 'admin', password: 'admin123' };

// Routes
app.post('/admin/login', (req, res) => {
  console.log('Admin login attempt:', req.body);
  const { username, password } = req.body;
  if (username === adminCredentials.username && password === adminCredentials.password) {
    res.json({ success: true });
  } else {
    res.json({ success: false, message: 'Invalid credentials' });
  }
});

// Removed /results/add since results are auto-generated

app.post('/results/bulk-upload', async (req, res) => {
  const { csvData } = req.body;
  const results = [];
  const stream = Readable.from(Buffer.from(csvData, 'base64'));
  stream
    .pipe(csv())
    .on('data', (row) => {
      const subjects = Object.keys(row)
        .filter(key => key.startsWith('subject'))
        .map(key => ({ subjectName: key.replace('subject_', ''), marks: parseInt(row[key]) || 0 }));
      const totalMarks = subjects.reduce((sum, subj) => sum + subj.marks, 0);
      const percentage = (totalMarks / (subjects.length * 100)) * 100;
      results.push({
        name: row.name,
        registerNumber: row.registerNumber,
        semester: row.semester,
        branch: row.branch,
        subjects,
        totalMarks,
        percentage,
        status: percentage >= 40 ? 'Pass' : 'Fail',
      });
    })
    .on('end', async () => {
      await Result.insertMany(results);
      res.json({ message: `${results.length} results uploaded` });
    });
});

app.put('/results/edit/:id', async (req, res) => {
  const { name, registerNumber, semester, branch, subjects } = req.body;
  const totalMarks = subjects.reduce((sum, subject) => sum + subject.marks, 0);
  const percentage = (totalMarks / (subjects.length * 100)) * 100;
  const status = percentage >= 40 ? 'Pass' : 'Fail';

  const updatedResult = await Result.findByIdAndUpdate(
    req.params.id,
    { name, registerNumber, semester, branch, subjects, totalMarks, percentage, status },
    { new: true }
  );
  res.json({ message: 'Result updated', result: updatedResult });
});

app.delete('/results/delete/:id', async (req, res) => {
  await Result.findByIdAndDelete(req.params.id);
  res.json({ message: 'Result deleted' });
});

app.post('/results/view', async (req, res) => {
  const { registerNumber, semester } = req.body;
  const query = { registerNumber };
  if (semester) query.semester = semester;
  const results = await Result.find(query);
  res.json(results.length ? results : { message: 'No results found' });
});

app.post('/lecturer/login', async (req, res) => {
  const { email, password } = req.body;
  const lecturer = await Lecturer.findOne({ email });
  if (!lecturer || !(await bcrypt.compare(password, lecturer.password))) {
    return res.json({ success: false, message: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: lecturer._id }, 'secret-key', { expiresIn: '1h' });
  res.json({ success: true, token });
});

app.post('/lecturer/sessional/add', authenticateLecturer, async (req, res) => {
  const { registerNumber, semester, branch, subjectName, marks } = req.body;
  const sessionalMarks = new SessionalMarks({
    lecturerId: req.lecturer.id,
    registerNumber,
    semester,
    branch,
    subjectName,
    marks,
  });
  await sessionalMarks.save();
  res.json({ message: 'Sessional marks added' });
});

app.get('/admin/sessional/pending', async (req, res) => {
  const pendingMarks = await SessionalMarks.find({ status: 'Pending' }).populate('lecturerId', 'name email');
  res.json(pendingMarks);
});

app.put('/admin/sessional/approve/:id', async (req, res) => {
  const sessional = await SessionalMarks.findByIdAndUpdate(req.params.id, { status: 'Approved' }, { new: true });
  
  // Auto-generate or update result
  const { registerNumber, semester, branch, subjectName, marks } = sessional;
  const approvedMarks = await SessionalMarks.find({ 
    registerNumber, 
    semester, 
    branch, 
    status: 'Approved' 
  });
  
  const subjects = approvedMarks.map(mark => ({
    subjectName: mark.subjectName,
    marks: mark.marks,
  }));
  const totalMarks = subjects.reduce((sum, subj) => sum + subj.marks, 0);
  const percentage = (totalMarks / (subjects.length * 100)) * 100; // Assumes 100 max per subject
  const status = percentage >= 40 ? 'Pass' : 'Fail';

  // Find existing result or create new
  let result = await Result.findOne({ registerNumber, semester, branch });
  if (result) {
    result.subjects = subjects;
    result.totalMarks = totalMarks;
    result.percentage = percentage;
    result.status = status;
    await result.save();
  } else {
    result = new Result({
      name: registerNumber, // Replace with actual student name if available
      registerNumber,
      semester,
      branch,
      subjects,
      totalMarks,
      percentage,
      status,
    });
    await result.save();
  }

  // Email Notification
  transporter.sendMail({
    from: 'your-email@gmail.com',
    to: `${registerNumber}@student.com`,
    subject: 'Result Updated',
    text: `Dear Student, your ${semester} result has been updated. Total: ${totalMarks}, Percentage: ${percentage}%`,
  });

  res.json({ message: 'Sessional marks approved and result updated', sessional });
});

app.put('/admin/sessional/reject/:id', async (req, res) => {
  const sessional = await SessionalMarks.findByIdAndUpdate(req.params.id, { status: 'Rejected' }, { new: true });
  res.json({ message: 'Sessional marks rejected', sessional });
});

app.get('/lecturer/dashboard', authenticateLecturer, async (req, res) => {
  const submittedMarks = await SessionalMarks.find({ lecturerId: req.lecturer.id });
  res.json({ submittedMarks });
});

app.get('/student/dashboard', async (req, res) => {
  const { registerNumber } = req.query;
  const results = await Result.find({ registerNumber });
  res.json({ results });
});

app.get('/admin/dashboard', async (req, res) => {
  const results = await Result.find();
  const pendingMarks = await SessionalMarks.find({ status: 'Pending' });
  res.json({ totalResults: results.length, pendingMarks: pendingMarks.length });
});

app.get('/admin/analytics', async (req, res) => {
  const results = await Result.find();
  const totalStudents = results.length;
  const passed = results.filter(r => r.status === 'Pass').length;
  const avgPercentage = totalStudents ? (results.reduce((sum, r) => sum + r.percentage, 0) / totalStudents).toFixed(2) : 0;
  res.json({ totalStudents, passed, failed: totalStudents - passed, avgPercentage });
});

app.get('/admin/lecturer/stats', async (req, res) => {
  const stats = await SessionalMarks.aggregate([
    { $group: { _id: '$lecturerId', count: { $sum: 1 } } },
    { $lookup: { from: 'lecturers', localField: '_id', foreignField: '_id', as: 'lecturer' } },
    { $project: { name: { $arrayElemAt: ['$lecturer.name', 0] }, count: 1 } },
  ]);
  res.json(stats);
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});