"use client";

import { useEffect, useRef } from "react";

/**
 * Hook useWakeLock - Duy trì màn hình sáng liên tục khi đang xem phim trên điện thoại (iOS / Android)
 * Sử dụng Screen Wake Lock API chuẩn của trình duyệt (hỗ trợ Safari iOS 16.4+, Chrome, Samsung Internet, Edge...)
 * Tự động yêu cầu lại quyền giữ sáng khi người dùng chuyển tab và quay lại (visibilitychange),
 * và tự động giải phóng (release) khi Pause hoặc đóng Modal để tiết kiệm pin.
 */
export function useWakeLock(enabled: boolean = true) {
  const wakeLockRef = useRef<any>(null);
  const isEnabledRef = useRef(enabled);
  isEnabledRef.current = enabled;

  useEffect(() => {
    let isSubscribed = true;

    const requestLock = async () => {
      if (typeof window === "undefined" || !("wakeLock" in navigator)) {
        return;
      }

      if (!isEnabledRef.current) {
        return;
      }

      // Trình duyệt chỉ cho phép giữ sáng khi tab đang hiển thị (visible)
      if (document.visibilityState !== "visible") {
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
        });
      } catch (err) {
        // Trình duyệt có thể từ chối nếu pin quá yếu (Battery Saver) hoặc chưa có User Gesture
      }
    };

    const releaseLock = () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };

    if (enabled) {
      requestLock();
    } else {
      releaseLock();
    }

    // 🔄 Tự động xin lại Wake Lock khi người dùng chuyển tab / mở khóa màn hình quay lại
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isEnabledRef.current) {
        requestLock();
      }
    };

    // 👆 Đối với một số trình duyệt yêu cầu cử chỉ người dùng (User Gesture) trước khi cho giữ màn hình sáng
    const handleUserGesture = () => {
      if (isEnabledRef.current && !wakeLockRef.current) {
        requestLock();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("touchstart", handleUserGesture, { passive: true });
    window.addEventListener("click", handleUserGesture, { passive: true });

    return () => {
      isSubscribed = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("touchstart", handleUserGesture);
      window.removeEventListener("click", handleUserGesture);
      releaseLock();
    };
  }, [enabled]);
}
