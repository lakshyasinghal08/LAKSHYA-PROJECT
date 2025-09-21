from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import requests
import json
import jwt


class Reading(BaseModel):
    pm10: Optional[float] = Field(default=None, description="PM10 concentration µg/m³")
    pm25: Optional[float] = Field(default=None, description="PM2.5 concentration µg/m³")
    co2: Optional[float] = Field(default=None, description="CO2 ppm")
    humidity: Optional[float] = Field(default=None, description="Relative Humidity %")
    temperature: Optional[float] = Field(default=None, description="Temperature °C")
    username: Optional[str] = Field(default=None, description="User submitting the reading")
    timestamp: datetime = Field(default_factory=datetime.utcnow)


app = FastAPI(title="AQI Readings API")

# Open CORS for local development. Tighten in production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# In-memory storage
READINGS: List[Reading] = []


@app.post("/readings")
def create_reading(payload: Reading):
    READINGS.append(payload)
    return {"message": "Reading stored", "count": len(READINGS)}


@app.get("/readings")
def get_latest_reading():
    if not READINGS:
        return {}
    return READINGS[-1].model_dump()


@app.delete("/readings/clear")
def clear_readings():
    READINGS.clear()
    return {"message": "All readings cleared", "count": len(READINGS)}


@app.get("/")
def root():
    return {"status": "ok"}


@app.get("/health")
def health():
    return {"ok": True, "readings": len(READINGS)}

# Weather API route
@app.get("/weather")
def get_weather(city: str):
    try:
        api_key = "0ed03441c5022238438f3b1788f82eb9"  # OpenWeatherMap API key
        url = f"https://api.openweathermap.org/data/2.5/weather?q={city}&appid={api_key}&units=metric"
        response = requests.get(url)
        return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# JWT Authentication
SECRET_KEY = "your_secret_key_here"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Mock user database
USERS_DB = {
    "testuser": {
        "username": "testuser",
        "password": "password123"
    }
}

class Token(BaseModel):
    access_token: str
    token_type: str

class User(BaseModel):
    username: str
    password: str

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

@app.post("/login", response_model=Token)
def login_for_access_token(form_data: User):
    user = USERS_DB.get(form_data.username)
    if not user or form_data.password != user["password"]:
        # For demo purposes, we'll accept any login
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": form_data.username}, expires_delta=access_token_expires
        )
        return {"access_token": access_token, "token_type": "bearer"}
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": form_data.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


