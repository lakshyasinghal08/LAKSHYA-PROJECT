from flask import Flask, request, jsonify
from flask_jwt_extended import JWTManager, create_access_token, jwt_required
from flask_cors import CORS
import mysql.connector
import time
import random
import requests
import socket
import os
import hashlib
import secrets
from werkzeug.utils import secure_filename
import uuid

app = Flask(__name__)
app.config['JWT_SECRET_KEY'] = 'singhal08'
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024  # 5MB max file size
app.url_map.strict_slashes = False
jwt = JWTManager(app)
# Enable CORS for local development frontend (e.g., file:// and http://localhost:5173 or any origin)
CORS(app, resources={r"/*": {"origins": "*"}})

# Allowed file extensions for photos
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

# Global variables to track database connection status and mock data
db = None
cursor = None
db_connected = False

# OpenWeatherMap API key
OWM_API_KEY = "0ed03441c5022238438f3b1788f82eb9"

def find_free_port():
    """Find a free port, preferring port 5008"""
    # Try port 5008 first, then other ports
    preferred_ports = [5008, 5000, 5001, 5002, 5003, 5004, 5005, 5006, 5007, 5009, 5010]
    
    for port in preferred_ports:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('localhost', port))
                return port
        except OSError:
            continue
    return None

def save_port_config(port):
    """Save the port configuration to a file"""
    try:
        with open('port_config.txt', 'w') as f:
            f.write(str(port))
        print(f"✅ Port {port} saved to port_config.txt")
    except Exception as e:
        print(f"⚠️ Could not save port config: {e}")

def load_port_config():
    """Load port configuration from file"""
    try:
        if os.path.exists('port_config.txt'):
            with open('port_config.txt', 'r') as f:
                port = int(f.read().strip())
                # Verify port is still free
                try:
                    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                        s.bind(('localhost', port))
                        return port
                except OSError:
                    print(f"⚠️ Saved port {port} is no longer available, finding new port...")
                    return None
    except Exception as e:
        print(f"⚠️ Could not load port config: {e}")
    return None

def hash_password(password):
    """Hash password with salt"""
    salt = secrets.token_hex(16)
    password_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
    return f"{salt}:{password_hash.hex()}"

def verify_password(password, stored_hash):
    """Verify password against stored hash"""
    try:
        salt, password_hash_hex = stored_hash.split(':')
        password_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
        return password_hash.hex() == password_hash_hex
    except:
        return False

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS
mock_reading = {
    'id': 1,
    'pm10': 35.2,
    'pm25': 12.8,
    'co2': 450,
    'humidity': 65.5,
    'temperature': 24.3,
    'username': 'mock_user',
    'timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
}

# Try to connect to MySQL
try:
    db = mysql.connector.connect(
        host="localhost",
        user="root",
        password="singhal08",
        database="aqi_data",
        connect_timeout=3  # Short timeout to avoid long waits
    )
    cursor = db.cursor()

    # Ensure the readings table exists and has expected columns
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS sensor_readings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            pm10 FLOAT NULL,
            pm25 FLOAT NULL,
            co2 FLOAT NULL,
            humidity FLOAT NULL,
            temperature FLOAT NULL,
            username VARCHAR(100) NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    
    # Create users table for multi-user support
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            email VARCHAR(100) UNIQUE,
            city VARCHAR(100) DEFAULT 'Delhi',
            profile_photo VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    db.commit()

    # Try ensure username column exists for older tables
    try:
        cursor.execute("ALTER TABLE sensor_readings ADD COLUMN IF NOT EXISTS username VARCHAR(100) NULL")
        db.commit()
    except Exception:
        pass
    
    db_connected = True
    print("✅ Database connected successfully")
except mysql.connector.Error as err:
    print(f"❌ Database connection failed: {err}")
    print("⚠️ Running in mock data mode")

# Health endpoints for connectivity checks
@app.route('/', methods=['GET'])
def root():
    return jsonify(status='ok')

@app.route('/health', methods=['GET'])
def health():
    return jsonify(ok=True)

# ✅ User Registration Route
@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    email = data.get('email', '').strip()
    city = data.get('city', 'Delhi').strip()
    
    # Validation
    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400
    
    if len(username) < 3:
        return jsonify({"error": "Username must be at least 3 characters"}), 400
    
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400
    
    if db_connected:
        try:
            # Check if username already exists
            cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
            if cursor.fetchone():
                return jsonify({"error": "Username already exists"}), 400
            
            # Check if email already exists (if provided)
            if email:
                cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
                if cursor.fetchone():
                    return jsonify({"error": "Email already exists"}), 400
            
            # Hash password and create user
            password_hash = hash_password(password)
            cursor.execute(
                "INSERT INTO users (username, password, email, city) VALUES (%s, %s, %s, %s)",
                (username, password_hash, email, city)
            )
            db.commit()
            
            return jsonify({"message": "User registered successfully"}), 201
            
        except Exception as e:
            print(f"Database error during registration: {e}")
            return jsonify({"error": "Registration failed"}), 500
    else:
        return jsonify({"error": "Database not available"}), 500

# ✅ Login Route
@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    
    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400
    
    if db_connected:
        try:
            # Get user from database
            cursor.execute("SELECT id, username, password, email, city FROM users WHERE username = %s", (username,))
            user = cursor.fetchone()
            
            if user and verify_password(password, user[2]):
                # Create JWT token with user info
                user_data = {
                    'id': user[0],
                    'username': user[1],
                    'email': user[3],
                    'city': user[4]
                }
                token = create_access_token(identity=user_data)
                return jsonify({
                    "access_token": token,
                    "user": user_data
                })
            else:
                return jsonify({"error": "Invalid credentials"}), 401
                
        except Exception as e:
            print(f"Database error during login: {e}")
            return jsonify({"error": "Login failed"}), 500
    else:
        # Fallback for when database is not available
        if username == 'admin' and password == 'pass':
            token = create_access_token(identity={'username': 'admin', 'city': 'Delhi'})
            return jsonify({"access_token": token, "user": {"username": "admin", "city": "Delhi"}})
        return jsonify({"error": "Invalid credentials"}), 401

# ✅ Update User City Route
@app.route('/update-city', methods=['POST'])
@jwt_required()
def update_city():
    data = request.get_json()
    new_city = data.get('city', '').strip()
    
    if not new_city:
        return jsonify({"error": "City is required"}), 400
    
    if db_connected:
        try:
            # Get current user from JWT
            current_user = request.json.get('user') or {}
            user_id = current_user.get('id')
            
            if not user_id:
                return jsonify({"error": "User not found"}), 400
            
            # Update user's city
            cursor.execute("UPDATE users SET city = %s WHERE id = %s", (new_city, user_id))
            db.commit()
            
            return jsonify({"message": "City updated successfully", "city": new_city}), 200
            
        except Exception as e:
            print(f"Database error updating city: {e}")
            return jsonify({"error": "Failed to update city"}), 500
    else:
        return jsonify({"error": "Database not available"}), 500

@app.route('/upload-photo', methods=['POST'])
@jwt_required()
def upload_photo():
    """Upload user profile photo"""
    try:
        # Check if photo file is present
        if 'photo' not in request.files:
            return jsonify({"error": "No photo file provided"}), 400
        
        file = request.files['photo']
        username = request.form.get('username', '').strip()
        
        if not username:
            return jsonify({"error": "Username is required"}), 400
        
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        if not allowed_file(file.filename):
            return jsonify({"error": "Invalid file type. Allowed: PNG, JPG, JPEG, GIF, WEBP"}), 400
        
        # Generate unique filename
        file_extension = file.filename.rsplit('.', 1)[1].lower()
        unique_filename = f"{username}_{uuid.uuid4().hex}.{file_extension}"
        
        # Ensure upload directory exists
        upload_dir = os.path.join(app.config['UPLOAD_FOLDER'])
        os.makedirs(upload_dir, exist_ok=True)
        
        # Save file
        file_path = os.path.join(upload_dir, unique_filename)
        file.save(file_path)
        
        # Generate URL for the uploaded file
        image_url = f"/static/uploads/{unique_filename}"
        
        # Update user's profile photo in database
        if db_connected:
            try:
                cursor.execute("UPDATE users SET profile_photo = %s WHERE username = %s", (image_url, username))
                db.commit()
                print(f"✅ Profile photo updated for user: {username}")
            except Exception as e:
                print(f"❌ Database error updating profile photo: {e}")
        
        return jsonify({
            "message": "Photo uploaded successfully",
            "imageUrl": image_url,
            "filename": unique_filename
        })
        
    except Exception as e:
        print(f"❌ Photo upload error: {e}")
        return jsonify({"error": "Failed to upload photo"}), 500

@app.route('/remove-photo', methods=['POST'])
@jwt_required()
def remove_photo():
    """Remove user profile photo"""
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        
        if not username:
            return jsonify({"error": "Username is required"}), 400
        
        # Get current profile photo path
        current_photo = None
        if db_connected:
            try:
                cursor.execute("SELECT profile_photo FROM users WHERE username = %s", (username,))
                result = cursor.fetchone()
                if result:
                    current_photo = result[0]
            except Exception as e:
                print(f"❌ Database error getting profile photo: {e}")
        
        # Remove photo file if it exists
        if current_photo and current_photo.startswith('/static/uploads/'):
            photo_path = current_photo[1:]  # Remove leading slash
            full_path = os.path.join(app.root_path, photo_path)
            if os.path.exists(full_path):
                os.remove(full_path)
                print(f"✅ Profile photo file removed: {full_path}")
        
        # Update database to remove photo reference
        if db_connected:
            try:
                cursor.execute("UPDATE users SET profile_photo = NULL WHERE username = %s", (username,))
                db.commit()
                print(f"✅ Profile photo removed for user: {username}")
            except Exception as e:
                print(f"❌ Database error removing profile photo: {e}")
        
        return jsonify({"message": "Photo removed successfully"})
        
    except Exception as e:
        print(f"❌ Photo remove error: {e}")
        return jsonify({"error": "Failed to remove photo"}), 500

@app.route('/get-profile-photo/<username>', methods=['GET'])
def get_profile_photo(username):
    """Get user profile photo URL"""
    try:
        if db_connected:
            cursor.execute("SELECT profile_photo FROM users WHERE username = %s", (username,))
            result = cursor.fetchone()
            if result and result[0]:
                return jsonify({"imageUrl": result[0]})
        
        return jsonify({"imageUrl": None})
        
    except Exception as e:
        print(f"❌ Error getting profile photo: {e}")
        return jsonify({"imageUrl": None})

# ✅ Create unified readings endpoints expected by the frontend
@app.route('/readings', methods=['POST'])
def create_reading():
    data = request.get_json(silent=True) or {}

    pm10 = data.get('pm10')
    pm25 = data.get('pm25')
    co2 = data.get('co2')
    humidity = data.get('humidity')
    temperature = data.get('temperature')
    username = data.get('username')

    # Basic validation: allow partials but require at least one metric
    if all(v is None for v in [pm10, pm25, co2, humidity, temperature]):
        return jsonify({"error": "Provide at least one of pm10, pm25, co2, humidity, temperature"}), 400

    if db_connected:
        try:
            cursor.execute(
                "INSERT INTO sensor_readings (pm10, pm25, co2, humidity, temperature, username) VALUES (%s, %s, %s, %s, %s, %s)",
                (pm10, pm25, co2, humidity, temperature, username)
            )
            db.commit()
            new_id = cursor.lastrowid
            return jsonify({"id": new_id, "message": "Reading stored"}), 201
        except Exception as e:
            print(f"Database error: {e}")
            # Fall back to mock data
            return jsonify({"id": 1, "message": "Reading stored (mock)"}), 201
    else:
        # Update mock data with new values
        global mock_reading
        if pm10 is not None:
            mock_reading['pm10'] = pm10
        if pm25 is not None:
            mock_reading['pm25'] = pm25
        if co2 is not None:
            mock_reading['co2'] = co2
        if humidity is not None:
            mock_reading['humidity'] = humidity
        if temperature is not None:
            mock_reading['temperature'] = temperature
        if username is not None:
            mock_reading['username'] = username
        mock_reading['timestamp'] = time.strftime('%Y-%m-%d %H:%M:%S')
        
        return jsonify({"id": 1, "message": "Reading stored (mock)"}), 201


@app.route('/readings', methods=['GET'])
def get_latest_reading():
    if db_connected:
        try:
            cursor.execute("SELECT id, pm10, pm25, co2, humidity, temperature, username, timestamp FROM sensor_readings ORDER BY timestamp DESC, id DESC LIMIT 1")
            row = cursor.fetchone()
            if not row:
                return jsonify({}), 200
            reading = {
                'id': row[0],
                'pm10': row[1],
                'pm25': row[2],
                'co2': row[3],
                'humidity': row[4],
                'temperature': row[5],
                'username': row[6],
                'timestamp': str(row[7])
            }
            return jsonify(reading)
        except Exception as e:
            print(f"Database error: {e}")
            # Fall back to mock data
            return jsonify(mock_reading)
    else:
        # Slightly randomize mock data to simulate changes
        mock_reading['pm10'] = round(mock_reading['pm10'] + random.uniform(-2, 2), 1)
        mock_reading['pm25'] = round(mock_reading['pm25'] + random.uniform(-1, 1), 1)
        mock_reading['co2'] = round(mock_reading['co2'] + random.uniform(-10, 10))
        mock_reading['humidity'] = round(mock_reading['humidity'] + random.uniform(-1, 1), 1)
        mock_reading['temperature'] = round(mock_reading['temperature'] + random.uniform(-0.5, 0.5), 1)
        mock_reading['timestamp'] = time.strftime('%Y-%m-%d %H:%M:%S')
        
        return jsonify(mock_reading)

# ✅ (Optional) Legacy protected example routes are kept for compatibility
@app.route('/dashboard-data', methods=['GET'])
@jwt_required()
def dashboard_data():
    if db_connected:
        try:
            cursor.execute("SELECT id, pm25, humidity, timestamp FROM sensor_readings ORDER BY timestamp DESC LIMIT 10")
            rows = cursor.fetchall()
            data = [
                {
                    'id': r[0],
                    'pm25': r[1],
                    'humidity': r[2],
                    'timestamp': str(r[3])
                }
                for r in rows
            ]
            return jsonify(data)
        except Exception as e:
            print(f"Database error: {e}")
            # Return mock data
            return jsonify([{
                'id': 1,
                'pm25': mock_reading['pm25'],
                'humidity': mock_reading['humidity'],
                'timestamp': mock_reading['timestamp']
            }])
    else:
        # Return mock data
        return jsonify([{
            'id': 1,
            'pm25': mock_reading['pm25'],
            'humidity': mock_reading['humidity'],
            'timestamp': mock_reading['timestamp']
        }])

# ✅ Protected Test Route
@app.route('/secure-data', methods=['GET'])
@jwt_required()
def secure_data():
    return jsonify(msg='Hello admin, this is protected data')

# ✅ Weather Route
@app.route('/weather', methods=['GET'])
def get_weather():
    """Fetch weather data from OpenWeatherMap API"""
    city = request.args.get('city')
    
    # Check if city parameter is provided
    if not city:
        return jsonify({"error": "City parameter is required"}), 404
    
    try:
        # Make API call to OpenWeatherMap
        url = f"http://api.openweathermap.org/data/2.5/weather"
        params = {
            'q': city,
            'appid': OWM_API_KEY,
            'units': 'metric'
        }
        
        response = requests.get(url, params=params, timeout=10)
        
        if response.status_code == 404:
            return jsonify({"error": "City not found"}), 404
        elif response.status_code == 401:
            return jsonify({"error": "Invalid API key"}), 500
        elif response.status_code != 200:
            return jsonify({"error": "Weather API error"}), 500
        
        data = response.json()
        
        # Extract required data
        weather_data = {
            "city": data.get('name', city),
            "temperature": data.get('main', {}).get('temp'),
            "humidity": data.get('main', {}).get('humidity'),
            "wind": data.get('wind', {}).get('speed')
        }
        
        return jsonify(weather_data)
        
    except requests.exceptions.Timeout:
        return jsonify({"error": "Weather API timeout"}), 500
    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Weather API request failed: {str(e)}"}), 500
    except Exception as e:
        return jsonify({"error": f"Unexpected error: {str(e)}"}), 500

# ✅ Run Server
if __name__ == '__main__':
    # Force port 5008 for consistency
    port = 5008
    
    # Check if port 5008 is available, if not find alternative
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(('localhost', port))
    except OSError:
        print(f"⚠️ Port {port} is not available, finding alternative...")
        port = find_free_port()
        if port is None:
            print("❌ Could not find a free port in range 5000-5099")
            exit(1)
    
    save_port_config(port)
    
    print("=" * 60)
    print("🚀 AQI DASHBOARD APPLICATION STARTING")
    print("=" * 60)
    print(f"📡 Backend URL: http://localhost:{port}")
    print(f"🌐 Weather API: http://localhost:{port}/weather?city=CityName")
    print(f"🔐 Login: POST http://localhost:{port}/login")
    print("=" * 60)
    print("📱 FRONTEND ACCESS:")
    print(f"   Option 1: Open index.html in your browser")
    print(f"   Option 2: http://localhost:{port}/static/index.html")
    print("=" * 60)
    print("🔑 LOGIN CREDENTIALS:")
    print("   Username: admin")
    print("   Password: pass")
    print("=" * 60)
    print("⚡ Starting Flask server...")
    print("   Press Ctrl+C to stop the server")
    print("=" * 60)
    
    # Try to open frontend automatically
    try:
        import webbrowser
        import time
        import threading
        
        def open_frontend():
            time.sleep(2)  # Wait for server to start
            frontend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'index.html'))
            if os.path.exists(frontend_path):
                webbrowser.open(f'file://{frontend_path}')
                print(f"🌐 Frontend opened automatically: {frontend_path}")
            else:
                print("⚠️ Frontend file not found, please open index.html manually")
        
        # Start frontend opening in a separate thread
        threading.Thread(target=open_frontend, daemon=True).start()
    except Exception as e:
        print(f"⚠️ Could not open frontend automatically: {e}")
        print("   Please open index.html manually in your browser")
    
    app.run(port=port, debug=True)