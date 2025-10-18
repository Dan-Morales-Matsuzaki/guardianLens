import os

# FIX: force Hugging Face to store model files in a writable directory
os.environ["TRANSFORMERS_CACHE"] = "/tmp/hf_cache"
os.environ["HF_HOME"] = "/tmp/hf_home"
os.makedirs("/tmp/hf_cache", exist_ok=True)
os.makedirs("/tmp/hf_home", exist_ok=True)

from fastapi import FastAPI
from pydantic import BaseModel
from transformers import pipeline
import requests
from datetime import datetime, timezone  # ✅ Added for timestamp


# -------------------------------------------------------------------
# Guardian Lens – Intent Classifier
# -------------------------------------------------------------------
app = FastAPI(title="Guardian Lens Intent Classifier")

print("🔄 Loading model...")
classifier = pipeline("zero-shot-classification", model="valhalla/distilbart-mnli-12-1")
LABELS = ["SAFE", "HELP"]
print("✅ Model loaded and ready.")

# -------------------------------------------------------------------
# AWS endpoint to send the full classified result
# -------------------------------------------------------------------
AWS_ENDPOINT = "https://kku88bm7g7.execute-api.ap-northeast-1.amazonaws.com/dev"

# -------------------------------------------------------------------
# Input schema
# -------------------------------------------------------------------
class InputData(BaseModel):
    event_id: str
    transcript: str | None = ""

# -------------------------------------------------------------------
# Routes
# -------------------------------------------------------------------
@app.get("/")
async def root():
    return {"message": "Guardian Lens Intent Classifier running 🚀"}


@app.post("/classify")
async def classify_text(data: InputData):
    event_id = data.event_id
    transcript = (data.transcript or "").strip()

    # 🧩 Log the input
    print("\n🟢 Received new classification request:")
    print(f"Event ID: {event_id}")
    print(f"Transcript: {repr(transcript)}")

    # 🕒 Generate mock timestamp
    timestamp = datetime.now(timezone.utc).isoformat()
    print(f"🕒 Generated timestamp: {timestamp}")

    # 🧠 CASE 1: No transcript → direct HELP
    if not transcript:
        enriched = {
            "event_id": event_id,
            "transcript": "",
            "intent": "HELP",
            "confidence": 1.0,
            "timestamp": timestamp  # ✅ Added timestamp
        }
        print("🚨 Empty transcript detected → Treating as HELP.")
        print("📦 Sending payload to AWS:", enriched)
        try:
            r = requests.post(AWS_ENDPOINT, json=enriched, timeout=10)
            print(f"✅ Sent HELP to AWS ({r.status_code})")
        except Exception as e:
            print("⚠️ Failed to send HELP to AWS:", e)
        return enriched

    # 🧠 CASE 2: Normal text classification
    try:
        result = classifier(transcript, LABELS)
        intent = result["labels"][0]
        confidence = round(float(result["scores"][0]), 3)
    except Exception as e:
        print("❌ Model error:", e)
        return {
            "event_id": event_id,
            "transcript": transcript,
            "intent": "UNKNOWN",
            "confidence": 0.0,
            "timestamp": timestamp  # ✅ Still include timestamp even on error
        }

    enriched = {
        "event_id": event_id,
        "transcript": transcript,
        "intent": intent,
        "confidence": confidence,
        "timestamp": timestamp  # ✅ Added timestamp
    }

    # 🪶 Log the outgoing payload
    print("\n📦 Classified result (to send):", enriched)

    # Send to AWS
    try:
        r = requests.post(AWS_ENDPOINT, json=enriched, timeout=10)
        print(f"✅ Sent to AWS ({r.status_code}) {r.text}")
    except Exception as e:
        print("⚠️ Failed to send to AWS:", e)

    return enriched


# -------------------------------------------------------------------
# Local run (for debugging)
# -------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)
