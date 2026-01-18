function Transcript({ text }) {
  if (!text) return null;

  return (
    <div>
      <h3>Transcript</h3>
      <p>{text}</p>
    </div>
  );
}

export default Transcript;
