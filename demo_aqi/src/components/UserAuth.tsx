import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const UserAuth: React.FC = () => {
  const { isAuthenticated, username, login, logout } = useAuth();
  const { colors } = useTheme();
  const [loginUsername, setLoginUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showLoginForm, setShowLoginForm] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginUsername && password) {
      await login(loginUsername, password);
      setLoginUsername('');
      setPassword('');
      setShowLoginForm(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const buttonStyle = {
    backgroundColor: colors.buttonBg,
    color: colors.buttonText,
    border: 'none',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    marginLeft: '10px',
  };

  const inputStyle = {
    padding: '8px',
    borderRadius: '4px',
    border: `1px solid ${colors.primary}`,
    marginRight: '10px',
  };

  const formStyle = {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
    padding: '15px',
    backgroundColor: colors.cardBg,
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    position: 'absolute' as const,
    top: '60px',
    right: '20px',
    zIndex: 10,
  };

  return (
    <div>
      {isAuthenticated ? (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ marginRight: '10px' }}>Welcome, {username}</span>
          <button onClick={handleLogout} style={buttonStyle}>Sign Out</button>
        </div>
      ) : (
        <div>
          <button 
            onClick={() => setShowLoginForm(!showLoginForm)} 
            style={buttonStyle}
          >
            Sign In
          </button>
          
          {showLoginForm && (
            <form onSubmit={handleLogin} style={formStyle}>
              <input
                type="text"
                placeholder="Username"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                style={inputStyle}
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
              />
              <button type="submit" style={buttonStyle}>Sign In</button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

export default UserAuth;