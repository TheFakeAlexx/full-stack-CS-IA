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

// Admin Component
const Admin = () => {
  const [allUsers, setAllUsers] = useState([]);
  const [unapprovedUsers, setUnapprovedUsers] = useState([]);
  const [error, setError] = useState('');
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

  useEffect(() => {
    fetchAllUsers();
    fetchUnapprovedUsers();
  }, []);

  const approveUser = async (id) => {
    try {
      await axios.post(`http://localhost:5000/api/admin/approve/${id}`, {}, {
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

  if (error) return <div className="error">{error}</div>;

  return (
    <div className="admin-container">
      <button className="back-btn" onClick={() => window.location.href = '/'}>Back to Dashboard</button>
      <h2>Admin Dashboard</h2>

      <section>
        <h3>Users Awaiting Approval</h3>
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
                    <button className="approve-btn" onClick={() => approveUser(user._id)}>Approve</button>
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
        {/* Add other routes like /add-activity, /profile, etc. */}
      </Routes>
    </Router>
  );
};

export default App;
