from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import shutil
import uuid
import os

from audio_utils import convert_to_wav
from whisper_service import transcribe
from youtube_service import search_youtube

app = FastAPI(title="Audio To YouTube AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.post("/analyze")
async def analyze_audio(file: UploadFile = File(...)):
    file_id = str(uuid.uuid4())

    input_path = f"{UPLOAD_DIR}/{file_id}_{file.filename}"
    wav_path = f"{UPLOAD_DIR}/{file_id}.wav"

    with open(input_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    convert_to_wav(input_path, wav_path)

    transcript = transcribe(wav_path)

    if len(transcript) < 5:
        return {"error": "Không nhận diện được nội dung audio"}

    videos = search_youtube(f"{transcript} song", limit=5)

    return {
        "transcript": transcript,
        "videos": videos
    }
