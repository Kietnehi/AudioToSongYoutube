import React, { useState, useRef, useEffect } from 'react';
// Thêm icon 'X' vào import
import { Upload, Music, Youtube, FileAudio, Loader2, CheckCircle2, Search, Play, ExternalLink, Mic, Square, Trash2, StopCircle, X } from 'lucide-react';
import { analyzeAudio } from "./api"; 

const App = () => {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // --- NEW STATE FOR VIDEO PLAYER ---
  const [selectedVideo, setSelectedVideo] = useState(null);

  // --- RECORDING STATE ---
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);

  // --- HELPER: GET YOUTUBE ID ---
  // Hàm này giúp lấy ID video từ nhiều dạng link YouTube khác nhau
  const getYouTubeID = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // --- RECORDING LOGIC ---
  const startRecording = async (e) => {
    e.stopPropagation();
    setError(null);
    setResult(null);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioFile = new File([audioBlob], "recording.wav", { type: 'audio/wav' });
        validateAndSetFile(audioFile);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      setError("Không thể truy cập microphone. Vui lòng kiểm tra quyền truy cập.");
    }
  };

  const stopRecording = (e) => {
    e.stopPropagation();
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerIntervalRef.current);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // --- FILE HANDLING LOGIC ---
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    validateAndSetFile(droppedFile);
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    validateAndSetFile(selectedFile);
  };

  const validateAndSetFile = (file) => {
    if (file && (file.type.startsWith('audio/') || file.type === 'video/ogg')) {
      setFile(file);
      setError(null);
      setResult(null);
    } else {
      setError("Vui lòng chỉ tải lên định dạng file âm thanh (MP3, WAV, M4A...)");
    }
  };

  const clearFile = (e) => {
    e.stopPropagation();
    setFile(null);
    setResult(null);
    setError(null);
    const fileInput = document.getElementById('fileInput');
    if (fileInput) fileInput.value = '';
  };

  // --- SUBMISSION LOGIC ---
  const handleSubmit = async () => {
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await analyzeAudio(file);
      setResult(data); 
    } catch (err) {
      console.error(err);
      setError("Lỗi xử lý audio. Vui lòng kiểm tra backend.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-slate-800 font-sans relative">
      
      {/* --- VIDEO PLAYER MODAL --- */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setSelectedVideo(null)}>
          <div className="bg-black w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl relative flex flex-col" onClick={e => e.stopPropagation()}>
            
            {/* Header Modal */}
            <div className="flex items-center justify-between p-4 bg-gray-900 text-white">
               <h3 className="text-lg font-semibold truncate pr-4">{selectedVideo.title}</h3>
               <button 
                onClick={() => setSelectedVideo(null)}
                className="p-2 hover:bg-gray-700 rounded-full transition-colors"
               >
                 <X size={24} />
               </button>
            </div>

            {/* Youtube Iframe */}
            <div className="relative w-full aspect-video bg-black">
              <iframe 
                src={`https://www.youtube.com/embed/${getYouTubeID(selectedVideo.link)}?autoplay=1`} 
                title={selectedVideo.title}
                className="absolute inset-0 w-full h-full"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-red-600 p-2 rounded-lg text-white">
              <Music size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-600 to-purple-600">
                Audio2Youtube AI
              </h1>
              <p className="text-xs text-gray-500 font-medium">Whisper AI + yt-dlp Engine</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-gray-900">Tìm bài hát qua giọng hát hoặc file</h2>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Hát một đoạn, tải lên file ghi âm hoặc nhạc chuông. AI sẽ nghe lời và tìm video gốc cho bạn.
          </p>
        </div>

        {/* --- MAIN INTERACTION AREA --- */}
        <div 
          className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ease-in-out cursor-pointer overflow-hidden
            ${isDragging ? 'border-red-500 bg-red-50 scale-[1.02]' : 'border-gray-300 bg-white hover:border-red-400 hover:bg-gray-50'}
            ${file ? 'border-green-500 bg-green-50' : ''}
            ${isRecording ? 'border-red-500 bg-red-50' : ''}
          `}
          onDragOver={!isRecording ? handleDragOver : undefined}
          onDragLeave={!isRecording ? handleDragLeave : undefined}
          onDrop={!isRecording ? handleDrop : undefined}
          onClick={() => !file && !isRecording && document.getElementById('fileInput').click()}
        >
          <input 
            type="file" 
            id="fileInput" 
            className="hidden" 
            accept="audio/*"
            onChange={handleFileSelect}
            disabled={isRecording}
          />
          
          <div className="flex flex-col items-center justify-center space-y-6 min-h-[200px]">
            
            {isRecording ? (
              <div className="animate-in fade-in zoom-in duration-300 flex flex-col items-center z-20">
                <div className="relative">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 animate-ping"></span>
                  <div className="relative w-20 h-20 bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg">
                    <Mic size={40} />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-red-600 mt-6 animate-pulse">Đang thu âm...</h3>
                <p className="text-2xl font-mono font-medium text-gray-800 mt-2">{formatTime(recordingTime)}</p>
                <button 
                  onClick={stopRecording}
                  className="mt-6 flex items-center gap-2 px-6 py-2 bg-red-100 text-red-700 rounded-full font-semibold hover:bg-red-200 transition-colors z-30"
                >
                  <Square size={18} fill="currentColor" /> Dừng lại
                </button>
              </div>
            ) : file ? (
              <div className="animate-in fade-in zoom-in duration-300 w-full max-w-md">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                  <FileAudio size={32} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 truncate px-4">{file.name}</h3>
                <p className="text-sm text-gray-500 mb-6">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                
                <div className="flex justify-center gap-3">
                   <button 
                    onClick={(e) => { e.stopPropagation(); handleSubmit(); }}
                    className="px-6 py-2 bg-green-600 text-white rounded-full font-medium hover:bg-green-700 shadow-lg shadow-green-200 transition-all hover:-translate-y-1"
                  >
                    Phân tích ngay
                  </button>
                  <button 
                    onClick={clearFile}
                    className="px-4 py-2 bg-white text-gray-600 border border-gray-200 rounded-full font-medium hover:bg-gray-100 hover:text-red-500 transition-colors flex items-center gap-2"
                  >
                    <Trash2 size={16} /> Xóa
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-2 mx-auto">
                    <Upload size={32} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Chọn file hoặc Kéo thả vào đây</h3>
                  <p className="text-sm text-gray-500">Hỗ trợ MP3, WAV, M4A (Max 10MB)</p>
                </div>

                <div className="flex items-center w-full max-w-xs mx-auto">
                  <div className="flex-grow h-px bg-gray-200"></div>
                  <span className="px-3 text-sm text-gray-400 font-medium">HOẶC</span>
                  <div className="flex-grow h-px bg-gray-200"></div>
                </div>

                <button
                  onClick={startRecording}
                  className="group flex items-center gap-2 px-6 py-3 bg-white border-2 border-red-100 text-red-600 rounded-full font-semibold hover:bg-red-50 hover:border-red-200 hover:shadow-md transition-all z-20"
                >
                  <div className="p-1.5 bg-red-100 rounded-full group-hover:bg-red-200 transition-colors">
                    <Mic size={18} />
                  </div>
                  Thu âm giọng hát
                </button>
              </>
            )}
          </div>
        </div>

        {/* LOADING STATE */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="w-full max-w-md space-y-3">
              <div className="flex items-center justify-between text-sm font-medium text-gray-600">
                <span className="flex items-center gap-2">
                  <Loader2 className="animate-spin" size={16} />
                  Đang xử lý file & tìm kiếm...
                </span>
                <span>Vui lòng chờ</span>
              </div>
              <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-600 animate-pulse rounded-full"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ERROR MESSAGE */}
        {error && (
          <div className="text-center text-red-600 bg-red-50 px-4 py-3 rounded-lg text-sm font-medium animate-pulse border border-red-100">
            ⚠️ {error}
          </div>
        )}

        {/* RESULTS */}
        {result && (
          <div className="animate-in slide-in-from-bottom-5 duration-500 space-y-8 pb-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="md:col-span-1 space-y-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 h-full flex flex-col">
                  <div className="flex items-center gap-2 mb-4 text-purple-700">
                    <Music size={20} />
                    <h3 className="font-bold">Nội dung nhận diện</h3>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 italic leading-relaxed flex-grow overflow-y-auto border border-gray-100 max-h-64">
                    "{result.transcript}"
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-red-600">
                    <Youtube size={24} />
                    <h3 className="font-bold text-lg text-gray-800">Kết quả tìm thấy</h3>
                  </div>
                </div>

                <div className="space-y-4">
                  {result.videos && result.videos.length > 0 ? (
                    result.videos.map((video, index) => (
                      <div 
                        key={video.id || index}
                        // Sửa logic onClick tại đây: Set selectedVideo thay vì window.open
                        onClick={() => setSelectedVideo(video)}
                        className="group bg-white rounded-xl shadow-sm border border-gray-200 p-3 flex flex-col sm:flex-row gap-4 hover:shadow-md hover:border-red-200 transition-all cursor-pointer"
                      >
                        <div className="relative w-full sm:w-48 aspect-video rounded-lg overflow-hidden bg-gray-200 flex-shrink-0">
                          {video.thumbnail && (
                            <img 
                              src={video.thumbnail} 
                              alt={video.title} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          )}
                          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <Play size={32} className="text-white drop-shadow-lg" fill="white" />
                          </div>
                        </div>

                        <div className="flex-1 min-w-0 py-1 flex flex-col justify-between">
                          <div>
                            <h4 className="font-semibold text-gray-900 line-clamp-2 leading-tight group-hover:text-red-600 transition-colors">
                              {video.title}
                            </h4>
                            <p className="text-sm text-gray-500 mt-1">{video.channel}</p>
                          </div>
                          <div className="flex items-center gap-3 mt-3">
                            {video.views && (
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded border border-gray-200">
                                {video.views}
                              </span>
                            )}
                            <span 
                                // Nếu muốn mở tab mới thì bấm vào link text nhỏ này
                                onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(video.link, '_blank');
                                }}
                                className="flex items-center gap-1 text-xs text-red-600 font-medium ml-auto hover:underline z-10"
                            >
                              Mở tab mới <ExternalLink size={12} />
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-4">
                      Không tìm thấy video nào phù hợp.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default App;