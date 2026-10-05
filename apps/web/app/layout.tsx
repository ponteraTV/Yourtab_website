import './styles.css';
import { ReactNode } from 'react';

export const metadata = {
  title: 'YourTab',
  description: 'Premium Video Streaming Platform',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="relative min-h-screen bg-black text-white antialiased">
        
        {/* Background Liquid Glow Blobs */}
        <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/30 glow-blob -z-10 animate-pulse"></div>
        <div className="fixed bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-cyan-500/20 glow-blob -z-10" style={{ animationDelay: '2s' }}></div>
        
        {/* Main Content Area */}
        <div className="relative z-10 flex flex-col min-h-screen">
          {children}
        </div>

      </body>
    </html>
  );
}
