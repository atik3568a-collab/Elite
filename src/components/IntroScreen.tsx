import { motion, AnimatePresence } from 'framer-motion';
import { Crown } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function IntroScreen({ onComplete }: { onComplete: () => void }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 1000); // Wait for exit animation
    }, 2500); // Show for 2.5 seconds
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-[200] bg-black flex items-center justify-center overflow-hidden"
          exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)", transition: { duration: 0.8, ease: "easeInOut" } }}
        >
          {/* Background Effects */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-[100px] animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] animate-pulse delay-1000" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[120px]" />
          </div>

          {/* Grid Pattern */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col items-center">
            <motion.div
              initial={{ scale: 0, rotate: -180, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20, duration: 1.5 }}
              className="mb-8 relative"
            >
              <div className="absolute inset-0 bg-amber-500/30 blur-2xl rounded-full animate-pulse" />
              <div className="relative z-10 p-6 bg-black/40 backdrop-blur-xl rounded-full border border-white/10 shadow-2xl ring-1 ring-white/5">
                <Crown size={64} className="text-amber-400 drop-shadow-[0_0_15px_rgba(251,191,36,0.6)]" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="text-center relative"
            >
              <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter leading-none mb-2 relative z-10 drop-shadow-2xl">
                ELITE
              </h1>
              <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-indigo-500 to-sky-400 tracking-tighter leading-none animate-gradient-x drop-shadow-lg">
                FF
              </h1>
              
              {/* Glitch Effect Layers */}
              <motion.div 
                className="absolute inset-0 text-6xl md:text-8xl font-black text-red-500/20 tracking-tighter leading-none z-0"
                animate={{ x: [-2, 2, -2], opacity: [0, 0.5, 0] }}
                transition={{ duration: 0.2, repeat: Infinity, repeatDelay: 3 }}
              >
                ELITE
              </motion.div>
              <motion.div 
                className="absolute inset-0 top-16 md:top-24 text-5xl md:text-7xl font-black text-blue-500/20 tracking-tighter leading-none z-0"
                animate={{ x: [2, -2, 2], opacity: [0, 0.5, 0] }}
                transition={{ duration: 0.2, repeat: Infinity, repeatDelay: 4 }}
              >
                FF
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 200, opacity: 1 }}
              transition={{ delay: 1, duration: 1.5, ease: "easeInOut" }}
              className="h-0.5 bg-gradient-to-r from-transparent via-amber-500 to-transparent mt-10 rounded-full"
            />
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="mt-6 flex flex-col items-center gap-2"
            >
              <p className="text-[10px] font-bold text-zinc-500 tracking-[0.5em] uppercase">
                Initializing System
              </p>
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1 h-1 bg-emerald-500 rounded-full"
                    animate={{ opacity: [0.2, 1, 0.2] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
            </motion.div>
          </div>
          
          {/* Bottom Branding */}
          <div className="absolute bottom-8 text-center w-full">
            <p className="text-[9px] text-zinc-700 font-mono uppercase tracking-widest">Secure • Fast • Premium</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
