"use client";

import { useEffect } from "react";

/**
 * Singleton Wake Lock Manager
 * Giữ màn hình luôn sáng trên iOS (iPhone, iPad), Android và PC khi xem phim.
 * 
 * Cơ chế hoạt động:
 * 1. Native Screen Wake Lock API (navigator.wakeLock): Dành cho Chrome, Edge, Safari (khi không bật Tiết kiệm pin).
 * 2. Web Audio Inaudible Session (AudioContext): Dành riêng cho iOS Safari khi bật Tiết kiệm pin (Low Power Mode).
 *    CoreAudio của iOS phát hiện một AudioContext đang phát luồng âm thanh ở tần số 20Hz (gain 0.00001 - hoàn toàn im lặng),
 *    xác nhận tab đang trong phiên Media Playback hoạt động thực tế, từ đó hệ điều hành KHÔNG kích hoạt bộ hẹn giờ tắt màn hình (Auto-Lock).
 * 3. Bắt sự kiện Blur khi chạm vào Embed Iframe: Khi người dùng bấm Play/Pause/Fullscreen bên trong iframe,
 *    cửa sổ chính nhận sự kiện `blur`, tự động kích hoạt duy trì phiên giữ màn hình.
 * 4. Quản lý Singleton an toàn: Đếm tham chiếu (Reference counting), chia sẻ 1 phiên duy nhất, tự dọn sạch khi đóng phim.
 */

let activeSubscribers = 0;
let wakeLockSentinel: any = null;
let audioCtx: AudioContext | null = null;
let oscillator: OscillatorNode | null = null;
let gainNode: GainNode | null = null;

const ensureOscillator = (ctx: AudioContext) => {
  if (oscillator) return;
  try {
    oscillator = ctx.createOscillator();
    gainNode = ctx.createGain();

    // Tần số 20Hz (hạ âm dưới ngưỡng nghe của con người) với mức gain cực nhỏ 0.00001 (hoàn toàn im lặng)
    oscillator.frequency.setValueAtTime(20, ctx.currentTime);
    gainNode.gain.setValueAtTime(0.00001, ctx.currentTime);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.start();
  } catch (e) {
    // Silent catch
  }
};

const startAudioSession = () => {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx || audioCtx.state === "closed") {
      audioCtx = new AudioContextClass();
    }

    ensureOscillator(audioCtx);

    if (audioCtx.state === "suspended") {
      audioCtx.resume().then(() => {
        if (audioCtx) ensureOscillator(audioCtx);
      }).catch(() => {});
    }
  } catch (e) {
    // Không chặn luồng nếu môi trường không cho phép AudioContext
  }
};

const stopAudioSession = () => {
  try {
    if (oscillator) {
      oscillator.stop();
      oscillator.disconnect();
      oscillator = null;
    }
    if (gainNode) {
      gainNode.disconnect();
      gainNode = null;
    }
    if (audioCtx && audioCtx.state !== "closed") {
      audioCtx.suspend().catch(() => {});
    }
  } catch (e) {
    // Silent catch
  }
};

const requestNativeWakeLock = async () => {
  if (typeof window === "undefined" || !("wakeLock" in navigator)) return;
  if (document.visibilityState !== "visible") return;

  try {
    if (wakeLockSentinel && !wakeLockSentinel.released) return;
    const lock = await (navigator as any).wakeLock.request("screen");
    wakeLockSentinel = lock;
    lock.addEventListener("release", () => {
      if (wakeLockSentinel === lock) wakeLockSentinel = null;
    });
  } catch (e) {
    // Bị chặn khi iOS bật Chế độ tiết kiệm pin -> Đã có Web Audio Session làm nhiệm vụ giữ màn hình
  }
};

const releaseNativeWakeLock = () => {
  if (wakeLockSentinel) {
    wakeLockSentinel.release().catch(() => {});
    wakeLockSentinel = null;
  }
};

const activate = () => {
  requestNativeWakeLock();
  startAudioSession();
};

const deactivate = () => {
  releaseNativeWakeLock();
  stopAudioSession();
};

if (typeof window !== "undefined") {
  const onUserInteraction = () => {
    if (activeSubscribers > 0) {
      activate();
    }
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === "visible" && activeSubscribers > 0) {
      activate();
    } else if (document.visibilityState !== "visible") {
      deactivate();
    }
  };

  window.addEventListener("touchstart", onUserInteraction, { passive: true });
  window.addEventListener("touchend", onUserInteraction, { passive: true });
  window.addEventListener("click", onUserInteraction, { passive: true });
  window.addEventListener("focus", onUserInteraction);
  window.addEventListener("blur", () => {
    // Khi user chạm vào Iframe Embed để tương tác (Play/Pause/Fullscreen)
    // Cửa sổ cha bị blur, lập tức kích hoạt duy trì trạng thái sáng màn hình
    if (activeSubscribers > 0) {
      activate();
    }
  });
  document.addEventListener("visibilitychange", onVisibilityChange);
}

export function useWakeLock(enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    activeSubscribers++;
    if (activeSubscribers === 1) {
      activate();
    }

    return () => {
      activeSubscribers = Math.max(0, activeSubscribers - 1);
      if (activeSubscribers === 0) {
        deactivate();
      }
    };
  }, [enabled]);
}
