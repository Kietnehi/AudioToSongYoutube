import React, { useState, useRef, useEffect } from 'react';
import YouTube from 'react-youtube'; // Thư viện Youtube Player
import { 
  Upload, Music, Youtube, FileAudio, Loader2, CheckCircle2, 
  Search, Play, ExternalLink, Mic, Square, Trash2, StopCircle, 
  X, AlignLeft ,Globe
} from 'lucide-react';

// Import 2 API: Phân tích audio & Lấy phụ đề
import { analyzeAudio, fetchTranscript } from "./api"; 

const App = () => {
  // --- 1. STATE CŨ (QUẢN LÝ FILE & KẾT QUẢ) ---
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [availableLangs, setAvailableLangs] = useState([]); // Danh sách ngôn ngữ có sẵn
  const [currentLang, setCurrentLang] = useState("");       // Ngôn ngữ đang chọn
  // --- 2. STATE VIDEO & LYRICS (MỚI) ---
  const [selectedVideo, setSelectedVideo] = useState(null); // Video đang chọn
  const [player, setPlayer] = useState(null);               // Instance của Youtube Player
  const [currentTime, setCurrentTime] = useState(0);        // Thời gian thực (giây)
  const [realLyrics, setRealLyrics] = useState([]);         // Mảng lời bài hát từ API
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false); // Loading khi tải sub
  const activeLineRef = useRef(null);                       // Ref để tự động cuộn

  // --- 3. STATE RECORDING (THU ÂM) ---
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);

  // --- HÀM TÁCH ID YOUTUBE (CẬP NHẬT: HỖ TRỢ SHORTS & CÁC DẠNG LINK) ---
  const getYouTubeID = (url) => {
    if (!url) return null;
    if (url.length === 11) return url;
    
    // Hỗ trợ link Shorts
    if (url.includes("/shorts/")) {
      const shortsMatch = url.match(/shorts\/([\w-]{11})/);
      if (shortsMatch) return shortsMatch[1];
    }

    // Các dạng link thường
    url = url.replace(/(>|<)/gi,'').split(/(vi\/|v=|\/v\/|youtu\.be\/|\/embed\/)/);
    if(url[2] !== undefined) {
      const id = url[2].split(/[^0-9a-z_\-]/i);
      return id[0];
    }
    return null;
  };

  // --- LOGIC YOUTUBE PLAYER & SYNC LYRICS ---
  
  // Khi Player sẵn sàng, lưu instance lại để dùng lệnh seekTo, getCurrentTime
  const onPlayerReady = (event) => {
    setPlayer(event.target);
  };

  // Vòng lặp lấy thời gian hiện tại của video (0.5s/lần)
  useEffect(() => {
    let interval;
    if (selectedVideo && player) {
      interval = setInterval(() => {
        const time = player.getCurrentTime(); 
        setCurrentTime(time);
      }, 500);
    }
    return () => clearInterval(interval);
  }, [selectedVideo, player]);

  // Tự động cuộn xuống dòng đang hát (Active Line)
  useEffect(() => {
    if (activeLineRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentTime]);

  // --- HÀM MỚI: TẢI DỮ LIỆU (LYRICS + NGÔN NGỮ) ---
  const loadTranscriptData = async (videoId, langCode = null) => {
      setIsLoadingLyrics(true);
      
      // Gọi API (Hàm này đã sửa bên api.js để trả về object chứa cả languages)
      const data = await fetchTranscript(videoId, langCode);
      
      setRealLyrics(data.lyrics);       // Lưu lời bài hát
      setAvailableLangs(data.languages); // Lưu danh sách ngôn ngữ (để hiện menu)
      setCurrentLang(data.current_lang); // Lưu ngôn ngữ hiện tại
      
      setIsLoadingLyrics(false);
  };

  // --- HÀM MỚI: XỬ LÝ KHI NGƯỜI DÙNG ĐỔI NGÔN NGỮ ---
  const handleChangeLanguage = (e) => {
    const newLang = e.target.value;
    const videoId = selectedVideo.id || getYouTubeID(selectedVideo.url || selectedVideo.link);
    
    // Nếu chọn ngôn ngữ khác cái hiện tại thì tải lại
    if (videoId && newLang !== currentLang) {
        loadTranscriptData(videoId, newLang);
    }
  };

  // --- SỬA LẠI HÀM NÀY: KHI CLICK CHỌN VIDEO ---
  const handleSelectVideo = (video) => {
    setSelectedVideo(video);
    setRealLyrics([]);
    setAvailableLangs([]); // Reset danh sách ngôn ngữ cũ
    
    const videoId = video.id || getYouTubeID(video.url || video.link);
    if (videoId) {
        loadTranscriptData(videoId); // Gọi lần đầu (không tham số lang)
    }
  };

  // --- RECORDING FUNCTIONS ---
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
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => { setIsDragging(false); };
  
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
      setError("Lỗi xử lý audio. Vui lòng kiểm tra backend (Port 8000).");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-slate-800 font-sans relative">
      
      {/* --- MODAL PLAYER MỚI (CHIA 2 CỘT: VIDEO + LYRICS) --- */}
      {selectedVideo && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => { setSelectedVideo(null); setPlayer(null); }}
        >
          <div 
            className="bg-black w-full max-w-6xl h-[80vh] rounded-xl overflow-hidden shadow-2xl flex flex-col md:flex-row relative border border-gray-800"
            onClick={e => e.stopPropagation()}
          >
            {/* CỘT 1: VIDEO PLAYER */}
            <div className="flex-1 flex flex-col bg-black relative group">
                <div className="flex items-center justify-between p-3 bg-gray-900 text-white border-b border-gray-800">
                    <h3 className="text-sm font-semibold truncate pr-4 text-gray-100">
                        {selectedVideo.title}
                    </h3>
                </div>
                
                <div className="flex-1 relative bg-black flex items-center justify-center">
                    {(() => {
                        const videoId = selectedVideo.id || getYouTubeID(selectedVideo.url || selectedVideo.link);
                        if (videoId) {
                            return (
                                <YouTube
                                    videoId={videoId}
                                    className="w-full h-full absolute inset-0"
                                    iframeClassName="w-full h-full"
                                    onReady={onPlayerReady}
                                    opts={{
                                        playerVars: { autoplay: 1, playsinline: 1, rel: 0 }
                                    }}
                                />
                            );
                        } else {
                            return <p className="text-red-500">Lỗi: Không tìm thấy ID Video</p>;
                        }
                    })()}
                </div>
            </div>

            {/* CỘT 2: LYRICS TIMELINE */}
            <div className="w-full md:w-80 bg-gray-900 border-l border-gray-800 flex flex-col h-full">
                <div className="p-4 border-b border-gray-800 bg-gray-900 flex justify-between items-center">
                    <h4 className="text-white font-bold flex items-center gap-2">
                        <AlignLeft size={18} className="text-red-500"/> Lời bài hát (CC)
                    </h4>
                    <button 
                        onClick={() => setSelectedVideo(null)} 
                        className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
                            {/* --- THÊM ĐOẠN NÀY: MENU CHỌN NGÔN NGỮ --- */}
                {availableLangs.length > 0 && (
                    <div className="flex items-center gap-2 bg-gray-800 rounded px-2 py-1.5 border border-gray-700">
                        <Globe size={14} className="text-blue-400"/>
                        <select 
                            value={currentLang} 
                            onChange={handleChangeLanguage}
                            className="bg-transparent text-xs text-white w-full outline-none cursor-pointer"
                        >
                            {availableLangs.map((lang, idx) => (
                                <option key={idx} value={lang.code} className="text-black">
                                    {lang.name} {lang.is_generated ? '(Auto)' : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                )}       
                <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                    {isLoadingLyrics ? (
                        <div className="flex flex-col items-center justify-center h-40 text-gray-500 gap-3">
                            <Loader2 className="animate-spin text-red-500" size={24} />
                            <p className="text-xs">Đang tải phụ đề...</p>
                        </div>
                    ) : realLyrics.length > 0 ? (
                       realLyrics.map((line, index) => {
                        // --- SỬA Ở ĐÂY ---
                        // 1. Lấy thời gian bắt đầu của dòng kế tiếp (nếu là dòng cuối thì lấy Infinity)
                        const nextLineStart = realLyrics[index + 1]?.start || Infinity;

                        // 2. Tính thời điểm kết thúc thực tế (Cắt ngắn nếu dòng sau chèn vào)
                        // Lấy giá trị NHỎ HƠN giữa: (End của dòng hiện tại) và (Start của dòng sau)
                        const activeEndTime = Math.min(line.end, nextLineStart);

                        // 3. Kiểm tra active bằng thời gian mới
                        const isActive = currentTime >= line.start && currentTime < activeEndTime;
                        // ------------------

                        return (
                            <div 
                                key={index}
                                ref={isActive ? activeLineRef : null} // Gắn ref để auto scroll
                                onClick={() => player && player.seekTo(line.start, true)} // Click để tua
                                className={`
                                    group cursor-pointer transition-all duration-300 p-3 rounded-lg text-sm leading-relaxed border border-transparent
                                    ${isActive 
                                        ? 'bg-red-600 text-white shadow-lg scale-[1.02] font-medium' 
                                        : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                                    }
                                `}
                            >
                                <div className={`flex justify-between mb-1 text-[10px] font-mono tracking-wider opacity-60 ${isActive ? 'text-gray-200' : ''}`}>
                                    {/* Format thời gian hiển thị */}
                                    <span>{formatTime(Math.floor(line.start))}</span>
                                </div>
                                <p>{line.text}</p>
                            </div>
                        );
                    })
                    ) : (
                        <div className="flex flex-col items-center justify-center h-40 text-gray-500 p-4 text-center">
                            <Music size={32} className="mb-2 opacity-20" />
                            <p className="text-sm font-medium text-gray-400">Không có lời bài hát</p>
                            <p className="text-xs mt-1 opacity-60">Video này chưa có phụ đề hoặc không hỗ trợ.</p>
                        </div>
                    )}
                </div>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
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

        {/* --- MAIN INTERACTION AREA (Upload / Record) --- */}
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

        {/* RESULTS GRID */}
        {result && (
          <div className="animate-in slide-in-from-bottom-5 duration-500 space-y-8 pb-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Cột Trái: Transcript */}
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

              {/* Cột Phải: Danh sách Video */}
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
                        // CLICK VÀO ĐÂY GỌI HÀM MỞ MODAL & TẢI SUB
                        onClick={() => handleSelectVideo(video)} 
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
                                onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(video.url || video.link, '_blank');
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