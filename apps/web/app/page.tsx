export default function HomePage() {
  return (
    <main className="container mx-auto px-6 py-12">
      
      {/* Hero Section */}
      <section className="flex flex-col items-center text-center mt-20 mb-32">
        <div className="glass-panel rounded-3xl p-12 max-w-3xl border-t border-l border-white/20">
          <h1 className="text-5xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500">
            Welcome to VaultStream
          </h1>
          <p className="text-gray-300 text-lg mb-8">
            Experience the future of video streaming with our liquid glass interface.
          </p>
          <div className="flex gap-4 justify-center">
            <button className="glass-button bg-cyan-500/20 hover:bg-cyan-500/40 border-cyan-500/50">
              Start Watching
            </button>
            <button className="glass-button">
              Explore Categories
            </button>
          </div>
        </div>
      </section>

      {/* Video Grid Example */}
      <section>
        <h2 className="text-2xl font-bold mb-8 pl-4 border-l-4 border-purple-500">Trending Videos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {/* Glass Video Card 1 */}
          <div className="glass-panel rounded-3xl p-4 transition hover:-translate-y-2 hover:shadow-purple-500/20 duration-300">
            <div className="w-full h-48 bg-white/5 rounded-2xl mb-4"></div>
            <h3 className="font-semibold text-lg mb-2">Liquid UI Design Tutorial</h3>
            <p className="text-sm text-gray-400">120K views • 2 days ago</p>
          </div>

          {/* Glass Video Card 2 */}
          <div className="glass-panel rounded-3xl p-4 transition hover:-translate-y-2 hover:shadow-cyan-500/20 duration-300">
            <div className="w-full h-48 bg-white/5 rounded-2xl mb-4"></div>
            <h3 className="font-semibold text-lg mb-2">Next.js Crash Course</h3>
            <p className="text-sm text-gray-400">85K views • 1 week ago</p>
          </div>

        </div>
      </section>

    </main>
  );
}
