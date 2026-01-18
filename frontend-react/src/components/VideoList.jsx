function VideoList({ videos }) {
  if (!videos.length) return null;

  return (
    <div>
      <h3>Kết quả YouTube</h3>
      {videos.map((v) => (
        <div key={v.id} className="video">
          <h4>{v.title}</h4>

          <a href={v.url} target="_blank">
            <img src={v.thumbnail} width="400" />
          </a>

          <iframe
            width="560"
            height="315"
            src={`https://www.youtube.com/embed/${v.id}`}
            allowFullScreen
          ></iframe>
        </div>
      ))}
    </div>
  );
}

export default VideoList;
