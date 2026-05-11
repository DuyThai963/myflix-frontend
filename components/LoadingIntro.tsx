"use client";
import { motion, AnimatePresence } from "framer-motion";

export default function LoadingIntro({ isLoading }: { isLoading: boolean }) {
  const doorTransition = {
    duration: 1.2,
    ease: [0.7, 0, 0.3, 1],
    delay: 0.2
  };

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          key="intro-container"
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black overflow-hidden"
          exit={{ opacity: 1 }}
        >
          <div className="absolute inset-0 flex w-full h-full z-10">
            
            {/* 1. Cánh cửa TRÁI + Chữ D (Tách xa ra trái) */}
            <motion.div
              className="relative w-1/2 h-full bg-[#050505] flex items-center justify-end overflow-hidden border-r border-zinc-900/40"
              initial={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={doorTransition}
            >
              <div className="relative translate-x-1/2 w-40 h-40 rounded-full border-[6px] border-red-600 shadow-[0_0_50px_rgba(220,38,38,0.4),inset_0_0_20px_rgba(220,38,38,0.4)] flex items-center justify-center">
                {/* Tách D ra trái mạnh tay hơn - 35px */}
                <span className="text-white text-7xl font-black italic tracking-tighter -translate-x-[32px] drop-shadow-[0_0_15px_rgba(255,255,255,0.6)]">
                  D
                </span>
              </div>
            </motion.div>

            {/* 2. Cánh cửa PHẢI + Chữ T (Tách xa ra phải) */}
            <motion.div
              className="relative w-1/2 h-full bg-[#050505] flex items-center justify-start overflow-hidden border-l border-zinc-900/40"
              initial={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={doorTransition}
            >
              <div className="relative -translate-x-1/2 w-40 h-40 rounded-full border-[6px] border-red-600 shadow-[0_0_50px_rgba(220,38,38,0.4),inset_0_0_20px_rgba(220,38,38,0.4)] flex items-center justify-center">
                {/* Tách T ra phải mạnh tay hơn - 35px */}
                <span className="text-white text-7xl font-black italic tracking-tighter translate-x-[20px] drop-shadow-[0_0_15px_rgba(255,255,255,0.6)]">
                  T
                </span>
              </div>
            </motion.div>
          </div>

          {/* Scanner Effect */}
          <motion.div 
            className="absolute top-1/2 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-red-600 to-transparent z-20"
            animate={{ top: ["35%", "65%", "35%"], opacity: [0, 0.4, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          />

          {/* Loading Bar */}
          <motion.div className="absolute bottom-16 z-30 flex flex-col items-center" exit={{ opacity: 0 }}>
            <p className="text-zinc-600 font-medium tracking-[0.6em] text-[9px] uppercase">System Loading</p>
            <div className="mt-3 w-40 h-[1px] bg-zinc-900 overflow-hidden relative">
              <motion.div className="absolute inset-0 bg-red-700" animate={{ x: ["-100%", "100%"] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}