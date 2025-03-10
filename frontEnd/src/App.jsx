import React, { useState, useEffect } from "react";
import axios from "axios";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import "./App.css";

function App() {
  const [role, setRole] = useState("student");
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);
  const [lecturerLoggedIn, setLecturerLoggedIn] = useState(false);
  const [results, setResults] = useState([]);
  const [pendingMarks, setPendingMarks] = useState([]);
  const [dashboardData, setDashboardData] = useState({});
  const [analytics, setAnalytics] = useState({});
  const [lecturerStats, setLecturerStats] = useState([]);
  const [error, setError] = useState(null);
  const [lecturerName, setLecturerName] = useState(''); // New state for lecturer name

  const [studentForm, setStudentForm] = useState({
    registerNumber: "",
    semester: "",
  });
  const [adminForm, setAdminForm] = useState({ username: "", password: "" });
  const [editResult, setEditResult] = useState(null);
  const [bulkFile, setBulkFile] = useState(null);
  const [lecturerForm, setLecturerForm] = useState({ email: "", password: "" });
  const [sessionalForm, setSessionalForm] = useState({
    name: "",
    registerNumber: "",
    semester: "",
    branch: "",
    subjectName: "",
    attendance: "",
    marks: "",
    sessionalType: "Sessional 1",
    studentEmail: "",
  });

  // Fetch Dashboards
  const fetchStudentDashboard = async (registerNumber) => {
    try {
      const res = await axios.get(
        `/api/student/dashboard?registerNumber=${registerNumber}`
      );
      setResults(res.data.results || []);
      setError(null);
    } catch {
      setError("Failed to fetch student dashboard");
    }
  };

  const fetchAdminDashboard = async () => {
    try {
      const res = await axios.get("/api/admin/dashboard");
      setDashboardData(res.data || {});
      const analyticsRes = await axios.get("/api/admin/analytics");
      setAnalytics(analyticsRes.data || {});
      const statsRes = await axios.get("/api/admin/lecturer/stats");
      setLecturerStats(statsRes.data || []);
      const pendingRes = await axios.get("/api/admin/sessional/pending");
      setPendingMarks(pendingRes.data || []);
      const resultsRes = await axios.post("/api/results/view", {
        registerNumber: "",
      });
      setResults(Array.isArray(resultsRes.data) ? resultsRes.data : []);
      setError(null);
    } catch {
      setError("Failed to fetch admin dashboard");
    }
  };

  const fetchLecturerDashboard = async () => {
    try {
      const res = await axios.get("/api/lecturer/dashboard", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("lecturerToken")}`,
        },
      });
      setDashboardData({ submittedMarks: res.data.submittedMarks || [] });
      setError(null);
    } catch {
      setError("Failed to fetch lecturer dashboard");
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
      const res = await axios.post("/api/results/view", studentForm);
      setResults(Array.isArray(res.data) ? res.data : []);
      fetchStudentDashboard(studentForm.registerNumber);
      setError(null);
    } catch {
      setError("No results found");
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("/api/admin/login", adminForm);
      if (res.data.success) {
        setAdminLoggedIn(true);
        setError(null);
      } else {
        setError("Invalid credentials");
      }
    } catch {
      setError("Login failed");
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`/api/results/edit/${editResult._id}`, editResult);
      alert("Result updated");
      setEditResult(null);
      fetchAdminDashboard();
      setError(null);
    } catch {
      setError("Failed to update result");
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`/api/results/delete/${id}`);
      alert("Result deleted");
      fetchAdminDashboard();
      setError(null);
    } catch {
      setError("Failed to delete result");
    }
  };

  const handleBulkUpload = async (e) => {
    e.preventDefault();
    if (!bulkFile) {
      setError("Please select a CSV file");
      return;
    }
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const csvData = event.target.result.split(",")[1];
        await axios.post("/api/results/bulk-upload", { csvData });
        alert("Bulk upload completed");
        fetchAdminDashboard();
        setError(null);
      } catch {
        setError("Failed to upload CSV");
      }
    };
    reader.readAsDataURL(bulkFile);
  };

  const handleLecturerLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("/api/lecturer/login", lecturerForm);
      if (res.data.success) {
<<<<<<< HEAD
        localStorage.setItem("lecturerToken", res.data.token);
=======
        localStorage.setItem('lecturerToken', res.data.token);
        setLecturerName(res.data.name); // Store the lecturer's name
>>>>>>> 02a5fd89dbe3a01498e503f254e4b6741c8cc78b
        setLecturerLoggedIn(true);
        setError(null);
      } else {
        setError("Invalid credentials");
      }
    } catch {
      setError("Login failed");
    }
  };

  const handleSessionalSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/api/lecturer/sessional/add", sessionalForm, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("lecturerToken")}`,
        },
      });
      alert("Sessional marks submitted");
      setSessionalForm({
        name: "",
        registerNumber: "",
        semester: "",
        branch: "",
        subjectName: "",
        attendance: "",
        marks: "",
        sessionalType: "Sessional 1",
        studentEmail: "",
      });
      fetchLecturerDashboard();
      setError(null);
    } catch {
      setError("Failed to submit sessional marks");
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

<<<<<<< HEAD
  // const generatePDF = (result) => {
  //   if (!result) {
  //     console.error("Result data is missing");
  //     return;
  //   }

    // const doc = new jsPDF();
    // const pageWidth = doc.internal.pageSize.getWidth();

    // // Header
    // doc.setFontSize(18);
    // doc.text("N.R.A.M Polytechnic, Nitte", pageWidth / 2, 10, { align: "center" });
    // doc.setFontSize(14);
    // doc.text("Result Details", pageWidth / 2, 20, { align: "center" });

    // // Student Info
    // doc.setFontSize(12);
    // doc.text(`Name: ${result.name}`, 10, 30);
    // doc.text(`Register Number: ${result.registerNumber}`, 10, 40);
    // doc.text(`Semester: ${result.semester}`, 10, 50);
    // doc.text(`Branch: ${result.branch}`, 10, 60);

    // // Subject Table
    // const tableData = result.subjects.map((subject) => [subject.subjectName, subject.marks]);
    // doc.autoTable({
    //   head: [["Subject", "Marks"]],
    //   body: tableData,
    //   startY: 70,
    //   theme: "striped",
    //   styles: { fontSize: 11 },
    //   headStyles: { fillColor: [41, 128, 185], textColor: 255 }, // Blue Header
    // });

    const generatePDF = (result) => {
      if (!result) {
        console.error("Result data is missing");
        return;
      }

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Add university logo (replace with actual base64 image string)
      // const logoData = 'data:image/png;base64,...';
      // doc.addImage(logoData, 'PNG', 10, 10, 30, 30);

      // Header Section
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("N.R.A.M POLYTECHNIC ,Nitte", pageWidth / 2, 20, { align: "center" });
      doc.setFontSize(14);
      doc.text("OFFICIAL GRADE REPORT", pageWidth / 2, 28, { align: "center" });

      // Institution Info
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Affiliated to Department of Technical Education, Karnataka", pageWidth / 2, 35, { align: "center" });
      doc.text("Academic Year: 2023-2024", pageWidth / 2, 40, { align: "center" });

      // Student Information Table
      doc.autoTable({
        startY: 45,
        theme: "grid",
        head: [['Student Details', '']],
        body: [
          ['Name of Student', result.name],
          ['Register Number', result.registerNumber],
          ['Semester', result.semester],
          ['Programme', result.branch],
        ],
        styles: { fontSize: 12, cellPadding: 1.5 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontSize: 12 },
        tableLineColor: [0, 0, 0],
        tableLineWidth: 0.1,
      });

      // Academic Performance Table
      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 10,
        head: [
          ['Subject Code', 'Subject Name', 'Maximum Marks', 'Marks Obtained', 'Grade']
        ],
        body: result.subjects.map((subject, index) => {
          const subjectCodes = ['20CS32P', '20CS33P', '20CS34P', '20CS35P'];
          return [
        subjectCodes[index] || 'N/A',
        subject.subjectName,
        '100',
        subject.marks,
        subject.marks >= 40 ? 'P' : 'F'
          ];
        }),
        styles: { fontSize: 10, cellPadding: 2 },
        headStyles: { fillColor:  [41, 128, 185], textColor: 255, fontSize: 12 }, // Changed to blue
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 60 },
          2: { cellWidth: 30 },
          3: { cellWidth: 30 },
          4: { cellWidth: 20 }
        },
        theme: 'grid'
      });

      // Summary Table
      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 10,
        body: [
          ['Total Marks Obtained', result.totalMarks],
          ['Percentage', `${result.percentage}%`],
          ['Overall Result', result.status],
          ['Attendance Percentage', `${result.attendance}%`],
          ['Attendance Status', result.attendancestatus]
        ],
        styles: { fontSize: 12, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 80, fontStyle: 'bold' },
          1: { cellWidth: 80 }
        },
        theme: 'grid',
        didParseCell: function (data) {
          if (data.row.index === 2) {
        data.cell.styles.textColor = result.status === 'Pass' ? [0, 128, 0] : [255, 0, 0]; // Green for Pass, Red for Fail
          }
        }
      });

      // Footer
      doc.setFontSize(10);
      doc.text("Note: This is an official computer generated document, no signature required", pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });

      doc.save(`${result.name}_${result.registerNumber}_Result.pdf`);
    };
=======
  const generatePDF = (result) => {
    if (!result) {
      console.error("Result data is missing");
      return;
    }
  
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
  
    doc.setFontSize(18);
    doc.text("N.R.A.M Polytechnic, Nitte", pageWidth / 2, 10, { align: "center" });
    doc.setFontSize(14);
    doc.text("Result Details", pageWidth / 2, 20, { align: "center" });
  
    doc.setFontSize(12);
    doc.text(`Name: ${result.name}`, 10, 30);
    doc.text(`Register Number: ${result.registerNumber}`, 10, 40);
    doc.text(`Semester: ${result.semester}`, 10, 50);
    doc.text(`Branch: ${result.branch}`, 10, 60);
  
    const tableData = result.subjects.map((subject) => [subject.subjectName, subject.marks]);
    doc.autoTable({
      head: [["Subject", "Marks"]],
      body: tableData,
      startY: 70,
      theme: "striped",
      styles: { fontSize: 11 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    });
  
    doc.autoTable({
      head: [["Total Marks", "Percentage", "Status"]],
      body: [[result.totalMarks, `${result.percentage}%`, result.status]],
      startY: doc.lastAutoTable.finalY + 10,
      theme: "grid",
      styles: { fontSize: 11 },
      headStyles: { fillColor: [39, 174, 96], textColor: 255 },
    });
  
    doc.save(`${result.name}_${result.registerNumber}_result.pdf`);
  };
>>>>>>> 02a5fd89dbe3a01498e503f254e4b6741c8cc78b

  return (
    <div className="app-container">
      <nav className="navbar">
        <h1 className="navbar-title">College Results Portal</h1>
        <div className="navbar-buttons">
          <button className="nav-btn" onClick={() => setRole("student")}>
            Student
          </button>
          <button className="nav-btn" onClick={() => setRole("admin")}>
            Admin
          </button>
          <button className="nav-btn" onClick={() => setRole("lecturer")}>
            Lecturer
          </button>
        </div>
      </nav>

      <main className="main-content">
        {error && <div className="error-message">{error}</div>}

        {/* Student Dashboard */}
        {role === "student" && (
          <section className="dashboard-section">
            <h2 className="section-title">Student Dashboard</h2>
            <form className="form-container" onSubmit={handleStudentSubmit}>
              <input
                className="input-field"
                placeholder="Register Number"
                value={studentForm.registerNumber}
                onChange={(e) =>
                  setStudentForm({
                    ...studentForm,
                    registerNumber: e.target.value,
                  })
                }
              />
              <input
                className="input-field"
                placeholder="Semester (optional)"
                value={studentForm.semester}
                onChange={(e) =>
                  setStudentForm({ ...studentForm, semester: e.target.value })
                }
              />
              <button className="submit-btn" type="submit">
                View Results
              </button>
            </form>
            {results.length > 0 ? (
              <div className="results-container">
                <h3 className="subtitle">Your Results</h3>
                {results.map((result) => (
                  <div key={result._id} className="result-card">
                    <p>Semester: {result.semester}</p>
                    <ul>
                      {result.subjects.map((subject, index) => (
                        <li key={index}>
                          {subject.subjectName}: {subject.marks}/100
                        </li>
                      ))}
                    </ul>
                    {result.subjects.length === 4 ? (
                      <>
                        <p>Total: {result.totalMarks}/400</p>
                        <p>Percentage: {result.percentage}%</p>
                        <p>Status: {result.status}</p>
<<<<<<< HEAD
                        <p>
                          Attendance: {result.attendancestatus}
                        </p>
                        <button
                          className="action-btn"
                          onClick={() => generatePDF(result)}
                        >
                          Download PDF
                        </button>
=======
                        <button className="action-btn" onClick={() => generatePDF(result)}>Download PDF</button>
>>>>>>> 02a5fd89dbe3a01498e503f254e4b6741c8cc78b
                      </>
                    ) : (
                      <p>
                        Result incomplete: Waiting for all 4 subjects to be
                        approved.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p>No results available yet.</p>
            )}
          </section>
        )}

        {/* Admin Login */}
        {role === "admin" && !adminLoggedIn && (
          <section className="dashboard-section">
            <h2 className="section-title">Admin Login</h2>
            <form className="form-container" onSubmit={handleAdminLogin}>
              <input
                className="input-field"
                placeholder="Username"
                value={adminForm.username}
                onChange={(e) =>
                  setAdminForm({ ...adminForm, username: e.target.value })
                }
              />
              <input
                className="input-field"
                type="password"
                placeholder="Password"
                value={adminForm.password}
                onChange={(e) =>
                  setAdminForm({ ...adminForm, password: e.target.value })
                }
              />
              <button className="submit-btn" type="submit">
                Login
              </button>
            </form>
          </section>
        )}

        {/* Admin Dashboard */}
        {role === "admin" && adminLoggedIn && (
          <section className="dashboard-section">
            <h2 className="section-title">Admin Dashboard</h2>
            <div className="dashboard-stats">
              <p>
                Total Results: {dashboardData.totalResults || 0} | Pending
                Marks: {dashboardData.pendingMarks || 0}
              </p>
              <h3 className="subtitle">Analytics</h3>
              <p>
                Total Students: {analytics.totalStudents || 0} | Passed:{" "}
                {analytics.passed || 0} | Failed: {analytics.failed || 0} | Avg
                Percentage: {analytics.avgPercentage || 0}%
              </p>
              <h3 className="subtitle">Lecturer Stats</h3>
              <ul className="stats-list">
                {lecturerStats.map((stat) => (
                  <li key={stat._id}>
                    {stat.name}: {stat.count} submissions
                  </li>
                ))}
              </ul>
            </div>

            <div className="form-section">
              <h3 className="subtitle">Bulk Upload Results</h3>
              <form className="form-container" onSubmit={handleBulkUpload}>
                <input
                  className="file-input"
                  type="file"
                  accept=".csv"
                  onChange={(e) => setBulkFile(e.target.files[0])}
                />
                <button className="submit-btn" type="submit">
                  Upload CSV
                </button>
              </form>
              <p className="form-note">
                CSV Format:
                name,registerNumber,semester,branch,subject_1,subject_2,...
              </p>
            </div>

            {editResult && (
              <div className="form-section">
                <h3 className="subtitle">Edit Result</h3>
                <form className="form-container" onSubmit={handleEditSubmit}>
                  <input
                    className="input-field"
                    placeholder="Name"
                    value={editResult.name}
                    onChange={(e) =>
                      setEditResult({ ...editResult, name: e.target.value })
                    }
                  />
                  <input
                    className="input-field"
                    placeholder="Register Number"
                    value={editResult.registerNumber}
                    onChange={(e) =>
                      setEditResult({
                        ...editResult,
                        registerNumber: e.target.value,
                      })
                    }
                  />
                  <input
                    className="input-field"
                    placeholder="Semester"
                    value={editResult.semester}
                    onChange={(e) =>
                      setEditResult({ ...editResult, semester: e.target.value })
                    }
                  />
                  <input
                    className="input-field"
                    placeholder="Branch"
                    value={editResult.branch}
                    onChange={(e) =>
                      setEditResult({ ...editResult, branch: e.target.value })
                    }
                  />
                  {editResult.subjects.map((subject, index) => (
                    <div key={index} className="subject-row">
                      <input
                        className="input-field"
                        placeholder={`Subject ${index + 1}`}
                        value={subject.subjectName}
                        onChange={(e) => {
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
                        onChange={(e) => {
                          const updated = [...editResult.subjects];
                          updated[index].marks = parseInt(e.target.value) || 0;
                          setEditResult({ ...editResult, subjects: updated });
                        }}
                      />
                    </div>
                  ))}
                  <button className="submit-btn" type="submit">
                    Update Result
                  </button>
                  <button
                    className="secondary-btn"
                    type="button"
                    onClick={() => setEditResult(null)}
                  >
                    Cancel
                  </button>
                </form>
              </div>
            )}

            <div className="table-section">
              <h3 className="subtitle">Pending Sessional Marks</h3>
              // Modified pending marks table
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Register Number</th>
                    <th>Subject</th>
                    <th>Marks</th>
                    <th>Attendance</th>
                    <th>Sessional</th>
                    <th>Email</th>
                    <th>Lecturer</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingMarks.map((mark) => (
                    <tr key={mark._id}>
                      <td>{mark.name}</td>
                      <td>{mark.registerNumber}</td>
                      <td>{mark.subjectName}</td>
                      <td>{mark.marks}</td>
                      <td>{mark.attendance}%</td>{" "}
                      {/* Added percentage symbol */}
                      <td>{mark.sessionalType}</td>
                      <td>{mark.studentEmail}</td>
                      <td>{mark.lecturerId?.name || "Unknown"}</td>
                      <td>
                        <button
                          className="action-btn approve"
                          onClick={() => handleApproval(mark._id, "approve")}
                        >
                          Approve
                        </button>
                        <button
                          className="action-btn reject"
                          onClick={() => handleApproval(mark._id, "reject")}
                        >
                          Reject
                        </button>
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
                  {results.map((result) => (
                    <tr key={result._id}>
                      <td>{result.name}</td>
                      <td>{result.registerNumber}</td>
                      <td>{result.semester}</td>
                      <td>
                        <button
                          className="action-btn edit"
                          onClick={() => setEditResult(result)}
                        >
                          Edit
                        </button>
                        <button
                          className="action-btn delete"
                          onClick={() => handleDelete(result._id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Lecturer Login */}
        {role === "lecturer" && !lecturerLoggedIn && (
          <section className="dashboard-section">
            <h2 className="section-title">Lecturer Login</h2>
            <form className="form-container" onSubmit={handleLecturerLogin}>
              <input
                className="input-field"
                placeholder="Email"
                value={lecturerForm.email}
                onChange={(e) =>
                  setLecturerForm({ ...lecturerForm, email: e.target.value })
                }
              />
              <input
                className="input-field"
                type="password"
                placeholder="Password"
                value={lecturerForm.password}
                onChange={(e) =>
                  setLecturerForm({ ...lecturerForm, password: e.target.value })
                }
              />
              <button className="submit-btn" type="submit">
                Login
              </button>
            </form>
          </section>
        )}

        {/* Lecturer Dashboard */}
        {role === "lecturer" && lecturerLoggedIn && (
          <section className="dashboard-section">
           <h2 className="section-title">Welcome {lecturerName}!!</h2>
            <div className="dashboard-stats">
              <p>
                Submitted Marks: {dashboardData.submittedMarks?.length || 0}
              </p>
            </div>
            <div className="form-section">
              <h3 className="subtitle">Add Sessional Marks</h3>
              <form className="form-container" onSubmit={handleSessionalSubmit}>
                <input
                  className="input-field"
                  placeholder="Name"
                  value={sessionalForm.name}
                  onChange={(e) =>
                    setSessionalForm({ ...sessionalForm, name: e.target.value })
                  }
                />
                <input
                  className="input-field"
                  placeholder="Register Number"
                  value={sessionalForm.registerNumber}
                  onChange={(e) =>
                    setSessionalForm({
                      ...sessionalForm,
                      registerNumber: e.target.value,
                    })
                  }
                />

                {/* Semester Selection */}
                <select
                  className="input-field"
                  value={sessionalForm.semester}
                  onChange={(e) =>
                    setSessionalForm({
                      ...sessionalForm,
                      semester: e.target.value,
                    })
                  }
                >
                  <option value="">Select Semester</option>
                  <option value="Semester 1">Semester 1</option>
                  <option value="Semester 2">Semester 2</option>
                  <option value="Semester 3">Semester 3</option>
                  <option value="Semester 4">Semester 4</option>
                  <option value="Semester 5">Semester 5</option>
                  <option value="Semester 6">Semester 6</option>
                </select>

                {/* Branch Selection */}
                <select
                  className="input-field"
                  value={sessionalForm.branch}
                  onChange={(e) =>
                    setSessionalForm({
                      ...sessionalForm,
                      branch: e.target.value,
                    })
                  }
                >
                  <option value="">Select Branch</option>
                  <option value="Civil">Civil</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Electrical and Electronics">
                    Electrical and Electronics
                  </option>
                  <option value="Electrical and Communication">
                    Electrical and Communication
                  </option>
                  <option value="Mechanical Engineering">
                    Mechanical Engineering
                  </option>
                  <option value="ADFT">ADFT</option>
                </select>

                <select
                  className="input-field"
                  placeholder="Subject Name"
                  value={sessionalForm.subjectName}
                  onChange={(e) =>
                    setSessionalForm({
                      ...sessionalForm,
                      subjectName: e.target.value,
                    })
                  }
                >
                  <option value="">Select Subject</option>
                  <option value="DSP">Data Structure with Python</option>
                  <option value="Java">Java</option>
                  <option value="OSA">
                    Operating System and Administartion
                  </option>
                  <option value="SE">Software Engineering</option>
                </select>

                <input
                  className="input-field"
                  type="number"
                  placeholder="Marks (0-100)"
                  value={sessionalForm.marks}
                  onChange={(e) =>
                    setSessionalForm({
                      ...sessionalForm,
                      marks: Math.min(
                        100,
                        Math.max(0, parseInt(e.target.value) || 0)
                      ),
                    })
                  }
                />

                <input
                  className="input-field"
                  type="number"
                  placeholder="Attendance in %"
                  value={sessionalForm.attendance}
                  onChange={(e) =>
                    setSessionalForm({
                      ...sessionalForm,
                      attendance: Math.min(
                        100,
                        Math.max(0, parseInt(e.target.value) || 0)
                      ),
                    })
                  }
                />

                {/* Sessional Type Selection */}
                <select
                  className="input-field"
                  value={sessionalForm.sessionalType}
                  onChange={(e) =>
                    setSessionalForm({
                      ...sessionalForm,
                      sessionalType: e.target.value,
                    })
                  }
                >
                  <option value="">Select Sessional Type</option>
                  <option value="Sessional 1">Sessional 1</option>
                  <option value="Sessional 2">Sessional 2</option>
                  <option value="Sessional 3">Sessional 3</option>
                </select>

                <input
                  className="input-field"
                  placeholder="Student Email"
                  value={sessionalForm.studentEmail}
                  onChange={(e) =>
                    setSessionalForm({
                      ...sessionalForm,
                      studentEmail: e.target.value,
                    })
                  }
                  required
                />

                <button className="submit-btn" type="submit">
                  Submit Marks
                </button>
              </form>
            </div>
            <div className="table-section">
              <h3 className="subtitle">Your Submissions</h3>
              <ul className="submission-list">
                {dashboardData.submittedMarks?.map((mark) => (
                  <li key={mark._id}>
                    {mark.name}
                    {mark.registerNumber} - {mark.subjectName} (
                    {mark.sessionalType}): {mark.attendance} {mark.marks} to{" "}
                    {mark.studentEmail} ({mark.status})
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
