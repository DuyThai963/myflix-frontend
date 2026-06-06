"use client";

import { useVideoPlayerLogic } from "@/hooks/useVideoPlayerLogic";

type Props = {
  src: string;
  movieId: string | number;
  movieTitle?: string;
  isSeries?: boolean;
  onNext?: () => void;
  onProgress?: (currentTime: number) => void;
  onFullscreenChange?: (isFullscreen: boolean) => void;
  initialTime?: number;
  movieData?: any;
  isWatchParty?: boolean;
};

export default function VideoPlayer(props: Props) {
  const { isSeries, onNext, movieId } = props;

  const {
    videoRef, playerContainerRef, timelineRef,
    loading, isPlaying, isMuted, isFullscreen,
    showControls, setShowControls, showNextButton, setShowNextButton, showSkipIntroButton, setShowSkipIntroButton,
    currentTime, setCurrentTime, duration, setDuration, isDragging, setIsDragging,
    showLeftRipple, setShowLeftRipple, showRightRipple, setShowRightRipple,
    clickTimeoutRef, leftRippleTimeoutRef, rightRippleTimeoutRef,
    handleUserInteraction, togglePlay, toggleMute, skipTime, handleSkipIntro, toggleFullscreen, handleTimelineUpdate, saveWatchingProgress
  } = useVideoPlayerLogic({
    src: props.src,
    movieId: props.movieId,
    movieTitle: props.movieTitle || "Phim MyFlix",
    isSeries: props.isSeries || false,
    onNext: props.onNext,
    onProgress: props.onProgress,
    onFullscreenChange: props.onFullscreenChange,
    initialTime: props.initialTime || 0,
    movieData: props.movieData,
    isWatchParty: props.isWatchParty || false
  });

  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds)) return "00:00";
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    const paddedMinutes = String(minutes).padStart(2, "0");
    const paddedSeconds = String(seconds).padStart(2, "0");
    if (hours > 0) return `${hours}:${paddedMinutes}:${paddedSeconds}`;
    return `${paddedMinutes}:${paddedSeconds}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleVideoClickWrapper = (e: React.MouseEvent) => {
    if (e.detail === 1) {
      clickTimeoutRef.current = setTimeout(() => { togglePlay(); }, 250);
    } else if (e.detail === 2) {
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
      if (!videoRef.current) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      handleUserInteraction();

      if (clickX > rect.width / 2) {
        videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 10);
        setShowRightRipple(true);
        if (rightRippleTimeoutRef.current) clearTimeout(rightRippleTimeoutRef.current);
        rightRippleTimeoutRef.current = setTimeout(() => setShowRightRipple(false), 500);
      } else {
        videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
        setShowLeftRipple(true);
        if (leftRippleTimeoutRef.current) clearTimeout(leftRippleTimeoutRef.current);
        leftRippleTimeoutRef.current = setTimeout(() => setShowLeftRipple(false), 500);
      }
    }
  };

  return (
    <div 
      ref={playerContainerRef}
      onMouseMove={handleUserInteraction}
      onMouseLeave={() => !isDragging && isPlaying && setShowControls(false)}
      onTouchEnd={() => { setIsDragging(false); if (isPlaying) handleUserInteraction(); }}
      className="relative w-full h-full bg-black overflow-hidden group flex items-center justify-center select-none font-sans cursor-default"
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/60 pointer-events-none">
          <div className="w-14 h-14 border-4 border-zinc-700 border-t-red-600 rounded-full animate-spin" />
        </div>
      )}

      <div onClick={handleVideoClickWrapper} className="relative w-full h-full flex items-center justify-center cursor-pointer">
        <video
          ref={videoRef}
          key={props.src}
          controls={false} autoPlay playsInline={true} webkit-playsinline="true"
          style={{ aspectRatio: videoRef.current ? `${videoRef.current.videoWidth} / ${videoRef.current.videoHeight}` : "auto", objectFit: "contain" }}
          onTimeUpdate={(e) => {
            const video = e.target as HTMLVideoElement;
            const current = video.currentTime;
            const dur = video.duration;
            setCurrentTime(current);
            if (props.onProgress) props.onProgress(current);
            setShowSkipIntroButton(current >= 3 && current < 45);

            if (isSeries && dur > 0) {
              const timeLeft = dur - current;
              let skipTime = dur > 3000 ? 210 : dur > 1800 ? 165 : 135;
              setShowNextButton(timeLeft <= skipTime && timeLeft > 2);
            }
          }}
          onEnded={() => {
            // 🎯 KHÚC SỬA SẠCH RÁC THEO Ý THÁI: Gọi hàm reset tiến trình tập này về 0 giây trong mảng lịch sử tổng
            saveWatchingProgress(0, true);
            if (isSeries && onNext) onNext();
          }}
        />

        <div className={`absolute top-0 left-0 w-1/2 h-full bg-white/5 flex flex-col items-center justify-center pointer-events-none rounded-r-[40%] transition-all duration-500 ease-out z-10 ${showLeftRipple ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}>
          <div className="bg-black/40 p-4 rounded-full flex flex-col items-center justify-center gap-1 min-w-[70px] aspect-square">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white animate-pulse"><path d="M11 17l-5-5 5-5v10zm6 0l-5-5 5-5v10z" /></svg>
            <span className="text-white font-extrabold text-[11px] tracking-wide">-10s</span>
          </div>
        </div>

        <div className={`absolute top-0 right-0 w-1/2 h-full bg-white/5 flex flex-col items-center justify-center pointer-events-none rounded-l-[40%] transition-all duration-500 ease-out z-10 ${showRightRipple ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}>
          <div className="bg-black/40 p-4 rounded-full flex flex-col items-center justify-center gap-1 min-w-[70px] aspect-square">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white animate-pulse"><path d="M13 7l5 5-5 5V7zm-6 0l5 5-5 5V7z" /></svg>
            <span className="text-white font-extrabold text-[11px] tracking-wide">+10s</span>
          </div>
        </div>
      </div>

      <div 
        onClick={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()} style={{ transform: "translateZ(999px)" }}
        className={`absolute inset-0 bg-gradient-to-t from-black/95 via-transparent to-black/40 z-40 flex flex-col justify-between p-6 transition-opacity duration-300 pointer-events-none ${showControls ? "opacity-100 animate-in fade-in duration-200" : "opacity-0"}`}
      >
        <div className="flex items-center justify-between w-full relative z-50">
          {isFullscreen ? (
            <button onClick={(e) => { e.stopPropagation(); toggleFullscreen(e); }} className="hidden pointer-fine:flex text-white/80 hover:text-white items-center gap-2 font-medium text-base transition duration-200 cursor-pointer pointer-events-auto">
              ✕ Thoát xem phim
            </button>
          ) : <div />}
          <div />
        </div>

        <div onClick={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()} className="w-full space-y-4 pointer-events-auto cursor-default relative z-50">
          <div className="flex items-center gap-3 w-full group/timeline">
            <span className="text-zinc-400 text-xs font-medium tabular-nums min-w-[40px]">{formatTime(currentTime)}</span>
            
            <div 
              ref={timelineRef}
              onClick={(e) => handleTimelineUpdate(e.clientX, e.clientY)}
              onMouseDown={() => setIsDragging(true)} onMouseUp={() => setIsDragging(false)}
              onTouchStart={() => setIsDragging(true)} onTouchEnd={() => setIsDragging(false)}
              onTouchMove={(e) => { if (e.touches.length > 0) handleTimelineUpdate(e.touches[0].clientX, e.touches[0].clientY); }}
              className="relative flex-1 h-1.5 bg-zinc-600/60 rounded-full cursor-pointer hover:h-2 transition-all duration-150 flex items-center"
            >
              <div className="h-full bg-red-600 rounded-full relative flex items-center justify-end" style={{ width: `${progressPercent}%` }}>
                <div className="absolute right-[-6px] w-4 h-4 bg-red-600 border border-white rounded-full scale-100 shadow-lg" />
              </div>
            </div>

            <span className="text-zinc-400 text-xs font-medium tabular-nums min-w-[40px] text-right">{formatTime(duration)}</span>
          </div>

          <div className="flex items-center justify-between w-full relative">
            <div className="flex items-center gap-6">
              <button onClick={togglePlay} className="text-white hover:text-red-500 transition transform active:scale-90 cursor-pointer">
                {isPlaying ? (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1-.75-.75V5.25Z" clipRule="evenodd" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" /></svg>
                )}
              </button>

              <button onClick={(e) => skipTime(e, -10)} className="text-zinc-300 hover:text-white transition relative flex items-center justify-center w-7 h-7 active:scale-90 cursor-pointer">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                <span className="absolute text-[9px] font-extrabold tracking-tighter select-none pt-0.5">10</span>
              </button>

              <button onClick={(e) => skipTime(e, 10)} className="text-zinc-300 hover:text-white transition relative flex items-center justify-center w-7 h-7 active:scale-90 cursor-pointer">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full"><path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /></svg>
                <span className="absolute text-[9px] font-extrabold tracking-tighter select-none pt-0.5">10</span>
              </button>

              <button onClick={toggleMute} className="text-zinc-300 hover:text-white transition active:scale-90 pl-1 cursor-pointer">
                {isMuted ? (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.063.922-2.063 2.063v4.874c0 1.141.922 2.063 2.063 2.063h1.932l4.5 4.5c.944.945 2.56.276 2.56-1.06V4.06ZM17.78 9.22a.75.75 0 1 0-1.06 1.06L18.44 12l-1.72 1.72a.75.75 0 0 0 1.06 1.06l1.72-1.72 1.72 1.72a.75.75 0 1 0 1.06-1.06L20.56 12l1.72-1.72a.75.75 0 0 0-1.06-1.06l-1.72 1.72-1.72-1.72Z" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.063.922-2.063 2.063v4.874c0 1.141.922 2.063 2.063 2.063h1.932l4.5 4.5c.944.945 2.56.276 2.56-1.06V4.06Zm4.44 5.642a.75.75 0 0 1 1.06-.043 7.5 7.5 0 0 1 0 10.683.75.75 0 0 1-1.06-1.061 6 6 0 0 0 0-8.519.75.75 0 0 1 .043-1.06ZM15.3 11.47a.75.75 0 0 1 1.06-.043 4 4 0 0 1 0 5.706.75.75 0 0 1-1.06-1.06 2.5 2.5 0 0 0 0-3.585.75.75 0 0 1 .043-1.061Z" /></svg>
                )}
              </button>
            </div>
            
            <div className="flex items-center gap-5 relative z-50">
              <button onClick={(e) => toggleFullscreen(e)} className="text-zinc-300 hover:text-white transition active:scale-90 cursor-pointer p-1 pointer-events-auto">
                {isFullscreen ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M4 14h6v6M20 10h-6V4M14 10l6-6M10 14l-6 6" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" /></svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showSkipIntroButton && (
        <div className="absolute bottom-24 right-8 z-50 animate-in fade-in slide-in-from-right-5 duration-300 pointer-events-auto">
          <button onClick={handleSkipIntro} className="group flex items-center gap-3 bg-zinc-900/95 hover:bg-zinc-800 border border-zinc-700 px-5 py-2.5 rounded shadow-2xl transition-all active:scale-95 cursor-pointer">
            <div><p className="text-white text-xs font-bold">Bỏ qua giới thiệu</p></div>
            <div className="bg-white text-black p-1.5 rounded-sm group-hover:bg-red-600 group-hover:text-white transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5v14l8-7-8-7zm8 0v14l8-7-8-7z" /></svg>
            </div>
          </button>
        </div>
      )}

      {showNextButton && onNext && !showSkipIntroButton && (
        <div className="absolute bottom-24 right-8 z-50 animate-in fade-in slide-in-from-right-5 duration-300 pointer-events-auto">
          <button onClick={(e) => { e.stopPropagation(); onNext(); }} className="group flex items-center gap-3 bg-zinc-900/95 hover:bg-zinc-800 border border-zinc-700 px-5 py-2.5 rounded shadow-2xl transition-all active:scale-95 cursor-pointer">
            <div><p className="text-white text-xs font-bold">Tập kế tiếp</p></div>
            <div className="bg-white text-black p-1.5 rounded-sm group-hover:bg-red-600 group-hover:text-white transition-colors">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M6 18L14.5 12L6 6V18ZM16 6V18H18V6H16Z" /></svg>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}