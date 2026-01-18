from yt_dlp import YoutubeDL

def search_youtube(query: str, limit: int = 5):
    with YoutubeDL({
        "quiet": True,
        "extract_flat": True,
    }) as ydl:
        info = ydl.extract_info(
            f"ytsearch{limit}:{query}",
            download=False
        )

    results = []
    for item in info.get("entries", []):
        if not item:
            continue

        video_id = item["id"]

        results.append({
            "id": video_id,
            "title": item.get("title"),
            "url": f"https://www.youtube.com/watch?v={video_id}",
            "thumbnail": f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"
        })

    return results
