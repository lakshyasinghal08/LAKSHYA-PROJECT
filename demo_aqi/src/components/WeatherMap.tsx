import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

interface WeatherMapProps {
  city?: string;
}

interface WeatherData {
  main?: {
    temp?: number;
    humidity?: number;
    feels_like?: number;
  };
  weather?: Array<{
    main: string;
    description: string;
    icon: string;
  }>;
  wind?: {
    speed?: number;
  };
  name?: string;
  coord?: {
    lat: number;
    lon: number;
  };
}

interface Coordinates {
  lat: number;
  lon: number;
}

const WeatherMap: React.FC<WeatherMapProps> = ({ city = 'Delhi' }) => {
  const { colors } = useTheme();
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchCity, setSearchCity] = useState(city);
  const [inputCity, setInputCity] = useState('');
  const [apiKey, setApiKey] = useState<string>('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  
  // Load API key from localStorage on component mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem('OWM_KEY');
    if (savedApiKey) {
      setApiKey(savedApiKey);
    } else {
      setShowApiKeyInput(true);
    }
  }, []);

  const saveApiKey = () => {
    if (apiKeyInput.trim()) {
      localStorage.setItem('OWM_KEY', apiKeyInput.trim());
      setApiKey(apiKeyInput.trim());
      setShowApiKeyInput(false);
      // Try to fetch weather with the new API key
      if (useCurrentLocation) {
        getCurrentLocation();
      } else {
        fetchWeather(searchCity);
      }
    }
  };
  
  const fetchWeatherByCoordinates = async (coords: Coordinates) => {
    if (!apiKey) {
      setError('Please set your OpenWeatherMap API key first');
      setShowApiKeyInput(true);
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      // Call OpenWeatherMap API directly with coordinates
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${coords.lat}&lon=${coords.lon}&units=metric&appid=${apiKey}`
      );
      
      if (!response.ok) {
        if (response.status === 401) {
          // Invalid API key
          localStorage.removeItem('OWM_KEY');
          setApiKey('');
          setShowApiKeyInput(true);
          throw new Error('Invalid API key. Please provide a valid OpenWeatherMap API key.');
        } else {
          throw new Error('Weather data unavailable for this location');
        }
      }
      
      const data = await response.json();
      setWeatherData(data);
      setSearchCity(data.name || 'Current Location');
    } catch (err) {
      setError('Failed to fetch weather data. Please check your API key or try another location.');
      console.error('Weather fetch error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchWeather = async (cityName: string) => {
    if (!apiKey) {
      setError('Please set your OpenWeatherMap API key first');
      setShowApiKeyInput(true);
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      // Revert to using OpenWeatherMap API directly to fix the JSON parsing error
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${cityName}&units=metric&appid=${apiKey}`
      );
      
      if (!response.ok) {
        if (response.status === 401) {
          // Invalid API key
          localStorage.removeItem('OWM_KEY');
          setApiKey('');
          setShowApiKeyInput(true);
          throw new Error('Invalid API key. Please provide a valid OpenWeatherMap API key.');
        } else if (response.status === 404) {
          throw new Error('City not found');
        } else {
          throw new Error('Weather data unavailable');
        }
      }
      
      const data = await response.json();
      setWeatherData(data);
      setSearchCity(cityName);
    } catch (err) {
      setError('Failed to fetch weather data. Please try another city or check your API key.');
      console.error('Weather fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }
    
    setLocationLoading(true);
    setError('');
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lon: position.coords.longitude
        };
        fetchWeatherByCoordinates(coords);
        setLocationLoading(false);
        setUseCurrentLocation(true);
      },
      (err) => {
        setError(`Error getting location: ${err.message}`);
        setLocationLoading(false);
        console.error('Geolocation error:', err);
      }
    );
  };

  useEffect(() => {
    if (apiKey) {
      if (useCurrentLocation) {
        getCurrentLocation();
      } else {
        fetchWeather(city);
      }
    }
  }, [city, apiKey]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setUseCurrentLocation(false);
    if (inputCity.trim()) {
      fetchWeather(inputCity);
    }
  };
  
  const mapContainerStyle = {
    marginTop: '30px',
    padding: '25px',
    backgroundColor: colors.cardBg,
    borderRadius: '15px',
    boxShadow: colors.cardShadow,
    border: `2px solid ${colors.accent}`,
    transition: 'all 0.3s ease',
  };

  const mapStyle = {
    width: '100%',
    height: '400px',
    border: 'none',
    borderRadius: '12px',
    background: `linear-gradient(135deg, ${colors.accent}30, ${colors.primary}20)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column' as const,
    boxShadow: `0 10px 20px rgba(0,0,0,0.1), inset 0 0 30px ${colors.accent}20`,
    marginTop: '20px',
    overflow: 'hidden',
    position: 'relative' as const,
  };

  const weatherCardStyle = {
    width: '85%',
    padding: '25px',
    backgroundColor: colors.mode === 'dark' ? 'rgba(30, 30, 40, 0.8)' : 'rgba(255, 255, 255, 0.9)',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    border: `2px solid ${colors.accent}`,
    boxShadow: `0 8px 32px rgba(0, 0, 0, 0.1), inset 0 0 10px ${colors.accent}20`,
    color: colors.text,
    backdropFilter: 'blur(10px)' as const,
  };

  const searchBoxStyle = {
    display: 'flex' as const,
    width: '100%',
    marginBottom: '15px',
  };

  const inputStyle = {
    flex: 1,
    padding: '10px 15px',
    borderRadius: '8px 0 0 8px',
    border: `1px solid ${colors.accent}`,
    backgroundColor: colors.inputBg,
    color: colors.text,
    fontSize: '16px',
    outline: 'none',
  };

  const buttonStyle = {
    padding: '10px 20px',
    backgroundColor: colors.accent,
    color: '#fff',
    border: 'none',
    borderRadius: '0 8px 8px 0',
    cursor: 'pointer' as const,
    fontWeight: 'bold' as const,
    transition: 'all 0.2s ease',
  };

  const apiKeyContainerStyle = {
    marginBottom: '20px',
    padding: '15px',
    backgroundColor: `${colors.accent}15`,
    borderRadius: '10px',
    border: `1px dashed ${colors.accent}`,
  };

  return (
    <div style={mapContainerStyle}>
      <h3 style={{ color: colors.text, marginTop: 0, fontSize: '22px', marginBottom: '20px' }}>
        Weather Map
      </h3>
      
      {showApiKeyInput ? (
        <div style={apiKeyContainerStyle}>
          <div style={{ marginBottom: '10px', color: colors.text }}>
            Please enter your OpenWeatherMap API key:
          </div>
          <div style={searchBoxStyle}>
            <input
              type="text"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="Enter your OpenWeatherMap API key..."
              style={inputStyle}
            />
            <button 
              onClick={saveApiKey}
              style={buttonStyle}
            >
              Save Key
            </button>
          </div>
          <div style={{ fontSize: '12px', color: colors.textSecondary, marginTop: '8px' }}>
            You can get a free API key from <a href="https://openweathermap.org/api" target="_blank" rel="noopener noreferrer" style={{ color: colors.accent }}>OpenWeatherMap</a>
          </div>
        </div>
      ) : (
        <>
          <form onSubmit={handleSearch} style={searchBoxStyle}>
            <input
              type="text"
              value={inputCity}
              onChange={(e) => setInputCity(e.target.value)}
              placeholder="Enter city name..."
              style={inputStyle}
            />
            <button type="submit" style={buttonStyle}>
              Check Weather
            </button>
          </form>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
            <button 
              onClick={() => setShowApiKeyInput(true)} 
              style={{ 
                background: 'transparent', 
                border: 'none', 
                color: colors.accent, 
                cursor: 'pointer', 
                fontSize: '14px',
                padding: '5px',
                boxShadow: 'none'
              }}
            >
              Change API Key
            </button>
          </div>
        </>
      )}
      
      <div style={mapStyle}>
        {loading ? (
          <div style={{ color: colors.text, fontSize: '18px' }}>Loading weather data...</div>
        ) : error ? (
          <div style={{ color: colors.error || '#ff6b6b', fontSize: '16px', textAlign: 'center' as const }}>
            {error}
          </div>
        ) : weatherData ? (
          <div style={weatherCardStyle}>
            <div style={{ fontSize: '28px', fontWeight: 'bold' as const, marginBottom: '5px', color: colors.primary }}>
              {weatherData.name}
            </div>
            
            {weatherData.weather && weatherData.weather[0] && (
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                <img 
                  src={`https://openweathermap.org/img/wn/${weatherData.weather[0].icon}@2x.png`} 
                  alt={weatherData.weather[0].description}
                  style={{ width: '60px', height: '60px' }}
                />
                <div style={{ fontSize: '18px', marginLeft: '10px', textTransform: 'capitalize' as const }}>
                  {weatherData.weather[0].description}
                </div>
              </div>
            )}
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', width: '100%' }}>
              {weatherData.main && (
                <>
                  <div style={{ textAlign: 'center' as const, padding: '10px', backgroundColor: `${colors.accent}20`, borderRadius: '8px' }}>
                    <div style={{ fontSize: '14px', marginBottom: '5px' }}>Temperature</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold' as const, color: colors.accent }}>
                      {weatherData.main.temp?.toFixed(1)}°C
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'center' as const, padding: '10px', backgroundColor: `${colors.accent}20`, borderRadius: '8px' }}>
                    <div style={{ fontSize: '14px', marginBottom: '5px' }}>Feels Like</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold' as const, color: colors.accent }}>
                      {weatherData.main.feels_like?.toFixed(1)}°C
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'center' as const, padding: '10px', backgroundColor: `${colors.accent}20`, borderRadius: '8px' }}>
                    <div style={{ fontSize: '14px', marginBottom: '5px' }}>Humidity</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold' as const, color: colors.accent }}>
                      {weatherData.main.humidity}%
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'center' as const, padding: '10px', backgroundColor: `${colors.accent}20`, borderRadius: '8px' }}>
                    <div style={{ fontSize: '14px', marginBottom: '5px' }}>Wind Speed</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold' as const, color: colors.accent }}>
                      {weatherData.wind?.speed} m/s
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center' as const, color: colors.text }}>
            <div style={{ fontSize: '18px', marginBottom: '10px' }}>
              {apiKey ? 'No weather data available' : 'Please set your OpenWeatherMap API key'}
            </div>
            <div style={{ fontSize: '14px' }}>
              {apiKey ? 'Please enter a city name and click "Check Weather"' : ''}
            </div>
          </div>
        )}
      </div>
      
      <div style={{ fontSize: '12px', color: colors.text, marginTop: '10px', textAlign: 'right' as const }}>
        Weather data provided by OpenWeatherMap
      </div>
    </div>
  );
};

export default WeatherMap;