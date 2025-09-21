import React, { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import WeatherMap from './WeatherMap';

type Reading = {
  pm10?: number;
  pm25?: number;
  co2?: number;
  humidity?: number;
  temperature?: number;
  timestamp?: string;
};

type WeatherData = {
  city?: string;
  temperature?: number;
  humidity?: number;
  wind?: number;
};

const Dashboard: React.FC = () => {
  const { colors } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [statusText, setStatusText] = useState('Backend: Disconnected');
  const [reading, setReading] = useState<Reading>({});
  const [weatherData, setWeatherData] = useState<WeatherData>({
    city: 'Delhi',
    temperature: 28,
    humidity: 65,
    wind: 10
  });
  const [cityInput, setCityInput] = useState('');
  const [email, setEmail] = useState('');
  const [savedEmail, setSavedEmail] = useState('');
  
  // Check if user is already authenticated
  useEffect(() => {
    const token = localStorage.getItem('ACCESS_TOKEN');
    if (token) {
      setIsAuthenticated(true);
      const savedUserEmail = localStorage.getItem('USER_EMAIL');
      if (savedUserEmail) {
        setSavedEmail(savedUserEmail);
      }
    }
  }, []);

  const fetchLatest = async () => {
    try {
      setStatusText('Checking...');
      // Try to connect to the Flask backend with a timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const res = await fetch('http://localhost:4000/readings', {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const last = Array.isArray(data) ? (data[data.length - 1] || {}) : data;
      setReading(last as Reading);
      setStatusText('Backend: Connected');
    } catch (e) {
      console.error('Backend connection error:', e);
      setStatusText('Backend: Disconnected');
      setReading({});
    }
  };

  const checkWeather = async () => {
    if (cityInput) {
      try {
        // Ensure OpenWeatherMap API key is set in localStorage
        if (!localStorage.getItem('OWM_KEY')) {
          localStorage.setItem('OWM_KEY', '0ed03441c5022238438f3b1788f82eb9');
        }
        
        const apiKey = localStorage.getItem('OWM_KEY');
        
        // Get the backend URL from the status text
        const backendUrl = statusText.includes('http://localhost:') 
          ? statusText.match(/http:\/\/localhost:\d+/)?.[0] 
          : 'http://localhost:4000';
        
        const response = await fetch(`${backendUrl}/weather?city=${cityInput}&api_key=${apiKey}`);
        if (!response.ok) throw new Error('Weather API error');
        
        const data = await response.json();
        setWeatherData({
          city: cityInput,
          temperature: data.temperature || data.main?.temp,
          humidity: data.humidity || data.main?.humidity,
          wind: data.wind || data.wind?.speed
        });
        
        // Update HTML elements with IDs
        const tempElement = document.getElementById('weatherTemp');
        const humidityElement = document.getElementById('weatherHumidity');
        const windElement = document.getElementById('weatherWind');
        
        if (tempElement) tempElement.textContent = `${data.temperature || data.main?.temp}°C`;
        if (humidityElement) humidityElement.textContent = `${data.humidity || data.main?.humidity}%`;
        if (windElement) windElement.textContent = `${data.wind || data.wind?.speed} km/h`;
      } catch (error) {
        console.error('Failed to fetch weather data:', error);
        alert('Failed to fetch weather data. Please check your API key and city name.');
      }
      setCityInput('');
    }
  };

  const saveEmail = () => {
    if (email) {
      localStorage.setItem('USER_EMAIL', email);
      setSavedEmail(email);
      setEmail('');
    }
  };
  
  const handleLogin = async () => {
    try {
      // Get the backend URL from the status text
      const backendUrl = statusText.includes('http://localhost:') 
        ? statusText.match(/http:\/\/localhost:\d+/)?.[0] 
        : 'http://localhost:4000';
      
      const response = await fetch(`${backendUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      
      if (!response.ok) {
        throw new Error('Login failed');
      }
      
      const data = await response.json();
      localStorage.setItem('ACCESS_TOKEN', data.token);
      setIsAuthenticated(true);
      setUsername('');
      setPassword('');
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed. Please check your credentials. Use any username with password "password"');
    }
  };
  
  const handleLogout = () => {
    localStorage.removeItem('ACCESS_TOKEN');
    setIsAuthenticated(false);
  };

  useEffect(() => {
    fetchLatest();
    
    // Set API key if not already set
    if (!localStorage.getItem('weatherApiKey')) {
      localStorage.setItem('weatherApiKey', '0ed03441c5022238438f3b1788f82eb9');
    }
    
    // Load saved email if exists
    const storedEmail = localStorage.getItem('userEmail');
    if (storedEmail) {
      setSavedEmail(storedEmail);
    }
  }, []);

  const cardStyle = {
    backgroundColor: colors.cardBg,
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  };

  const gridItemStyle = {
    backgroundColor: colors.cardBg,
    padding: '15px',
    borderRadius: '6px',
    textAlign: 'center' as const,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  };

  const buttonStyle = {
    backgroundColor: colors.buttonBg,
    color: colors.buttonText,
    border: 'none',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
  };

  const inputStyle = {
    padding: '8px',
    borderRadius: '4px',
    border: `1px solid ${colors.primary}`,
    marginRight: '10px',
  };

  return (
    <div style={{ padding: '20px', color: colors.text, backgroundColor: colors.background }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Air Quality Dashboard</h1>
        <div>
          {isAuthenticated ? (
            <>
              <span style={{ marginRight: '10px' }}>User: {savedEmail || 'Authenticated User'}</span>
              <button
                onClick={handleLogout}
                style={{
                  padding: '5px 10px',
                  backgroundColor: colors.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Sign Out
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ 
                  marginRight: '5px',
                  padding: '5px',
                  borderRadius: '4px',
                  border: `1px solid ${colors.border}`
                }}
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ 
                  marginRight: '5px',
                  padding: '5px',
                  borderRadius: '4px',
                  border: `1px solid ${colors.border}`
                }}
              />
              <button
                onClick={handleLogin}
                style={{
                  padding: '5px 10px',
                  backgroundColor: colors.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Sign In
              </button>
            </div>
          )}
          <button
            onClick={() => {}}
            style={{
              marginLeft: '10px',
              padding: '5px 10px',
              backgroundColor: colors.secondary,
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Theme
          </button>
        </div>
      </div>
      <div style={{ 
        padding: '10px', 
        backgroundColor: statusText.includes('Connected') ? '#4caf50' : '#f44336',
        color: 'white',
        borderRadius: '4px',
        display: 'inline-block',
        marginBottom: '20px'
      }}>
        {statusText}
      </div>
      <button
        onClick={fetchLatest}
        style={{
          marginLeft: '10px',
          padding: '5px 10px',
          backgroundColor: colors.primary,
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Refresh
      </button>

      {isAuthenticated ? (
        <>
          <div style={{ ...cardStyle }}>
            <h2 style={{ color: colors.primary, marginTop: 0 }}>Live Data</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
              <div style={gridItemStyle}><div>PM10</div><div id="pm10">{reading.pm10 ?? '-'}</div></div>
              <div style={gridItemStyle}><div>PM2.5</div><div id="pm25">{reading.pm25 ?? '-'}</div></div>
              <div style={gridItemStyle}><div>CO2</div><div id="co2">{reading.co2 ?? '-'}</div></div>
              <div style={gridItemStyle}><div>Humidity</div><div id="humidity">{reading.humidity ?? '-'}</div></div>
              <div style={gridItemStyle}><div>Temperature</div><div id="temperature">{reading.temperature ?? '-'}</div></div>
            </div>
          </div>

          <div style={{ ...cardStyle }}>
            <h2 style={{ color: colors.primary, marginTop: 0 }}>Weather</h2>
            <div style={{ marginBottom: '15px' }}>
              <input 
                type="text" 
                placeholder="Enter city (e.g., Delhi)" 
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                style={inputStyle}
              />
              <button onClick={checkWeather} style={buttonStyle}>Check Weather</button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: '20px' }}>
              <div style={gridItemStyle}><div>City</div><div>{weatherData.city ?? '-'}</div></div>
              <div style={gridItemStyle}><div>Temperature</div><div id="weatherTemp">{weatherData.temperature ?? '-'}°C</div></div>
              <div style={gridItemStyle}><div>Humidity</div><div id="weatherHumidity">{weatherData.humidity ?? '-'}%</div></div>
              <div style={gridItemStyle}><div>Wind</div><div id="weatherWind">{weatherData.wind ?? '-'} km/h</div></div>
            </div>
            
            <WeatherMap city={weatherData.city} />
          </div>

          {/* Email Section */}
          <div style={{ ...cardStyle }}>
            <h2 style={{ color: colors.primary, marginTop: 0 }}>User Profile</h2>
            <div style={{ marginBottom: '15px' }}>
              <input 
                type="email" 
                placeholder="Enter your email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
              />
              <button onClick={saveEmail} style={buttonStyle}>Save Email</button>
            </div>
            
            {savedEmail && (
              <div style={{ marginTop: '10px' }}>
                <p>Your email: <strong>{savedEmail}</strong></p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '40px 20px' }}>
          <h2 style={{ color: colors.primary, marginTop: 0 }}>Please Sign In</h2>
          <p>You need to sign in to view the dashboard and weather data.</p>
        </div>
      )}
      </>
      )}
    </div>
  );
};

export default Dashboard;