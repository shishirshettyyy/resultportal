require('dotenv').config(); // Add at the top for environment variables
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
  attendance: Number,
  attendancestatus: String,
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
  name: { type: String, required: true },
  registerNumber: { type: String, required: true },
  semester: { type: String, required: true },
  branch: { type: String, required: true },
  subjectName: { type: String, required: true },
  marks: { type: Number, required: true, min: 0, max: 100 },
  attendance: { type: Number, required: true, min: 0, max: 100 },
  attendancestatus: { type: String, enum: ['Eligible', 'NE'], default: 'NE' },
  sessionalType: { type: String, required: true, enum: ['Sessional 1', 'Sessional 2', 'Sessional 3'] },
  studentEmail: { type: String, required: true },
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
  auth: {
    user: process.env.EMAIL_FROM,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false // Bypass SSL verification
  }
});

// Hardcoded Admin
const adminCredentials = { username: 'admin', password: 'admin123' };

// Setup Default Lecturers
const setupDefaultLecturers = async () => {
  try {
    const lecturerCount = await Lecturer.countDocuments();
    if (lecturerCount === 0) {
      const lecturers = [
        { email: "shridevi@college.com", password: await bcrypt.hash("password1", 10), name: "Shridevi", lecturerId: "L001" },
        { email: "rajesh@college.com", password: await bcrypt.hash("password2", 10), name: "Rajesh", lecturerId: "L002" },
        { email: "subramanya@college.com", password: await bcrypt.hash("password3", 10), name: "Subramanya", lecturerId: "L003" },
        { email: "vinoda@college.com", password: await bcrypt.hash("password4", 10), name: "Vinoda", lecturerId: "L004" },
      ];
      await Lecturer.insertMany(lecturers);
      console.log("Default lecturers created successfully");
    } else {
      console.log("Lecturers already exist in the database");
    }
  } catch (err) {
    console.error("Error setting up default lecturers:", err);
  }
};

mongoose.connection.once('open', setupDefaultLecturers);

// Routes
app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (username === adminCredentials.username && password === adminCredentials.password) {
    res.json({ success: true });
  } else {
    res.json({ success: false, message: 'Invalid credentials' });
  }
});

app.post('/results/bulk-upload', async (req, res) => {
  const { csvData } = req.body;
  const results = [];
  const totalDays = 100; // Assuming total days is a constant for calculation
  const stream = Readable.from(Buffer.from(csvData, 'base64'));
  stream
    .pipe(csv())
    .on('data', (row) => {
      const subjects = Object.keys(row)
        .filter(key => key.startsWith('subject'))
        .map(key => ({ subjectName: key.replace('subject_', ''), marks: parseInt(row[key]) || 0 }));
      const totalMarks = subjects.reduce((sum, subj) => sum + subj.marks, 0);
      const percentage = (totalMarks / (subjects.length * 100)) * 100;
      const attendancePercentage = (parseInt(row.attendance) / totalDays) * 100; // Calculate attendance percentage
      const attendancestatus = attendancePercentage >= 75 ? 'Eligible' : 'NE'; // Determine attendance status

      results.push({
        name: row.name,
        registerNumber: row.registerNumber,
        semester: row.semester,
        branch: row.branch,
        subjects,
        attendance: attendancePercentage, // Store calculated attendance percentage
        attendancestatus,
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
  const { name, registerNumber, semester, branch, subjects, attendance } = req.body;
  const totalMarks = subjects.reduce((sum, subject) => sum + subject.marks, 0);
  const percentage = (totalMarks / (subjects.length * 100)) * 100;
  const attendancestatus = attendance >= 75 ? 'Eligible' : 'NE'; // Calculate attendance status
  const status = percentage >= 40 ? 'Pass' : 'Fail';

  const updatedResult = await Result.findByIdAndUpdate(
    req.params.id,
    { name, registerNumber, semester, branch, subjects, totalMarks, percentage, attendance, attendancestatus, status },
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
  const { name , registerNumber, semester, branch, subjectName, marks, attendance, sessionalType, studentEmail } = req.body;
  const attendancestatus = attendance >= 75 ? 'Eligible' : 'NE'; // Calculate attendance status

  const sessionalMarks = new SessionalMarks({
    name,
    lecturerId: req.lecturer.id,
    registerNumber,
    semester,
    branch,
    subjectName,
    marks,
    attendance,
    attendancestatus,
    sessionalType,
    studentEmail,
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

  const { name, registerNumber, semester, branch, attendance, studentEmail } = sessional;
  const approvedMarks = await SessionalMarks.find({ 
    name,
    registerNumber, 
    semester, 
    branch, 
    attendance,
    status: 'Approved' 
  });

  const subjects = approvedMarks.map(mark => ({
    subjectName: `${mark.subjectName} (${mark.sessionalType})`,
    marks: mark.marks,
  }));

  let result;
  if (subjects.length === 4) {
    const totalMarks = subjects.reduce((sum, subj) => sum + subj.marks, 0);
    const percentage = (totalMarks / 400) * 100;
    const attendancestatus = attendance >= 75 ? 'Eligible' : 'NEE'; // Calculate attendance status

    result = await Result.findOneAndUpdate(
      { name, registerNumber, semester, branch },
      { 
        name,
        registerNumber,
        semester,
        branch,
        subjects,
        totalMarks,
        percentage,
        status: percentage >= 40 ? 'Pass' : 'Fail',
        attendancestatus,
      },
      { upsert: true, new: true }
    );

    transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: studentEmail,
      subject: 'Result Updated',
      html: `
        <h1>Result Updated</h1>
        <p>Dear Student,</p>
        <p>${name} your <strong>${semester}</strong> result has been updated:</p>
        <ul>
          ${subjects.map(subj => `<li>${subj.subjectName}: ${subj.marks}/100</li>`).join('')}
        </ul>
        <p><strong>Total:</strong> ${totalMarks}/400</p>
        <p><strong>Percentage:</strong> ${percentage}%</p>
        <p><strong>Status:</strong> ${percentage >= 40 ? 'Pass' : 'Fail'}</p>
        <p><strong>Attendance Status:</strong> ${attendancestatus}</p>
        <p>Check your dashboard for more details.</p>
      `,
    }, (err, info) => {
      if (err) console.error('Error sending email:', err);
      else console.log('Email sent:', info.response);
    });
  }

  res.json({ message: 'Sessional marks approved', sessional, result: result || null });
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
  const avgPercentage = totalStudents ? (results.reduce((sum, r) => sum + r.percentage , 0) / totalStudents).toFixed(2) : 0;
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