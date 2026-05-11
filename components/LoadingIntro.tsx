"use client";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

export default function LoadingIntro({ isLoading }: { isLoading: boolean }) {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          key="intro-container"
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black overflow-hidden"
        >
          {/* HỆ THỐNG CÁNH CỬA - Đóng vai trò là 'màn sáo' che toàn bộ web */}
          <div className="absolute inset-0 z-20 flex w-full h-full">
            {/* Cánh cửa bên trái + Nửa logo trái */}
            <motion.div
              className="relative w-1/2 h-full bg-black flex items-center justify-end overflow-hidden border-r border-white/5"
              exit={{ x: "-100%" }}
              transition={{ duration: 1, ease: [0.7, 0, 0.3, 1] }}
            >
              {/* Logo gắn chặt vào cánh cửa để khi cửa mở, logo bị xé làm đôi dạt sang */}
              <div className="absolute right-[-100px] w-[200px] h-[200px]">
                 <Image
                  src="/logo-DT.png"
                  alt=""
                  width={200}
                  height={200}
                  className="object-cover object-left"
                />
              </div>
            </motion.div>

            {/* Cánh cửa bên phải + Nửa logo phải */}
            <motion.div
              className="relative w-1/2 h-full bg-black flex items-center justify-start overflow-hidden border-l border-white/5"
              exit={{ x: "100%" }}
              transition={{ duration: 1, ease: [0.7, 0, 0.3, 1] }}
            >
              <div className="absolute left-[-100px] w-[200px] h-[200px]">
                <Image
                  src="/logo-DT.png"
                  alt=""
                  width={200}
                  height={200}
                  className="object-cover object-right"
                />
              </div>
            </motion.div>
          </div>

          {/* HIỆU ỨNG CHỮ KHI ĐANG ĐỢI SERVER RENDER TỈNH GIẤC */}
          <motion.div
            className="absolute bottom-12 z-30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
             <p className="text-red-600 font-bold tracking-[0.4em] text-[10px] uppercase animate-pulse">
              DT MyFlix Starting...
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}