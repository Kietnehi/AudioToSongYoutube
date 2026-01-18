import whisper

model = whisper.load_model("small")

def transcribe(audio_path: str) -> str:
    result = model.transcribe(audio_path, language="vi")
    return result["text"].strip()
