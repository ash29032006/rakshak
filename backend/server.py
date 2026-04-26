from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

class EmergencyContact(BaseModel):
    id: str
    name: str
    phone: str
    relation: str
    priority: int

class AlertTimelineEvent(BaseModel):
    id: str
    type: str
    label: str
    detail: str
    timestamp: datetime

class Location(BaseModel):
    latitude: float
    longitude: float
    address: str

class Alert(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    detection_type: str
    confidence: float
    location: Location
    timeline: List[AlertTimelineEvent]
    resolved: bool = False

class AlertCreate(BaseModel):
    user_id: str
    detection_type: str
    confidence: float
    location: Location
    timeline: List[AlertTimelineEvent]

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    emergency_contacts: List[EmergencyContact]
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    name: str
    emergency_contacts: List[EmergencyContact]

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "RAKSHAK API - Women Safety Guardian"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# User endpoints
@api_router.post("/users", response_model=User)
async def create_user(user_data: UserCreate):
    user_dict = user_data.dict()
    user_obj = User(**user_dict)
    await db.users.insert_one(user_obj.dict())
    return user_obj

@api_router.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**user)

# Alert endpoints
@api_router.post("/alerts", response_model=Alert)
async def create_alert(alert_data: AlertCreate):
    alert_dict = alert_data.dict()
    alert_obj = Alert(**alert_dict)
    await db.alerts.insert_one(alert_obj.dict())
    return alert_obj

@api_router.get("/alerts/{alert_id}", response_model=Alert)
async def get_alert(alert_id: str):
    alert = await db.alerts.find_one({"id": alert_id})
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return Alert(**alert)

@api_router.get("/alerts/user/{user_id}", response_model=List[Alert])
async def get_user_alerts(user_id: str):
    alerts = await db.alerts.find({"user_id": user_id}).sort("timestamp", -1).to_list(100)
    return [Alert(**alert) for alert in alerts]

@api_router.put("/alerts/{alert_id}/resolve")
async def resolve_alert(alert_id: str):
    result = await db.alerts.update_one(
        {"id": alert_id},
        {"$set": {"resolved": True}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"message": "Alert resolved successfully"}

# Include the router in the main app
app.include_router(api_router)

# Serve the gesture detection HTML
from fastapi.responses import FileResponse
@app.get("/gesture_view")
async def get_gesture_view():
    return FileResponse(ROOT_DIR / "gesture.html")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
