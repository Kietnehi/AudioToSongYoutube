import { useRef, useState } from "react";

function RecordAudio({ onRecorded }) {
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const [recording, setRecording] = useState(false);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    mediaRecorderRef.current = new MediaRecorder(stream);
    chunksRef.current = [];

    mediaRecorderRef.current.ondataavailable = (e) => {
      chunksRef.current.push(e.data);
    };

    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const file = new File([blob], "recorded.webm", { type: "audio/webm" });
      onRecorded(file);
    };

    mediaRecorderRef.current.start();
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    setRecording(false);
  };

  return (
    <div>
      {!recording ? (
        <button onClick={startRecording}>🎙️ Record</button>
      ) : (
        <button onClick={stopRecording}>⏹️ Stop</button>
      )}
    </div>
  );
}

export default RecordAudio;
