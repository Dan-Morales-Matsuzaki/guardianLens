import boto3
import pyaudio
import wave
import subprocess
import os

# ---------------- AWS CONFIG ----------------
REGION = "ap-northeast-1"  # Tokyo
BUCKET_NAME = "guardianlens-audio-uploads"

# Initialize AWS clients
polly = boto3.client("polly", region_name=REGION)
s3 = boto3.client("s3", region_name=REGION)

# ---------------- AUDIO CONFIG ----------------
RECORD_SECONDS = 5
RATE = 16000


def speak(text, voice_id="Joanna"):
    """Use AWS Polly to speak text aloud"""
    print(f"🗣️ Speaking: {text}")
    response = polly.synthesize_speech(
        Text=text,
        OutputFormat="mp3",
        VoiceId=voice_id
    )

    # Save as MP3 and convert to WAV for playback
    with open("speech.mp3", "wb") as f:
        f.write(response["AudioStream"].read())

    subprocess.run(["ffmpeg", "-y", "-i", "speech.mp3", "speech.wav"],
                   capture_output=True)

    wf = wave.open("speech.wav", "rb")
    p = pyaudio.PyAudio()
    stream = p.open(format=p.get_format_from_width(wf.getsampwidth()),
                    channels=wf.getnchannels(),
                    rate=wf.getframerate(),
                    output=True)
    data = wf.readframes(1024)
    while data:
        stream.write(data)
        data = wf.readframes(1024)
    stream.stop_stream()
    stream.close()
    p.terminate()


def record_audio(filename, duration=RECORD_SECONDS):
    """Record voice for <duration> seconds"""
    print(f"🎙️ Recording to {filename}...")
    CHUNK = 1024
    FORMAT = pyaudio.paInt16
    CHANNELS = 1

    p = pyaudio.PyAudio()
    stream = p.open(format=FORMAT,
                    channels=CHANNELS,
                    rate=RATE,
                    input=True,
                    frames_per_buffer=CHUNK)

    frames = []
    for _ in range(int(RATE / CHUNK * duration)):
        data = stream.read(CHUNK)
        frames.append(data)

    print("✅ Done recording.")
    stream.stop_stream()
    stream.close()
    p.terminate()

    wf = wave.open(filename, 'wb')
    wf.setnchannels(CHANNELS)
    wf.setsampwidth(p.get_sample_size(FORMAT))
    wf.setframerate(RATE)
    wf.writeframes(b''.join(frames))
    wf.close()
    print(f"💾 Saved locally: {filename}")
    return filename


def upload_to_s3(filename):
    """Upload file to your S3 bucket"""
    key = os.path.basename(filename)
    print(f"☁️ Uploading {filename} → s3://{BUCKET_NAME}/{key}")
    s3.upload_file(filename, BUCKET_NAME, key)
    print("✅ Upload complete.")
    return f"s3://{BUCKET_NAME}/{key}"


def main():
    # Get event_id from environment variable (set by main.py)
    event_id = os.getenv("EVENT_ID", "unknown_event")
    filename = f"{event_id}.wav"  # ✅ Use event_id as filename

    speak("Are you okay?")
    file_path = record_audio(filename)
    s3_uri = upload_to_s3(file_path)
    print(f"✅ Uploaded to: {s3_uri}")
    speak("Thank you, we have received your message.")


if __name__ == "__main__":
    main()
