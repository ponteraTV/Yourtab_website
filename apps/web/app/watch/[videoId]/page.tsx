import VideoPlayer from "../../../components/VideoPlayer";

export default function WatchPage({ params }: { params: { videoId: string } }) {
  return (
    <main className="watch-page">
      <header className="site-header"><a href="/" className="brand">yourtab<span>.</span></a><span>Watching now</span></header>
      <section className="watch-layout">
        <div>
          <VideoPlayer videoId={params.videoId} title="Sintel" poster="https://media.w3.org/2010/05/sintel/poster.png" src="https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8" />
          <div className="video-meta"><p className="eyebrow">FEATURED FILM</p><h1>Sintel</h1><p>A young woman searches for a lost dragon in this open movie from the Blender Foundation.</p></div>
        </div>
        <aside className="up-next"><p className="eyebrow">UP NEXT</p><h2>More to explore</h2><p>Your viewing position is saved securely on this device, so you can pick up right where you left off.</p></aside>
      </section>
    </main>
  );
}
