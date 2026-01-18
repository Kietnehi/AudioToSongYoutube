from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import shutil
import uuid
import os

# Import các module hiện có
from audio_utils import convert_to_wav
from whisper_service import transcribe

# CẬP NHẬT IMPORT: Thêm get_transcript vào dòng này
from youtube_service import search_youtube, get_transcript

app = FastAPI(title="Audio To YouTube AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# --- 1. API CŨ (GIỮ NGUYÊN) ---
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
        # Xóa file tạm nếu lỗi để tiết kiệm dung lượng (Optional)
        if os.path.exists(input_path): os.remove(input_path)
        if os.path.exists(wav_path): os.remove(wav_path)
        return {"error": "Không nhận diện được nội dung audio"}

    videos = search_youtube(f"{transcript} song", limit=5)

    # Dọn dẹp file tạm sau khi xử lý xong
    if os.path.exists(input_path): os.remove(input_path)
    if os.path.exists(wav_path): os.remove(wav_path)

    return {
        "transcript": transcript,
        "videos": videos
    }

# --- 2. API MỚI: LẤY TRANSCRIPT/SUBTITLE THẬT ---
@app.get("/transcript")
async def get_video_transcript(videoId: str, lang: str = None):
    """
    API để frontend gọi lấy phụ đề.
    Ví dụ gọi: GET /transcript?videoId=dQw4w9WgXcQ
    """
    if not videoId:
        return {"error": "Thiếu videoId"}
    
    # Truyền thêm tham số lang vào hàm xử lý
    data = get_transcript(videoId, target_lang=lang)
    
    return {
        "videoId": videoId,
        "lyrics": data["lyrics"],
        "languages": data["available_languages"], # Trả về danh sách ngôn ngữ
        "current_lang": data["current_lang"]
    }