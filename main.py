import cv2
import mediapipe as mp
import numpy as np
import time
import subprocess
import json
import requests
import threading
import uuid
import os  # ✅ Needed to pass environment variables
from datetime import datetime
from collections import deque

# ========== CONFIG ==========
DEVICE_ID = "gd001"
LOCATION = "Sangenjaya, Tokyo"
AUDIO_SCRIPT = "audio.py"
API_GATEWAY_URL = "https://2my4ydca3e.execute-api.ap-northeast-1.amazonaws.com/dev"
COOLDOWN_TIME = 30.0  # seconds to wait before next detection
# ============================

mp_drawing = mp.solutions.drawing_utils
mp_pose = mp.solutions.pose

cap = cv2.VideoCapture(0)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

# --- rolling averages ---
head_vx = deque(maxlen=5)
head_vy = deque(maxlen=5)
tilt_hist = deque(maxlen=5)

prev_head_x, prev_head_y = None, None
prev_tilt = None
prev_time = time.time()
fall_detected = False
cooldown_active = False
last_fall_time = 0
last_timestamp = ""

# ---- tunable parameters ----
SPEED_THRESHOLD = 0.55
HORIZ_WEIGHT = 1.8
TILT_THRESHOLD = 12
HEAD_LOW_THRESHOLD = 0.78
CONSISTENT_FRAMES = 2
# ----------------------------

consistent = 0
print("🎥 Starting fall detection system... Press 'q' to quit.")

# ============================
# 🚀 ASYNC API FUNCTION
# ============================
def send_to_api_gateway_async(data):
    def worker():
        try:
            response = requests.post(API_GATEWAY_URL, json=data, timeout=5)
            if response.status_code == 200:
                print("✅ Successfully sent to API Gateway.")
            else:
                print(f"⚠️ API Gateway responded with {response.status_code}: {response.text}")
        except Exception as e:
            print(f"❌ Failed to send to API Gateway: {e}")
    threading.Thread(target=worker, daemon=True).start()

# ============================
# 🚀 ASYNC AUDIO FUNCTION
# ============================
def trigger_audio_async(event_id):
    """Run audio.py asynchronously with EVENT_ID passed to environment"""
    def worker():
        try:
            subprocess.run(
                ["python3", AUDIO_SCRIPT],
                check=True,
                env={**os.environ, "EVENT_ID": event_id}  # ✅ Pass event_id to audio.py
            )
        except Exception as e:
            print(f"⚠️ Failed to trigger audio script: {e}")
    threading.Thread(target=worker, daemon=True).start()

# ============================
# 🎯 FALL DETECTION LOOP
# ============================
with mp_pose.Pose(min_detection_confidence=0.5) as pose:
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        img_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose.process(img_rgb)
        image = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)
        now = time.time()

        # 🧊 Skip detection if cooldown active
        if cooldown_active:
            cv2.putText(image, "🚨 FALL DETECTED!", (40, 80),
                        cv2.FONT_HERSHEY_SIMPLEX, 2.0, (0, 0, 255), 5)
            cv2.putText(image, f"Time: {last_timestamp}", (40, 150),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 255), 2)

            # End cooldown after timer expires
            if now - last_fall_time >= COOLDOWN_TIME:
                cooldown_active = False
                fall_detected = False
                consistent = 0  # ✅ reset detection buffer
                print("✅ Cooldown finished, resuming monitoring...")

            cv2.imshow("All-Direction Fall Detection", image)
            if cv2.waitKey(10) & 0xFF == ord('q'):
                break
            continue

        # 🧍 Normal monitoring path
        if results.pose_landmarks:
            lm = results.pose_landmarks.landmark
            head = lm[0]
            LSH, RSH = lm[11], lm[12]

            head_x, head_y = head.x, head.y
            tilt_angle = np.degrees(np.arctan2(RSH.y - LSH.y, RSH.x - LSH.x))

            if prev_head_x is not None:
                dt = now - prev_time if now > prev_time else 1e-6
                vx = (head_x - prev_head_x) / dt
                vy = (head_y - prev_head_y) / dt

                head_vx.append(vx)
                head_vy.append(vy)
                tilt_hist.append(abs(tilt_angle - (prev_tilt or tilt_angle)))

                avg_vx = np.mean(head_vx)
                avg_vy = np.mean(head_vy)
                avg_speed = np.mean(np.sqrt((HORIZ_WEIGHT * np.array(head_vx))**2 + np.array(head_vy)**2))
                avg_tilt_rate = np.mean(tilt_hist)

                # Fall condition: sudden movement + head drop or large tilt
                if (
                    avg_speed > SPEED_THRESHOLD
                    and (avg_vy > 0.25 or abs(avg_vx) > 0.25)
                    and (head_y > HEAD_LOW_THRESHOLD or avg_tilt_rate > TILT_THRESHOLD)
                ):
                    consistent += 1
                else:
                    consistent = max(0, consistent - 1)

                # ✅ FALL CONFIRMED
                if consistent >= CONSISTENT_FRAMES and not cooldown_active:
                    cooldown_active = True
                    fall_detected = True
                    last_fall_time = now
                    consistent = 0
                    last_timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

                    # ✅ Add unique event ID here
                    fall_event = {
                        "event_id": str(uuid.uuid4()),  # <-- unique per detection
                        "event": "Fall_Detected",
                        "device_id": DEVICE_ID,
                        "timestamp": last_timestamp,
                        "location": LOCATION
                    }

                    print(f"🚨 FALL DETECTED at {last_timestamp}")
                    print("📦 JSON payload:")
                    print(json.dumps(fall_event, indent=4))

                    send_to_api_gateway_async(fall_event)
                    trigger_audio_async(fall_event["event_id"])  # ✅ Pass event_id here

                mp_drawing.draw_landmarks(image, results.pose_landmarks, mp_pose.POSE_CONNECTIONS)

            prev_head_x, prev_head_y, prev_tilt = head_x, head_y, tilt_angle
            prev_time = now

        # Default display
        if not fall_detected:
            cv2.putText(image, "Monitoring...", (40, 80),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.8, (0, 255, 0), 4)

        cv2.imshow("All-Direction Fall Detection", image)
        if cv2.waitKey(10) & 0xFF == ord('q'):
            break

cap.release()
cv2.destroyAllWindows()
print("👋 Fall detection stopped.")
