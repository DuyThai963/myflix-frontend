"use client";

import { useEffect, useRef } from "react";

/**
 * Hook useWakeLock - Duy trì màn hình sáng liên tục khi xem phim trên thiết bị di động (iPad, iPhone, Android)
 * Kết hợp 3 cơ chế bảo vệ (Triple-Shield):
 * 1. Native Screen Wake Lock API (Safari iOS 16.4+, Chrome, iPadOS) kèm Heartbeat hồi phục tự động.
 * 2. Tự động phục hồi khi bị mất focus (do người dùng tương tác với iframe Embed của bên thứ 3).
 * 3. Dummy Looping Canvas Stream Video ẩn chạy ngầm trong DOM - bảo vệ tuyệt đối trên mọi phiên bản iOS/iPadOS.
 */
export function useWakeLock(enabled: boolean = true) {
  const wakeLockRef = useRef<any>(null);
  const isEnabledRef = useRef(enabled);
  isEnabledRef.current = enabled;

  const dummyVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let isSubscribed = true;

    // 🛡️ LỚP 1: NATIVE SCREEN WAKE LOCK API
    const requestLock = async () => {
      if (typeof window === "undefined" || !("wakeLock" in navigator)) {
        return;
      }

      if (!isEnabledRef.current || document.visibilityState !== "visible") {
        return;
      }

      try {
        if (wakeLockRef.current && !wakeLockRef.current.released) {
          return;
        }

        const lock = await (navigator as any).wakeLock.request("screen");
        if (!isSubscribed || !isEnabledRef.current) {
          lock.release().catch(() => {});
          return;
        }

        wakeLockRef.current = lock;

        lock.addEventListener("release", () => {
          if (wakeLockRef.current === lock) {
            wakeLockRef.current = null;
          }
          // 🔄 TỰ ĐỘNG TÁI KÍCH HOẠT: Nếu Safari nhả lock do user chạm vào iframe Embed,
          // tự động xin lại quyền ngay sau 1s để màn hình không bị tắt!
          if (isEnabledRef.current && document.visibilityState === "visible") {
            setTimeout(() => {
              if (isSubscribed && isEnabledRef.current && document.visibilityState === "visible") {
                requestLock();
              }
            }, 1000);
          }
        });
      } catch (err) {
        // Có thể bị reject nếu chưa có user gesture, sẽ được kích hoạt lại bởi listener chạm hoặc heartbeat
      }
    };

    const releaseLock = () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
      if (dummyVideoRef.current) {
        try {
          dummyVideoRef.current.pause();
          if (dummyVideoRef.current.parentNode) {
            dummyVideoRef.current.parentNode.removeChild(dummyVideoRef.current);
          }
        } catch (e) {}
        dummyVideoRef.current = null;
      }
    };

    // 🛡️ LỚP 2: DUMMY LOOPING MEDIA STREAM (VŨ KHÍ TỐI THƯỢNG CHO IOS & IPADOS KHI XEM EMBED)
    const initDummyVideo = () => {
      if (typeof document === "undefined" || dummyVideoRef.current) return;

      try {
        const canvas = document.createElement("canvas");
        canvas.width = 2;
        canvas.height = 2;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "rgba(0,0,0,0.01)";
          ctx.fillRect(0, 0, 2, 2);
        }

        if (typeof (canvas as any).captureStream === "function") {
          const stream = (canvas as any).captureStream(1); // 1 khung hình/giây (cực nhẹ, 0% CPU)
          const video = document.createElement("video");
          video.muted = true;
          video.playsInline = true;
          video.setAttribute("playsinline", "true");
          video.setAttribute("webkit-playsinline", "true");
          video.setAttribute("aria-hidden", "true");
          video.tabIndex = -1;
          video.srcObject = stream;
          video.style.position = "fixed";
          video.style.top = "-9999px";
          video.style.left = "-9999px";
          video.style.width = "1px";
          video.style.height = "1px";
          video.style.opacity = "0.001";
          video.style.pointerEvents = "none";
          video.style.zIndex = "-9999";

          document.body.appendChild(video);
          dummyVideoRef.current = video;

          if (isEnabledRef.current) {
            video.play().catch(() => {});
          }
        }
      } catch (e) {}
    };

    if (enabled) {
      requestLock();
      initDummyVideo();
    } else {
      releaseLock();
    }

    // 💓 NHỊP TIM ĐỊNH KỲ (HEARTBEAT): Cứ mỗi 8 giây kiểm tra 1 lần
    // Nếu Safari hoặc Android âm thầm giải phóng Wake Lock, lập tức kích hoạt lại!
    const heartbeatInterval = setInterval(() => {
      if (isEnabledRef.current && document.visibilityState === "visible") {
        if (!wakeLockRef.current || wakeLockRef.current.released) {
          requestLock();
        }
        if (dummyVideoRef.current && dummyVideoRef.current.paused) {
          dummyVideoRef.current.play().catch(() => {});
        }
      }
    }, 8000);

    // 🔄 Tự động xin lại khi người dùng quay lại tab từ ứng dụng khác
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isEnabledRef.current) {
        requestLock();
        if (dummyVideoRef.current && dummyVideoRef.current.paused) {
          dummyVideoRef.current.play().catch(() => {});
        }
      }
    };

    // 👆 Khi người dùng chạm màn hình hoặc bấm bất kỳ nút nào, tái kích hoạt ngay
    const handleUserInteraction = () => {
      if (isEnabledRef.current) {
        if (!wakeLockRef.current || wakeLockRef.current.released) {
          requestLock();
        }
        if (dummyVideoRef.current && dummyVideoRef.current.paused) {
          dummyVideoRef.current.play().catch(() => {});
        }
      }
    };

    // 📱 Khi trang cha bị mất focus do người dùng chạm vào iframe Embed Player:
    // Chờ 800ms để focus ổn định và kích hoạt lại Screen Wake Lock
    const handleWindowBlur = () => {
      if (isEnabledRef.current && document.visibilityState === "visible") {
        setTimeout(() => {
          if (isSubscribed && isEnabledRef.current && document.visibilityState === "visible") {
            requestLock();
          }
        }, 800);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleUserInteraction);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("pageshow", handleUserInteraction);
    window.addEventListener("touchstart", handleUserInteraction, { passive: true });
    window.addEventListener("touchend", handleUserInteraction, { passive: true });
    window.addEventListener("click", handleUserInteraction, { passive: true });
    window.addEventListener("keydown", handleUserInteraction, { passive: true });

    return () => {
      isSubscribed = false;
      clearInterval(heartbeatInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleUserInteraction);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("pageshow", handleUserInteraction);
      window.removeEventListener("touchstart", handleUserInteraction);
      window.removeEventListener("touchend", handleUserInteraction);
      window.removeEventListener("click", handleUserInteraction);
      window.removeEventListener("keydown", handleUserInteraction);
      releaseLock();
    };
  }, [enabled]);
}
