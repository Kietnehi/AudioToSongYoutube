export const API_URL = "http://localhost:8000/analyze";

export async function analyzeAudio(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(API_URL, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error("Upload failed");
  }

  return res.json();
}
