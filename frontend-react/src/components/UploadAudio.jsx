function UploadAudio({ onUpload }) {
  const handleChange = (e) => {
    if (e.target.files.length > 0) {
      onUpload(e.target.files[0]);
    }
  };

  return (
    <div>
      <input type="file" accept="audio/*" onChange={handleChange} />
    </div>
  );
}

export default UploadAudio;
