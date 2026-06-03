"use client";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function LoadingIntro({ isLoading }: { isLoading: boolean }) {
  const [isCompletelyHidden, setIsCompletelyHidden] = useState(false);

  useEffect(() => {
    setIsCompletelyHidden(false);
    if (!isLoading) {
      const timer = setTimeout(() => {
        setIsCompletelyHidden(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  // Nếu đã xong nhiệm vụ thì trả về null (Không render gì cả)
  if (isCompletelyHidden) return null;

  const doorTransition = { duration: 1.5, ease: [0.7, 0, 0.3, 1], delay: 0.5 };

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-transparent overflow-hidden pointer-events-none"
      // Thay vì dùng exit, ta dùng thẳng animate để fade out khi isLoading = false
      animate={{ opacity: isLoading ? 1 : 0 }}
      transition={{ duration: 0.5, delay: 1.5 }}
    >
      <div className="absolute inset-0 flex w-full h-full z-10 pointer-events-none">
        
        {/* Cánh cửa TRÁI */}
        <motion.div
          className="relative w-1/2 h-full bg-[#050505] flex items-center justify-end overflow-hidden border-r border-zinc-900/40"
          initial={{ x: 0 }}
          animate={{ x: isLoading ? 0 : "-100%" }} // isLoading=false -> tự động trượt ra ngoài
          transition={doorTransition}
        >
          <div className="relative translate-x-1/2 w-40 h-40 rounded-full border-[6px] border-red-600 shadow-[0_0_50px_rgba(220,38,38,0.4),inset_0_0_20px_rgba(220,38,38,0.4)] flex items-center justify-center">
            <span className="text-white text-7xl font-black italic tracking-tighter -translate-x-[32px] drop-shadow-[0_0_15px_rgba(255,255,255,0.6)]">D</span>
          </div>
        </motion.div>

        {/* Cánh cửa PHẢI */}
        <motion.div
          className="relative w-1/2 h-full bg-[#050505] flex items-center justify-start overflow-hidden border-l border-zinc-900/40"
          initial={{ x: 0 }}
          animate={{ x: isLoading ? 0 : "100%" }} // isLoading=false -> tự động trượt ra ngoài
          transition={doorTransition}
        >
          <div className="relative -translate-x-1/2 w-40 h-40 rounded-full border-[6px] border-red-600 shadow-[0_0_50px_rgba(220,38,38,0.4),inset_0_0_20px_rgba(220,38,38,0.4)] flex items-center justify-center">
            <span className="text-white text-7xl font-black italic tracking-tighter translate-x-[20px] drop-shadow-[0_0_15px_rgba(255,255,255,0.6)]">T</span>
          </div>
        </motion.div>
      </div>

      {/* Hiệu ứng quét ngang (ẩn ngay lập tức khi hết loading) */}
      <motion.div 
        className="absolute top-1/2 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-red-600 to-transparent z-20 pointer-events-none"
        animate={{ 
          top: ["35%", "65%", "35%"], 
          opacity: isLoading ? [0, 0.4, 0] : 0 // Tắt laze khi cửa mở
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      />

      {/* Loading Bar (ẩn ngay lập tức khi hết loading) */}
      <motion.div 
        className="absolute bottom-16 z-30 flex flex-col items-center pointer-events-none" 
        animate={{ opacity: isLoading ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      >
        <p className="text-zinc-600 font-medium tracking-[0.6em] text-[9px] uppercase">System Loading</p>
        <div className="mt-3 w-40 h-[1px] bg-zinc-900 overflow-hidden relative">
          <motion.div className="absolute inset-0 bg-red-700" animate={{ x: ["-100%", "100%"] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }} />
        </div>
      </motion.div>
    </motion.div>
  );
}