import subprocess
import os

def convert_to_wav(input_path: str, output_path: str):
    cmd = [
        "ffmpeg",
        "-y",
        "-i", input_path,
        "-ar", "16000",
        "-ac", "1",
        output_path
    ]

    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    if not os.path.exists(output_path):
        raise RuntimeError("Audio convert failed")
