// src/api.js

// 1. Đặt URL gốc là localhost:8000 (Port của FastAPI)
export const API_BASE_URL = "http://localhost:8000"; 

export async function analyzeAudio(file) {
  const formData = new FormData();
  formData.append("file", file);

  // Gọi endpoint /analyze
  const res = await fetch(`${API_BASE_URL}/analyze`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error("Upload failed");
  }

  return res.json();
}

// 2. Thêm hàm lấy phụ đề từ endpoint /transcript
export const fetchTranscript = async (videoId, langCode = null) => {
  try {
    // Nếu có langCode thì thêm vào URL, không thì thôi
    const url = langCode 
        ? `${API_BASE_URL}/transcript?videoId=${videoId}&lang=${langCode}`
        : `${API_BASE_URL}/transcript?videoId=${videoId}`;

    const response = await fetch(url);
    const data = await response.json();
    
    // Trả về cả lyrics và danh sách ngôn ngữ
    return {
        lyrics: data.lyrics || [],
        languages: data.languages || [],
        current_lang: data.current_lang || ""
    };
  } catch (error) {
    console.error("Lỗi lấy phụ đề:", error);
    return { lyrics: [], languages: [] };
  }
};