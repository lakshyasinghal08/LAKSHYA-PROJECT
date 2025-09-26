import React, { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';

type Reading = {
  pm1?: number;
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
  const { colors, toggleTheme } = useTheme();
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
  const [userDisplayName, setUserDisplayName] = useState('');
  const [userInfoOpen, setUserInfoOpen] = useState(false);
  const [missingDataAlert, setMissingDataAlert] = useState<string | null>(null);
  const [userCity, setUserCity] = useState('');
  
  // Check if user is already authenticated and load saved user info
  useEffect(() => {
    const token = localStorage.getItem('ACCESS_TOKEN');
    if (token) {
      setIsAuthenticated(true);
      
      // Load saved email
      const savedUserEmail = localStorage.getItem('USER_EMAIL');
      if (savedUserEmail) {
        setSavedEmail(savedUserEmail);
        setEmail(savedUserEmail);
      }
      
      // Load saved username
      const savedUsername = localStorage.getItem('USER_NAME');
      if (savedUsername) {
        setUserDisplayName(savedUsername);
      }
    }
  }, []);

  const fetchLatest = async () => {
    try {
      setStatusText('Checking...');
      // Try to connect to the Flask backend with a timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      // Connect directly to port 5000 as requested
      const ports = [5000];
      let connected = false;
      let data;
      
      for (const port of ports) {
        try {
          const res = await fetch(`http://localhost:${port}/readings`, {
            signal: controller.signal
          });
          
          if (res.ok) {
            data = await res.json();
            setStatusText(`Backend Connected (Port ${port})`);
            connected = true;
            break;
          }
        } catch (err) {
          console.log(`Failed to connect on port ${port}`);
        }
      }
      
      clearTimeout(timeoutId);
      
      if (!connected) throw new Error('Failed to connect to backend on any port');
      
      const last = Array.isArray(data) ? (data[data.length - 1] || {}) : data;
      setReading(last as Reading);
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
          : 'http://localhost:5000';
        
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

  const saveUserInfo = () => {
    // Save both email and username
    if (email) {
      localStorage.setItem('USER_EMAIL', email);
      setSavedEmail(email);
    }
    
    if (username) {
      localStorage.setItem('USER_NAME', username);
      setUserDisplayName(username);
      setUsername('');
    }
    
    if (cityInput) {
      localStorage.setItem('USER_CITY', cityInput);
      setUserCity(cityInput);
    }
    
    setUserInfoOpen(false);
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

  // Check for missing data and show alerts
  const checkForMissingData = () => {
    const missingFields = [];
    
    if (!weatherData.wind) missingFields.push('wind speed');
    if (!reading.pm10 && !reading.pm25) missingFields.push('pollutant data (PM2.5/PM10)');
    
    if (missingFields.length > 0) {
      setMissingDataAlert(`Missing ${missingFields.join(' and ')}. Please check weather or refresh data.`);
    } else {
      setMissingDataAlert(null);
      // Auto-open dashboard when all data is available
      setUserInfoOpen(false);
    }
  };

  useEffect(() => {
    // Initialize the dashboard
    fetchLatest();
    
    // Check for saved user info
    const savedToken = localStorage.getItem('ACCESS_TOKEN');
    if (savedToken) {
      setIsAuthenticated(true);
    }
    
    const savedEmail = localStorage.getItem('USER_EMAIL');
    if (savedEmail) {
      setSavedEmail(savedEmail);
      setEmail(savedEmail);
    }
    
    const savedName = localStorage.getItem('USER_NAME');
    if (savedName) {
      setUserDisplayName(savedName);
    }
    
    const savedCity = localStorage.getItem('USER_CITY');
    if (savedCity) {
      setUserCity(savedCity);
      setCityInput(savedCity);
    }
    
    // Set API key if not already set
    if (!localStorage.getItem('weatherApiKey')) {
      localStorage.setItem('weatherApiKey', '0ed03441c5022238438f3b1788f82eb9');
    }
    
    // Auto-trigger location-based weather on initial load
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        // We'll use this data in the WeatherMap component
      });
    }
    
    // Set up interval to fetch data
    const intervalId = setInterval(fetchLatest, 30000);
    
    // Fix for "Cannot read properties of null (reading 'style')" error
    const handleDOMContentLoaded = () => {
      // Ensure all DOM elements are properly initialized before accessing
      setTimeout(() => {
        const elements = document.querySelectorAll('[id]');
        elements.forEach(el => {
          if (el && !el.style) {
            console.warn(`Element with id ${el.id} has no style property, initializing...`);
            // Initialize style if missing
            Object.defineProperty(el, 'style', { value: {} });
          }
        });
      }, 100);
    };
    
    // Add event listener for DOM content loaded
    document.addEventListener('DOMContentLoaded', handleDOMContentLoaded);
    // Run once immediately in case DOM is already loaded
    handleDOMContentLoaded();
    
    return () => {
      clearInterval(intervalId);
      document.removeEventListener('DOMContentLoaded', handleDOMContentLoaded);
    };
  }, []);
  
  // Check for missing data whenever readings or weather data changes
  useEffect(() => {
    if (isAuthenticated) {
      checkForMissingData();
    }
  }, [reading, weatherData, isAuthenticated]);

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div className="badge" style={{ 
            padding: '8px 12px',
            borderRadius: '999px',
            background: statusText.includes('Connected') ? '#e6ffed' : '#fee2e2',
            color: statusText.includes('Connected') ? '#047857' : '#b91c1c',
            border: statusText.includes('Connected') ? '1px solid #a7f3d0' : '1px solid #fecaca',
            fontWeight: 600
          }}>
            {statusText}
          </div>
          <button
            onClick={fetchLatest}
            style={{
              padding: '5px 10px',
              backgroundColor: colors.secondary,
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Refresh Data
          </button>
          <button 
            onClick={() => fetchLatest()} 
            style={{
              padding: '5px 10px',
              backgroundColor: colors.secondary,
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Detect Backend
          </button>
          <button 
            onClick={() => {
              setStatusText('Connecting to Port 5000...');
              fetch('http://localhost:5000/api/readings')
                .then(response => {
                  if (response.ok) {
                    setStatusText('Backend Connected (Port 5000)');
                    return response.json();
                  }
                  throw new Error('Failed to connect to port 5000');
                })
                .then(data => {
                  setReading(data);
                })
                .catch(err => {
                  console.error(err);
                  setStatusText('Connection Failed (Port 5000)');
                });
            }} 
            style={{
              padding: '5px 10px',
              backgroundColor: colors.secondary,
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Connect to Port 5000
          </button>
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
            onClick={toggleTheme}
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
      {userInfoOpen && (
        <div style={{ 
          position: 'absolute', 
          top: '40px', 
          right: '0', 
          backgroundColor: 'white', 
          border: `1px solid ${colors.border}`,
          borderRadius: '4px',
          padding: '15px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          zIndex: 100,
          width: '250px'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: colors.primary }}>Update Profile</h3>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Username</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={inputStyle}
              placeholder="Enter username"
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              placeholder="Enter email"
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>City</label>
            <input 
              type="text" 
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              style={inputStyle}
              placeholder="Enter city"
            />
          </div>
          <button onClick={saveUserInfo} style={buttonStyle}>Save</button>
        </div>
      )}
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
          backgroundColor: colors.buttonBg,
          color: colors.buttonText,
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
            <h3>ESP32 Live Air Quality Data</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: '20px' }}>
              <div style={gridItemStyle}><div>PM1.0</div><div id="pm1">{reading.pm1 ?? '-'}</div></div>
              <div style={gridItemStyle}><div>PM2.5</div><div id="pm25">{reading.pm25 ?? '-'}</div></div>
              <div style={gridItemStyle}><div>PM10</div><div id="pm10">{reading.pm10 ?? '-'}</div></div>
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
            
            <div className="weather-map">
              <h3>Weather Map - Jagatpura Road</h3>
              <iframe 
                className="weather-map"
                src={`https://openweathermap.org/weathermap?basemap=map&cities=true&layer=temperature&lat=26.8498&lon=75.7653&zoom=12`}
                width="100%" 
                height="300" 
                style={{ border: '1px solid #ddd', borderRadius: '8px' }}
                title="Weather Map - Jagatpura Road"
                id="weather-map-iframe"
              ></iframe>
            </div>
          </div>

          {/* Email Section */}
          <div id="email-section" className="email-section" style={{ ...cardStyle }}>
            <h2 style={{ color: colors.primary, marginTop: 0 }}>Email Notifications</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
              <div>
                <input 
                  type="email" 
                  placeholder="Enter your email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{...inputStyle, width: '100%', marginRight: 0}}
                />
              </div>
              <div>
                <button onClick={saveUserInfo} style={{...buttonStyle, width: '100%'}}>Subscribe to Alerts</button>
              </div>
            </div>
          </div>

          {/* Unified User Info Section */}
          <div style={{ ...cardStyle }}>
            <h2 style={{ color: colors.primary, marginTop: 0 }}>Your Info</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
              <div>
                <input 
                  type="text" 
                  placeholder="Enter your name" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{...inputStyle, width: '100%', marginRight: 0}}
                />
              </div>
              <div>
                <input 
                  type="email" 
                  placeholder="Enter your email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{...inputStyle, width: '100%', marginRight: 0}}
                />
              </div>
              <div>
                <button onClick={saveUserInfo} style={{...buttonStyle, width: '100%'}}>Update Info</button>
              </div>
            </div>
            
            <div style={{ marginTop: '10px' }}>
              {userDisplayName && <p>Name: <strong>{userDisplayName}</strong></p>}
              {savedEmail && <p>Email: <strong>{savedEmail}</strong></p>}
            </div>
          </div>
          
          {/* Instruction Panel for Missing Data */}
          {missingDataAlert && (
            <div style={{ 
              ...cardStyle, 
              backgroundColor: colors.primary, 
              color: 'white',
              padding: '12px 20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ margin: 0 }}><strong>Alert:</strong> {missingDataAlert}</p>
                <div>
                  <button 
                    onClick={fetchLatest} 
                    style={{...buttonStyle, marginRight: '10px', backgroundColor: 'white', color: colors.primary}}
                  >
                    Refresh Data
                  </button>
                  <button 
                    onClick={checkWeather} 
                    style={{...buttonStyle, backgroundColor: 'white', color: colors.primary}}
                  >
                    Check Weather
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '40px 20px' }}>
          <h2 style={{ color: colors.primary, marginTop: 0 }}>Please Sign In</h2>
          <p>You need to sign in to view the dashboard and weather data.</p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;