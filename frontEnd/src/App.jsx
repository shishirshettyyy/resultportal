// src/App.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import './App.css';

function App() {
  const [role, setRole] = useState('student');
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);
  const [lecturerLoggedIn, setLecturerLoggedIn] = useState(false);
  const [results, setResults] = useState([]);
  const [pendingMarks, setPendingMarks] = useState([]);
  const [dashboardData, setDashboardData] = useState({});
  const [analytics, setAnalytics] = useState({});
  const [lecturerStats, setLecturerStats] = useState([]);
  const [error, setError] = useState(null);

  const [studentForm, setStudentForm] = useState({ registerNumber: '', semester: '' });
  const [adminForm, setAdminForm] = useState({ username: '', password: '' });
  const [editResult, setEditResult] = useState(null);
  const [bulkFile, setBulkFile] = useState(null);
  const [lecturerForm, setLecturerForm] = useState({ email: '', password: '' });
  const [sessionalForm, setSessionalForm] = useState({
    registerNumber: '',
    semester: '',
    branch: '',
    subjectName: '',
    marks: '',
  });

  // Fetch Dashboards
  const fetchStudentDashboard = async (registerNumber) => {
    try {
      const res = await axios.get(`/api/student/dashboard?registerNumber=${registerNumber}`);
      setResults(res.data.results || []);
      setError(null);
    } catch {
      setError('Failed to fetch student dashboard');
    }
  };

  const fetchAdminDashboard = async () => {
    try {
      const res = await axios.get('/api/admin/dashboard');
      setDashboardData(res.data || {});
      const analyticsRes = await axios.get('/api/admin/analytics');
      setAnalytics(analyticsRes.data || {});
      const statsRes = await axios.get('/api/admin/lecturer/stats');
      setLecturerStats(statsRes.data || []);
      const pendingRes = await axios.get('/api/admin/sessional/pending');
      setPendingMarks(pendingRes.data || []);
      const resultsRes = await axios.post('/api/results/view', { registerNumber: '' }); // Fetch all results
      setResults(Array.isArray(resultsRes.data) ? resultsRes.data : []);
      setError(null);
    } catch {
      setError('Failed to fetch admin dashboard');
    }
  };

  const fetchLecturerDashboard = async () => {
    try {
      const res = await axios.get('/api/lecturer/dashboard', {
        headers: { Authorization: `Bearer ${localStorage.getItem('lecturerToken')}` },
      });
      setDashboardData({ submittedMarks: res.data.submittedMarks || [] });
      setError(null);
    } catch {
      setError('Failed to fetch lecturer dashboard');
    }
  };

  useEffect(() => {
    if (adminLoggedIn) fetchAdminDashboard();
    if (lecturerLoggedIn) fetchLecturerDashboard();
  }, [adminLoggedIn, lecturerLoggedIn]);

  // Handlers
  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/results/view', studentForm);
      setResults(Array.isArray(res.data) ? res.data : []);
      fetchStudentDashboard(studentForm.registerNumber);
      setError(null);
    } catch {
      setError('No results found');
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    try {
      console.log('Sending login request:', adminForm);
      const res = await axios.post('/api/admin/login', adminForm);
      console.log('Response:', res.data);
      if (res.data.success) {
        setAdminLoggedIn(true);
        setError(null);
      } else {
        setError('Invalid credentials');
      }
    } catch (err) {
      console.error('Login error:', err.response || err);
      setError('Login failed');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/results/edit/${editResult._id}`, editResult);
      alert('Result updated');
      setEditResult(null);
      fetchAdminDashboard();
      setError(null);
    } catch {
      setError('Failed to update result');
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/results/delete/${id}`);
      alert('Result deleted');
      fetchAdminDashboard();
      setError(null);
    } catch {
      setError('Failed to delete result');
    }
  };

  const handleBulkUpload = async (e) => {
    e.preventDefault();
    if (!bulkFile) {
      setError('Please select a CSV file');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const csvData = event.target.result.split(',')[1];
        await axios.post('/api/results/bulk-upload', { csvData });
        alert('Bulk upload completed');
        fetchAdminDashboard();
        setError(null);
      } catch {
        setError('Failed to upload CSV');
      }
    };
    reader.readAsDataURL(bulkFile);
  };

  const handleLecturerLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/lecturer/login', lecturerForm);
      if (res.data.success) {
        localStorage.setItem('lecturerToken', res.data.token);
        setLecturerLoggedIn(true);
        setError(null);
      } else {
        setError('Invalid credentials');
      }
    } catch {
      setError('Login failed');
    }
  };

  const handleSessionalSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/lecturer/sessional/add', sessionalForm, {
        headers: { Authorization: `Bearer ${localStorage.getItem('lecturerToken')}` },
      });
      alert('Sessional marks submitted');
      setSessionalForm({ registerNumber: '', semester: '', branch: '', subjectName: '', marks: '' });
      fetchLecturerDashboard();
      setError(null);
    } catch {
      setError('Failed to submit sessional marks');
    }
  };

  const handleApproval = async (id, action) => {
    try {
      await axios.put(`/api/admin/sessional/${action}/${id}`);
      alert(`Sessional marks ${action}d`);
      fetchAdminDashboard();
      setError(null);
    } catch {
      setError(`Failed to ${action} sessional marks`);
    }
  };

  const generatePDF = (result) => {
    const doc = new jsPDF();
    doc.text('Result', 10, 10);
    doc.autoTable({
      head: [['Subject', 'Marks']],
      body: result.subjects.map(s => [s.subjectName, s.marks]),
    });
    doc.save(`${result.registerNumber}_${result.semester}_result.pdf`);
  };

  return (
    <div className="app-container">
      <nav className="navbar">
        <h1 className="navbar-title">College Results Portal</h1>
        <div className="navbar-buttons">
          <button className="nav-btn" onClick={() => setRole('student')}>Student</button>
          <button className="nav-btn" onClick={() => setRole('admin')}>Admin</button>
          <button className="nav-btn" onClick={() => setRole('lecturer')}>Lecturer</button>
        </div>
      </nav>

      <main className="main-content">
        {error && <div className="error-message">{error}</div>}

        {/* Student Dashboard */}
        {role === 'student' && (
          <section className="dashboard-section">
            <h2 className="section-title">Student Dashboard</h2>
            <form className="form-container" onSubmit={handleStudentSubmit}>
              <input className="input-field" placeholder="Register Number" value={studentForm.registerNumber} onChange={e => setStudentForm({ ...studentForm, registerNumber: e.target.value })} />
              <input className="input-field" placeholder="Semester (optional)" value={studentForm.semester} onChange={e => setStudentForm({ ...studentForm, semester: e.target.value })} />
              <button className="submit-btn" type="submit">View Results</button>
            </form>
            {results.length > 0 && (
              <div className="results-container">
                <h3 className="subtitle">Your Results</h3>
                {results.map(result => (
                  <div key={result._id} className="result-card">
                    <p>Semester: {result.semester} | Total: {result.totalMarks} | Percentage: {result.percentage}%</p>
                    <button className="action-btn" onClick={() => generatePDF(result)}>Download PDF</button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Admin Login */}
        {role === 'admin' && !adminLoggedIn && (
          <section className="dashboard-section">
            <h2 className="section-title">Admin Login</h2>
            <form className="form-container" onSubmit={handleAdminLogin}>
              <input className="input-field" placeholder="Username" value={adminForm.username} onChange={e => setAdminForm({ ...adminForm, username: e.target.value })} />
              <input className="input-field" type="password" placeholder="Password" value={adminForm.password} onChange={e => setAdminForm({ ...adminForm, password: e.target.value })} />
              <button className="submit-btn" type="submit">Login</button>
            </form>
          </section>
        )}

        {/* Admin Dashboard */}
        {role === 'admin' && adminLoggedIn && (
          <section className="dashboard-section">
            <h2 className="section-title">Admin Dashboard</h2>
            <div className="dashboard-stats">
              <p>Total Results: {dashboardData.totalResults || 0} | Pending Marks: {dashboardData.pendingMarks || 0}</p>
              <h3 className="subtitle">Analytics</h3>
              <p>Total Students: {analytics.totalStudents || 0} | Passed: {analytics.passed || 0} | Failed: {analytics.failed || 0} | Avg Percentage: {analytics.avgPercentage || 0}%</p>
              <h3 className="subtitle">Lecturer Stats</h3>
              <ul className="stats-list">{lecturerStats.map(stat => <li key={stat._id}>{stat.name}: {stat.count} submissions</li>)}</ul>
            </div>

            <div className="form-section">
              <h3 className="subtitle">Bulk Upload Results</h3>
              <form className="form-container" onSubmit={handleBulkUpload}>
                <input className="file-input" type="file" accept=".csv" onChange={e => setBulkFile(e.target.files[0])} />
                <button className="submit-btn" type="submit">Upload CSV</button>
              </form>
              <p className="form-note">CSV Format: name,registerNumber,semester,branch,subject_1,subject_2,...</p>
            </div>

            {editResult && (
              <div className="form-section">
                <h3 className="subtitle">Edit Result</h3>
                <form className="form-container" onSubmit={handleEditSubmit}>
                  <input className="input-field" placeholder="Name" value={editResult.name} onChange={e => setEditResult({ ...editResult, name: e.target.value })} />
                  <input className="input-field" placeholder="Register Number" value={editResult.registerNumber} onChange={e => setEditResult({ ...editResult, registerNumber: e.target.value })} />
                  <input className="input-field" placeholder="Semester" value={editResult.semester} onChange={e => setEditResult({ ...editResult, semester: e.target.value })} />
                  <input className="input-field" placeholder="Branch" value={editResult.branch} onChange={e => setEditResult({ ...editResult, branch: e.target.value })} />
                  {editResult.subjects.map((subject, index) => (
                    <div key={index} className="subject-row">
                      <input
                        className="input-field"
                        placeholder={`Subject ${index + 1}`}
                        value={subject.subjectName}
                        onChange={e => {
                          const updated = [...editResult.subjects];
                          updated[index].subjectName = e.target.value;
                          setEditResult({ ...editResult, subjects: updated });
                        }}
                      />
                      <input
                        className="input-field"
                        type="number"
                        placeholder="Marks"
                        value={subject.marks}
                        onChange={e => {
                          const updated = [...editResult.subjects];
                          updated[index].marks = parseInt(e.target.value) || 0;
                          setEditResult({ ...editResult, subjects: updated });
                        }}
                      />
                    </div>
                  ))}
                  <button className="submit-btn" type="submit">Update Result</button>
                  <button className="secondary-btn" type="button" onClick={() => setEditResult(null)}>Cancel</button>
                </form>
              </div>
            )}

            <div className="table-section">
              <h3 className="subtitle">Pending Sessional Marks</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Register Number</th>
                    <th>Subject</th>
                    <th>Marks</th>
                    <th>Lecturer</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingMarks.map(mark => (
                    <tr key={mark._id}>
                      <td>{mark.registerNumber}</td>
                      <td>{mark.subjectName}</td>
                      <td>{mark.marks}</td>
                      <td>{mark.lecturerId?.name || 'Unknown'}</td>
                      <td>
                        <button className="action-btn approve" onClick={() => handleApproval(mark._id, 'approve')}>Approve</button>
                        <button className="action-btn reject" onClick={() => handleApproval(mark._id, 'reject')}>Reject</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="table-section">
              <h3 className="subtitle">All Results</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Register Number</th>
                    <th>Semester</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map(result => (
                    <tr key={result._id}>
                      <td>{result.name}</td>
                      <td>{result.registerNumber}</td>
                      <td>{result.semester}</td>
                      <td>
                        <button className="action-btn edit" onClick={() => setEditResult(result)}>Edit</button>
                        <button className="action-btn delete" onClick={() => handleDelete(result._id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Lecturer Login */}
        {role === 'lecturer' && !lecturerLoggedIn && (
          <section className="dashboard-section">
            <h2 className="section-title">Lecturer Login</h2>
            <form className="form-container" onSubmit={handleLecturerLogin}>
              <input className="input-field" placeholder="Email" value={lecturerForm.email} onChange={e => setLecturerForm({ ...lecturerForm, email: e.target.value })} />
              <input className="input-field" type="password" placeholder="Password" value={lecturerForm.password} onChange={e => setLecturerForm({ ...lecturerForm, password: e.target.value })} />
              <button className="submit-btn" type="submit">Login</button>
            </form>
          </section>
        )}

        {/* Lecturer Dashboard */}
        {role === 'lecturer' && lecturerLoggedIn && (
          <section className="dashboard-section">
            <h2 className="section-title">Lecturer Dashboard</h2>
            <div className="dashboard-stats">
              <p>Submitted Marks: {dashboardData.submittedMarks?.length || 0}</p>
            </div>
            <div className="form-section">
              <h3 className="subtitle">Add Sessional Marks</h3>
              <form className="form-container" onSubmit={handleSessionalSubmit}>
                <input className="input-field" placeholder="Register Number" value={sessionalForm.registerNumber} onChange={e => setSessionalForm({ ...sessionalForm, registerNumber: e.target.value })} />
                <input className="input-field" placeholder="Semester" value={sessionalForm.semester} onChange={e => setSessionalForm({ ...sessionalForm, semester: e.target.value })} />
                <input className="input-field" placeholder="Branch" value={sessionalForm.branch} onChange={e => setSessionalForm({ ...sessionalForm, branch: e.target.value })} />
                <input className="input-field" placeholder="Subject Name" value={sessionalForm.subjectName} onChange={e => setSessionalForm({ ...sessionalForm, subjectName: e.target.value })} />
                <input className="input-field" type="number" placeholder="Marks" value={sessionalForm.marks} onChange={e => setSessionalForm({ ...sessionalForm, marks: parseInt(e.target.value) || 0 })} />
                <button className="submit-btn" type="submit">Submit Marks</button>
              </form>
            </div>
            <div className="table-section">
              <h3 className="subtitle">Your Submissions</h3>
              <ul className="submission-list">{dashboardData.submittedMarks?.map(mark => (
                <li key={mark._id}>{mark.registerNumber} - {mark.subjectName}: {mark.marks} ({mark.status})</li>
              ))}</ul>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;