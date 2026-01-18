from yt_dlp import YoutubeDL
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound

def search_youtube(query: str, limit: int = 5):
    # (Giữ nguyên code hàm search cũ của bạn)
    with YoutubeDL({"quiet": True, "extract_flat": True}) as ydl:
        info = ydl.extract_info(f"ytsearch{limit}:{query}", download=False)
    results = []
    for item in info.get("entries", []):
        if not item: continue
        video_id = item["id"]
        results.append({
            "id": video_id,
            "title": item.get("title"),
            "url": f"https://www.youtube.com/watch?v={video_id}",
            "thumbnail": f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"
        })
    return results

def get_transcript(video_id: str, target_lang: str = None):
    print(f"--- Đang tìm transcript: {video_id} (Lang: {target_lang}) ---")
    try:
        # 1. Lấy danh sách tất cả transcript
        try:
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        except AttributeError:
            transcript_list = YouTubeTranscriptApi().list(video_id)

        # 2. Tạo danh sách các ngôn ngữ có sẵn để trả về cho Frontend
        available_languages = []
        for t in transcript_list:
            available_languages.append({
                "code": t.language_code,
                "name": t.language,
                "is_generated": t.is_generated
            })

        # 3. Chọn transcript mục tiêu
        transcript = None
        
        if target_lang:
            # Nếu người dùng chọn ngôn ngữ cụ thể
            try:
                transcript = transcript_list.find_transcript([target_lang])
            except:
                # Nếu không tìm thấy, thử tìm bản dịch (Translation)
                # Lấy bản gốc bất kỳ và dịch sang target_lang
                try:
                    transcript = list(transcript_list)[0].translate(target_lang)
                except:
                    print(f"Không thể dịch sang {target_lang}")

        # Nếu chưa có transcript (hoặc không chọn lang), chạy logic mặc định (Ưu tiên Việt -> Anh)
        if not transcript:
            try:
                transcript = transcript_list.find_transcript(['vi', 'en'])
            except:
                try:
                    transcript = transcript_list.find_generated_transcript(['vi', 'en'])
                except:
                    # Lấy cái đầu tiên tìm thấy
                    transcript = list(transcript_list)[0]

        # 4. Lấy dữ liệu
        final_data = transcript.fetch()
        
        # 5. Format dữ liệu
        formatted_lyrics = []
        for line in final_data:
            # Xử lý an toàn cho cả Object và Dict
            if isinstance(line, dict):
                text = line['text']
                start = line['start']
                duration = line.get('duration', 0)
            else:
                text = line.text
                start = line.start
                duration = line.duration

            formatted_lyrics.append({
                "text": text,
                "start": start,
                "end": start + duration
            })

        return {
            "lyrics": formatted_lyrics,
            "available_languages": available_languages,
            "current_lang": transcript.language_code
        }

    except Exception as e:
        print(f"Lỗi lấy sub: {e}")
        return {"lyrics": [], "available_languages": [], "current_lang": ""}