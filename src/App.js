import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Link, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './App.css'; // Import your CSS

// Helper to get token and role from localStorage
const getToken = () => localStorage.getItem('token');
const getRole = () => localStorage.getItem('role');

// Mock user authentication (replace with real JWT or session from Express)
const isAuthenticated = () => {
  return getToken() !== null;
};

// Home Page Component
const HomePage = () => {
  const [stats, setStats] = useState({
    creativity: { hours: 0, goal: 25 },
    activity: { hours: 0, goal: 25 },
    service: { hours: 0, goal: 25 }
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/user/stats', {
          headers: { Authorization: `Bearer ${getToken()}` }
        });
        setStats(response.data);
      } catch (err) {
        setError('Failed to load stats');
      }
    };

    const fetchActivities = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/activities/recent', {
          headers: { Authorization: `Bearer ${getToken()}` }
        });
        setRecentActivities(response.data.slice(0, 5));
      } catch (err) {
        setError('Failed to load activities');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    fetchActivities();
  }, []);

  const ProgressBar = ({ category, hours, goal }) => {
    const percentage = (hours / goal) * 100;
    return (
      <div className="progress-bar">
        <h3>{category.charAt(0).toUpperCase() + category.slice(1)}: {hours}/{goal} hours</h3>
        <div className="bar-container">
          <div className="bar" style={{ width: `${percentage}%` }}></div>
        </div>
        <span>{Math.round(percentage)}% complete</span>
      </div>
    );
  };

  if (loading) return <div className="loading">Loading your CAS dashboard...</div>;
  if (error) return <div className="error">Error: {error}. Please try again.</div>;

  return (
    <div className="App">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="nav-brand">
          <Link to="/">CAS Tracker</Link>
        </div>
        <ul className="nav-links">
          <li><Link to="/">Dashboard</Link></li>
          <li><Link to="/add-activity">Add Activity</Link></li>
          <li><Link to="/profile">Profile</Link></li>
          <li><Link to="/logout" onClick={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('role');
            window.location.href = '/login';
          }}>Logout</Link></li>
          {getRole() === 'admin' && <li><Link to="/admin">Admin</Link></li>}
          {getRole() === 'teacher' && <li><Link to="/teacher">Teacher</Link></li>}
          {getRole() === 'student' && <li><Link to="/student">Student Portal</Link></li>}
        </ul>
      </nav>

      {/* Hero Section */}
      <header className="hero">
        <h1>Welcome to Your CAS Journey</h1>
        <p>Track your Creativity, Activity, and Service experiences to meet IB requirements.</p>
        <button className="cta-button" onClick={() => {/* Open modal for quick add */}}>
          Quick Add Activity
        </button>
      </header>

      {/* Dashboard Stats */}
      <section className="dashboard">
        <h2>Your Progress</h2>
        <div className="stats-grid">
          <ProgressBar category="creativity" hours={stats.creativity.hours} goal={stats.creativity.goal} />
          <ProgressBar category="activity" hours={stats.activity.hours} goal={stats.activity.goal} />
          <ProgressBar category="service" hours={stats.service.hours} goal={stats.service.goal} />
        </div>
        {stats.creativity.hours + stats.activity.hours + stats.service.hours >= 150 ? (
          <div className="achievement">🎉 Congratulations! You've met your CAS goals!</div>
        ) : null}
      </section>

      {/* Recent Activities */}
      <section className="recent-activities">
        <h2>Recent Activities</h2>
        {recentActivities.length === 0 ? (
          <p>No activities yet. <Link to="/add-activity">Add one now!</Link></p>
        ) : (
          <ul className="activities-list">
            {recentActivities.map((activity) => (
              <li key={activity.id} className="activity-item">
                <strong>{activity.title}</strong> - {activity.category} ({activity.hours} hours)
                <br />
                <small>{new Date(activity.date).toLocaleDateString()}</small>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Footer */}
      <footer className="footer">
        <p>&copy; Shivam & Jaanav Inc</p>
      </footer>
    </div>
  );
};

// Login Component
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', { email, password });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('role', response.data.role);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="auth-container">
      <h2>Login</h2>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleSubmit} className="auth-form">
        <label>Email:</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        <label>Password:</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        <button type="submit">Login</button>
      </form>
      <p>Don't have an account? <Link to="/signup">Sign up here</Link></p>
      <p><Link to="/forgot-password">Forgot Password?</Link></p>
    </div>
  );
};

// Password strength validation function
const validatePasswordStrength = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  return password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
};

// Signup Component
const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordStrength, setPasswordStrength] = useState('');
  const navigate = useNavigate();

  const handlePasswordChange = (e) => {
    const pwd = e.target.value;
    setPassword(pwd);
    if (pwd.length === 0) {
      setPasswordStrength('');
    } else if (validatePasswordStrength(pwd)) {
      setPasswordStrength('excellent');
    } else {
      setPasswordStrength('weak');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!email.endsWith('@fountainheadschools.org')) {
      setError('Email must be @fountainheadschools.org');
      return;
    }
    if (passwordStrength !== 'excellent') {
      setError('Password must be excellent strength.');
      return;
    }
    try {
      await axios.post('http://localhost:5000/api/auth/signup', { email, password });
      setSuccess('Signup successful! Await admin approval.');
      setEmail('');
      setPassword('');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed');
    }
  };

  return (
    <div className="auth-container">
      <h2>Sign Up</h2>
      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}
      <form onSubmit={handleSubmit} className="auth-form">
        <label>Email:</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        <label>Password:</label>
        <input type="password" value={password} onChange={handlePasswordChange} required />
        {password && (
          <div className={`password-strength ${passwordStrength}`}>
            Password strength: {passwordStrength === 'excellent' ? 'Excellent' : 'Weak'}
          </div>
        )}
        <button type="submit" disabled={passwordStrength !== 'excellent'}>Sign Up</button>
      </form>
      <p>Already have an account? <Link to="/login">Login here</Link></p>
      <p><Link to="/forgot-password">Forgot Password?</Link></p>
    </div>
  );
};

// ForgotPassword Component
const ForgotPassword = () => {
  const [step, setStep] = useState(1); // 1: email, 2: otp, 3: new password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordStrength, setPasswordStrength] = useState('');
  const navigate = useNavigate();

  const handlePasswordChange = (e) => {
    const pwd = e.target.value;
    setNewPassword(pwd);
    if (pwd.length === 0) {
      setPasswordStrength('');
    } else if (validatePasswordStrength(pwd)) {
      setPasswordStrength('excellent');
    } else {
      setPasswordStrength('weak');
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await axios.post('http://localhost:5000/api/auth/forgot-password', { email });
      setSuccess('OTP sent to your email');
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await axios.post('http://localhost:5000/api/auth/verify-otp', { email, otp });
      setSuccess('OTP verified');
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (passwordStrength !== 'excellent') {
      setError('Password must be excellent strength.');
      return;
    }
    try {
      await axios.post('http://localhost:5000/api/auth/reset-password', { email, otp, newPassword });
      setSuccess('Password reset successfully');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
    }
  };

  return (
    <div className="auth-container">
      <h2>Forgot Password</h2>
      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      {step === 1 && (
        <form onSubmit={handleSendOtp} className="auth-form">
          <label>Email:</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          <button type="submit">Send OTP</button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleVerifyOtp} className="auth-form">
          <label>OTP:</label>
          <input type="text" value={otp} onChange={e => setOtp(e.target.value)} required />
          <button type="submit">Verify OTP</button>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={handleResetPassword} className="auth-form">
          <label>New Password:</label>
          <input type="password" value={newPassword} onChange={handlePasswordChange} required />
          {newPassword && (
            <div className={`password-strength ${passwordStrength}`}>
              Password strength: {passwordStrength === 'excellent' ? 'Excellent' : 'Weak'}
            </div>
          )}
          <button type="submit" disabled={passwordStrength !== 'excellent'}>Reset Password</button>
        </form>
      )}

      <p><Link to="/login">Back to Login</Link></p>
    </div>
  );
};

// Student Component
const Student = () => {
  const [projects, setProjects] = useState([]);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: [],
    location: '',
    startDate: '',
    endDate: '',
    learningOutcomes: [],
    unGoals: [],
    investigation: '',
    learnerProfile: '',
    supervisorName: '',
    status: ''
  });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const token = getToken();

  const categories = ['Creativity', 'Activity', 'Service'];
  const locations = ['In the school', 'Outside'];
  const learningOutcomesList = [
    'LO1 - Identify own strengths and develop areas for growth',
    'LO2 - Demonstrate that challenges have been undertaken, developing new skills',
    'LO3 - Initiate and plan a CAS experience',
    'LO4 - Show perseverance and commitment in CAS experience',
    'LO5 - Demonstrate skills and benefits of working collaboratively',
    'LO6 - Engagement with issues of global significance',
    'LO7 - Recognise and consider the ethics of choices and actions'
  ];
  const unGoalsList = [
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
  ];
  const statuses = ['For approval', 'In progress'];

  const fetchProjects = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/student/projects', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProjects(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load projects');
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleCheckboxChange = (field, value) => {
    const currentValues = formData[field];
    if (currentValues.includes(value)) {
      setFormData({ ...formData, [field]: currentValues.filter(item => item !== value) });
    } else {
      setFormData({ ...formData, [field]: [...currentValues, value] });
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    const videoFiles = files.filter(file => file.type.startsWith('video/'));

    if (imageFiles.length > 5) {
      setError('Maximum 5 photos allowed');
      return;
    }
    if (videoFiles.length > 2) {
      setError('Maximum 2 videos allowed');
      return;
    }
    if (files.length > 7) {
      setError('Maximum 7 files total (5 photos + 2 videos)');
      return;
    }

    setSelectedFiles(files);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!formData.title || !formData.description || formData.category.length === 0 ||
        !formData.location || !formData.startDate || !formData.endDate ||
        formData.learningOutcomes.length === 0 || formData.unGoals.length === 0 ||
        !formData.investigation || !formData.learnerProfile || !formData.supervisorName || !formData.status) {
      setError('Please fill in all required fields');
      return;
    }

    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      setError('End date must be after start date');
      return;
    }

    try {
      const formDataToSend = new FormData();

      // Add form data
      Object.keys(formData).forEach(key => {
        if (Array.isArray(formData[key])) {
          formData[key].forEach(value => formDataToSend.append(key, value));
        } else {
          formDataToSend.append(key, formData[key]);
        }
      });

      // Add files
      selectedFiles.forEach(file => {
        formDataToSend.append('evidence', file);
      });

      await axios.post('http://localhost:5000/api/student/submit-project', formDataToSend, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setSuccess('Project submitted successfully!');
      setFormData({
        title: '',
        description: '',
        category: [],
        location: '',
        startDate: '',
        endDate: '',
        learningOutcomes: [],
        unGoals: [],
        investigation: '',
        learnerProfile: '',
        supervisorName: '',
        status: ''
      });
      setSelectedFiles([]);
      setShowSubmitForm(false);
      fetchProjects();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit project');
    }
  };

  if (error && !showSubmitForm) return <div className="error">{error}</div>;

  return (
    <div className="student-container">
      <button className="back-btn" onClick={() => window.location.href = '/'}>Back to Dashboard</button>
      <h2>Student CAS Portal</h2>

      <div className="student-actions">
        <button className="submit-project-btn" onClick={() => setShowSubmitForm(!showSubmitForm)}>
          {showSubmitForm ? 'Cancel' : 'Submit New CAS Project'}
        </button>
      </div>

      {showSubmitForm && (
        <div className="cas-form-container">
          <h3>Submit CAS Project</h3>
          {error && <div className="error">{error}</div>}
          {success && <div className="success">{success}</div>}
          <form onSubmit={handleSubmit} className="cas-form">
            <div className="form-group">
              <label>Title for CAS:</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Describe the experience:</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="4"
                required
              />
            </div>

            <div className="form-group">
              <label>Category (select all that apply):</label>
              <div className="checkbox-group">
                {categories.map(cat => (
                  <label key={cat} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.category.includes(cat)}
                      onChange={() => handleCheckboxChange('category', cat)}
                    />
                    {cat}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Location:</label>
              <select name="location" value={formData.location} onChange={handleInputChange} required>
                <option value="">Select location</option>
                {locations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Date (from which date to what date):</label>
              <div className="date-group">
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  required
                />
                <span>to</span>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Learning Outcomes (select all that apply):</label>
              <div className="checkbox-group">
                {learningOutcomesList.map(lo => (
                  <label key={lo} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.learningOutcomes.includes(lo)}
                      onChange={() => handleCheckboxChange('learningOutcomes', lo)}
                    />
                    {lo}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Goals aligned with UN SDGs (select all that apply):</label>
              <div className="checkbox-group">
                {unGoalsList.map(goal => (
                  <label key={goal} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.unGoals.includes(goal)}
                      onChange={() => handleCheckboxChange('unGoals', goal)}
                    />
                    {goal}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Investigation:</label>
              <textarea
                name="investigation"
                value={formData.investigation}
                onChange={handleInputChange}
                rows="3"
                required
              />
            </div>

            <div className="form-group">
              <label>Learner Profile:</label>
              <textarea
                name="learnerProfile"
                value={formData.learnerProfile}
                onChange={handleInputChange}
                rows="3"
                required
              />
            </div>

            <div className="form-group">
              <label>Name of the supervisor:</label>
              <input
                type="text"
                name="supervisorName"
                value={formData.supervisorName}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Status of CAS:</label>
              <select name="status" value={formData.status} onChange={handleInputChange} required>
                <option value="">Select status</option>
                {statuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Evidence (Upload up to 5 photos and 2 videos):</label>
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="file-input"
              />
              {selectedFiles.length > 0 && (
                <div className="file-preview">
                  <p>Selected files ({selectedFiles.length}):</p>
                  <ul>
                    {selectedFiles.map((file, index) => (
                      <li key={index}>
                        {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <button type="submit" className="submit-btn">Submit Project</button>
          </form>
        </div>
      )}

      <section>
        <h3>My CAS Projects</h3>
        {projects.length === 0 ? (
          <div className="no-projects">
            <p>No projects submitted yet.</p>
          </div>
        ) : (
          projects.map(project => (
            <div key={project._id} className={`project-card ${project.approved ? 'approved' : ''}`}>
              <h4>{project.title}</h4>
              <p><strong>Description:</strong> {project.description}</p>
              <p><strong>Category:</strong> {project.category.join(', ')}</p>
              <p><strong>Location:</strong> {project.location}</p>
              <p><strong>Duration:</strong> {new Date(project.startDate).toLocaleDateString()} - {new Date(project.endDate).toLocaleDateString()}</p>
              <p><strong>Status:</strong> {project.status}</p>
              <p><strong>Approved:</strong> <span className={`status ${project.approved ? 'approved' : 'pending'}`}>{project.approved ? 'Yes' : 'No'}</span></p>
              {project.evidence && project.evidence.length > 0 && (
                <div className="evidence-section">
                  <p><strong>Evidence ({project.evidence.length} files):</strong></p>
                  <div className="evidence-files">
                    {project.evidence.map((file, index) => (
                      <div key={index} className="evidence-file">
                        {file.mimetype.startsWith('image/') ? (
                          <img
                            src={`http://localhost:5000/uploads/${file.filename}`}
                            alt={file.originalName}
                            className="evidence-thumbnail"
                          />
                        ) : (
                          <video
                            src={`http://localhost:5000/uploads/${file.filename}`}
                            controls
                            className="evidence-video"
                          />
                        )}
                        <p className="file-name">{file.originalName}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {project.approved && project.teacherComments && (
                <p><strong>Teacher Comments:</strong> {project.teacherComments}</p>
              )}
            </div>
          ))
        )}
      </section>
    </div>
  );
};

// Teacher Component
const Teacher = () => {
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState('');
  const [comments, setComments] = useState({});
  const token = getToken();

  const fetchProjects = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/teacher/projects', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProjects(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load projects');
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const approveProject = async (id) => {
    const projectComments = comments[id] || '';
    try {
      await axios.post(`http://localhost:5000/api/teacher/approve-project/${id}`, { teacherComments: projectComments }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchProjects();
      setComments({ ...comments, [id]: '' });
    } catch (err) {
      setError('Failed to approve project');
    }
  };

  const handleCommentChange = (id, value) => {
    setComments({ ...comments, [id]: value });
  };

  if (error) return <div className="error">{error}</div>;

  return (
    <div className="teacher-container">
      <button className="back-btn" onClick={() => window.location.href = '/'}>Back to Dashboard</button>
      <h2>Teacher Dashboard</h2>

      <section>
        <h3>CAS Projects in Your Section</h3>
        {projects.length === 0 ? (
          <div className="no-projects">
            <p>No projects submitted yet.</p>
          </div>
        ) : (
          projects.map(project => (
            <div key={project._id} className={`project-card ${project.approved ? 'approved' : ''}`}>
              <h4>{project.title}</h4>
              <p>{project.description}</p>
              <p className="student-info">Student: {project.student.email}</p>
              <p className="submitted-date">Submitted: {new Date(project.submittedAt).toLocaleDateString()}</p>
              <p><strong>Category:</strong> {project.category.join(', ')}</p>
              <p><strong>Location:</strong> {project.location}</p>
              <p><strong>Duration:</strong> {new Date(project.startDate).toLocaleDateString()} - {new Date(project.endDate).toLocaleDateString()}</p>
              <p><strong>Status:</strong> {project.status}</p>
              <p><strong>Learning Outcomes:</strong> {project.learningOutcomes.join(', ')}</p>
              <p><strong>UN Goals:</strong> {project.unGoals.join(', ')}</p>
              <p><strong>Supervisor:</strong> {project.supervisorName}</p>
              {project.approved && project.teacherComments && (
                <p><strong>Comments:</strong> {project.teacherComments}</p>
              )}
              {!project.approved && (
                <div className="project-actions">
                  <textarea
                    className="teacher-comments"
                    placeholder="Add comments (optional)"
                    value={comments[project._id] || ''}
                    onChange={(e) => handleCommentChange(project._id, e.target.value)}
                  />
                  <button className="approve-project-btn" onClick={() => approveProject(project._id)}>Approve Project</button>
                </div>
              )}
              {project.approved && (
                <div className="project-status">
                  <span className="status approved">Approved</span>
                </div>
              )}
            </div>
          ))
        )}
      </section>
    </div>
  );
};

// Admin Component
const Admin = () => {
  const [allUsers, setAllUsers] = useState([]);
  const [unapprovedUsers, setUnapprovedUsers] = useState([]);
  const [sections, setSections] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [error, setError] = useState('');
  const [selectedRole, setSelectedRole] = useState('student');
  const [newSectionName, setNewSectionName] = useState('');
  const [selectedTeacherForSection, setSelectedTeacherForSection] = useState('');
  const [selectedSectionForStudent, setSelectedSectionForStudent] = useState('');
  const [selectedStudentForSection, setSelectedStudentForSection] = useState('');
  const [selectedSectionForTeacher, setSelectedSectionForTeacher] = useState('');
  const [selectedTeacherForAssignment, setSelectedTeacherForAssignment] = useState('');
  const token = getToken();

  const fetchAllUsers = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/admin/all-users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAllUsers(response.data);
    } catch (err) {
      setError('Failed to load all users');
    }
  };

  const fetchUnapprovedUsers = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnapprovedUsers(response.data);
    } catch (err) {
      setError('Failed to load unapproved users');
    }
  };

  const fetchSections = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/admin/sections', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSections(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load sections');
    }
  };

  const fetchTeachersAndStudents = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/admin/all-users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const users = response.data;
      setTeachers(users.filter(user => user.role === 'teacher'));
      setStudents(users.filter(user => user.role === 'student'));
    } catch (err) {
      setError('Failed to load users');
    }
  };

  useEffect(() => {
    fetchAllUsers();
    fetchUnapprovedUsers();
    fetchTeachersAndStudents();
    fetchSections();
  }, []);

  const approveUser = async (id, role) => {
    try {
      await axios.post(`http://localhost:5000/api/admin/approve/${id}`, { role }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchAllUsers();
      fetchUnapprovedUsers();
    } catch (err) {
      setError('Failed to approve user');
    }
  };

  const deactivateUser = async (id) => {
    try {
      await axios.post(`http://localhost:5000/api/admin/deactivate/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchAllUsers();
    } catch (err) {
      setError('Failed to deactivate user');
    }
  };

  const reactivateUser = async (id) => {
    try {
      await axios.post(`http://localhost:5000/api/admin/reactivate/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchAllUsers();
    } catch (err) {
      setError('Failed to reactivate user');
    }
  };

  const createSection = async () => {
    if (!newSectionName || !selectedTeacherForSection) {
      setError('Section name and teacher are required');
      return;
    }
    try {
      await axios.post('http://localhost:5000/api/admin/create-section', {
        name: newSectionName,
        teacherId: selectedTeacherForSection
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNewSectionName('');
      setSelectedTeacherForSection('');
      fetchTeachersAndStudents();
      fetchSections();
    } catch (err) {
      setError('Failed to create section');
    }
  };

  const addStudentToSection = async () => {
    if (!selectedSectionForStudent || !selectedStudentForSection) {
      setError('Section and student are required');
      return;
    }
    try {
      await axios.post('http://localhost:5000/api/admin/add-student-to-section', {
        sectionId: selectedSectionForStudent,
        studentId: selectedStudentForSection
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedSectionForStudent('');
      setSelectedStudentForSection('');
      fetchTeachersAndStudents();
      fetchSections();
    } catch (err) {
      setError('Failed to add student to section');
    }
  };

  const assignTeacherToSection = async () => {
    if (!selectedSectionForTeacher || !selectedTeacherForAssignment) {
      setError('Section and teacher are required');
      return;
    }
    try {
      await axios.post('http://localhost:5000/api/admin/assign-teacher-to-section', {
        sectionId: selectedSectionForTeacher,
        teacherId: selectedTeacherForAssignment
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedSectionForTeacher('');
      setSelectedTeacherForAssignment('');
      fetchTeachersAndStudents();
      fetchSections();
    } catch (err) {
      setError('Failed to assign teacher to section');
    }
  };

  if (error) return <div className="error">{error}</div>;

  return (
    <div className="admin-container">
      <button className="back-btn" onClick={() => window.location.href = '/'}>Back to Dashboard</button>
      <h2>Admin Dashboard</h2>

      <section>
        <h3>Users Awaiting Approval</h3>
        <div className="role-selector">
          <label>Assign Role: </label>
          <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)}>
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
          </select>
        </div>
        {unapprovedUsers.length === 0 ? (
          <p>No users awaiting approval.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {unapprovedUsers.map(user => (
                <tr key={user._id}>
                  <td>{user.email}</td>
                  <td><span className="status pending">Pending</span></td>
                  <td>
                    <button className="approve-btn" onClick={() => approveUser(user._id, selectedRole)}>Approve as {selectedRole}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h3>All Users</h3>
        {allUsers.length === 0 ? (
          <p>No users found.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Approved</th>
                <th>Active</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {allUsers.map(user => (
                <tr key={user._id}>
                  <td>{user.email}</td>
                  <td><span className={`status ${user.approved ? 'approved' : 'pending'}`}>{user.approved ? 'Yes' : 'No'}</span></td>
                  <td><span className={`status ${user.active ? 'active' : 'inactive'}`}>{user.active ? 'Yes' : 'No'}</span></td>
                  <td>{user.role}</td>
                  <td>
                    {!user.approved && <button className="approve-btn" onClick={() => approveUser(user._id)}>Approve</button>}
                    {user.active && user.role !== 'admin' && <button className="deactivate-btn" onClick={() => deactivateUser(user._id)}>Deactivate</button>}
                    {!user.active && user.role !== 'admin' && <button className="reactivate-btn" onClick={() => reactivateUser(user._id)}>Reactivate</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="section-management">
        <h3>Section Management</h3>

        <div className="section-form">
          <h4>Create New Section</h4>
          <input
            type="text"
            placeholder="Section Name"
            value={newSectionName}
            onChange={e => setNewSectionName(e.target.value)}
          />
          <select value={selectedTeacherForSection} onChange={e => setSelectedTeacherForSection(e.target.value)}>
            <option value="">Select Teacher</option>
            {teachers.map(teacher => (
              <option key={teacher._id} value={teacher._id}>{teacher.email}</option>
            ))}
          </select>
          <button onClick={createSection}>Create Section</button>
        </div>

        <div className="section-form">
          <h4>Add Student to Section</h4>
          <select value={selectedSectionForStudent} onChange={e => setSelectedSectionForStudent(e.target.value)}>
            <option value="">Select Section</option>
            {sections.map(section => (
              <option key={section._id} value={section._id}>{section.name}</option>
            ))}
          </select>
          <select value={selectedStudentForSection} onChange={e => setSelectedStudentForSection(e.target.value)}>
            <option value="">Select Student</option>
            {students.map(student => (
              <option key={student._id} value={student._id}>{student.email}</option>
            ))}
          </select>
          <button onClick={addStudentToSection}>Add Student</button>
        </div>

        <div className="section-form">
          <h4>Assign Teacher to Section</h4>
          <select value={selectedSectionForTeacher} onChange={e => setSelectedSectionForTeacher(e.target.value)}>
            <option value="">Select Section</option>
            {sections.map(section => (
              <option key={section._id} value={section._id}>{section.name}</option>
            ))}
          </select>
          <select value={selectedTeacherForAssignment} onChange={e => setSelectedTeacherForAssignment(e.target.value)}>
            <option value="">Select Teacher</option>
            {teachers.map(teacher => (
              <option key={teacher._id} value={teacher._id}>{teacher.email}</option>
            ))}
          </select>
          <button onClick={assignTeacherToSection}>Assign Teacher</button>
        </div>
      </section>
    </div>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children, adminOnly = false }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  if (adminOnly && getRole() !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return children;
};

// Main App with Routing
const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        } />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/admin" element={
          <ProtectedRoute adminOnly={true}>
            <Admin />
          </ProtectedRoute>
        } />
        <Route path="/teacher" element={
          <ProtectedRoute>
            <Teacher />
          </ProtectedRoute>
        } />
        <Route path="/student" element={
          <ProtectedRoute>
            <Student />
          </ProtectedRoute>
        } />
        {/* Add other routes like /add-activity, /profile, etc. */}
      </Routes>
    </Router>
  );
};

export default App;
