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


