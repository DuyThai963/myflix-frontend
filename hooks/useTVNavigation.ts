"use client";

import { useEffect } from "react";

/**
 * Hook useTVNavigation
 * Điều hướng không gian (Spatial Navigation) chuyên dụng cho Remote Android TV, Smart TV và Máy chiếu.
 * 
 * Tính năng:
 * 1. Nhận diện phím điều hướng D-Pad (ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Enter, Back).
 * 2. Thuật toán đo khoảng cách hình học 2D (Euclidean Spatial Matching):
 *    Tự động tìm kiếm phần tử tương tác gần nhất theo hướng bấm (thẻ phim, hàng phim, tập phim, nút bấm).
 * 3. Tự động cuộn mượt (smooth scrollIntoView) đưa phần tử được focus vào giữa màn hình.
 * 4. Bẫy phạm vi thông minh (Scope Trap):
 *    Khi Modal phim đang mở, giới hạn điều hướng 100% bên trong Modal.
 * 5. Bắt phím Back của Remote TV (KeyCode 4, 10009, 461, 27) để đóng Modal hoặc lùi trang.
 * 6. Giữ nguyên vẹn 100% trải nghiệm chuột PC và cảm ứng điện thoại.
 */
export function useTVNavigation() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const getFocusableCandidates = (scope: HTMLElement | Document = document): HTMLElement[] => {
      const selector = [
        '[data-tv-card="true"]',
        '[data-episode-btn="true"]',
        '[data-tv-player="true"]',
        '[data-tv-embed="true"]',
        'button:not([disabled]):not([tabindex="-1"])',
        'a[href]:not([tabindex="-1"])',
        'input:not([disabled])'
      ].join(", ");

      const elements = Array.from(scope.querySelectorAll<HTMLElement>(selector));
      return elements.filter((el) => {
        // ⚡ Tối ưu siêu tốc: Không dùng getComputedStyle (tránh Forced Reflow gây giật lag trên TV/máy chiếu)
        if (el.offsetParent === null && el.style.position !== "fixed") return false;
        return el.offsetWidth > 0 && el.offsetHeight > 0;
      });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;

      // Không can thiệp nếu người dùng đang nhập văn bản trong ô tìm kiếm
      if (
        activeEl?.tagName === "INPUT" ||
        activeEl?.tagName === "TEXTAREA" ||
        activeEl?.isContentEditable
      ) {
        if (e.key === "Escape" || e.keyCode === 27 || e.keyCode === 4) {
          activeEl.blur();
          e.preventDefault();
        }
        return;
      }

      // Khi đang xem Video ở chế độ Fullscreen: Bàn giao 100% phím mũi tên cho Player để tua phim và chỉnh âm lượng
      if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
        return;
      }

      // Xử lý phím BACK của Remote TV
      const isBackKey =
        e.key === "Escape" ||
        e.keyCode === 27 ||
        e.keyCode === 4 ||
        e.keyCode === 10009 ||
        e.keyCode === 461;

      // Kiểm tra xem có Modal phim hoặc Overlay đang mở không
      const activeModal = document.querySelector<HTMLElement>('[data-tv-modal="true"], .fixed.inset-0.z-50, .fixed.inset-0.z-\\[50\\]');

      if (isBackKey) {
        if (activeModal) {
          // Nếu Modal đang mở -> Tìm nút đóng hoặc gọi sự kiện đóng
          const closeBtn = activeModal.querySelector<HTMLElement>('button[data-modal-close="true"], button[title="Đóng"]');
          if (closeBtn) {
            closeBtn.click();
            e.preventDefault();
            e.stopPropagation();
            return;
          }
        }
      }

      // 🎮 Xử lý phím OK / CENTER của Remote TV (KeyCode 13: Enter, KeyCode 23: DPAD_CENTER)
      const isOkKey =
        e.key === "Enter" ||
        e.keyCode === 13 ||
        e.keyCode === 23 ||
        e.key === "Select" ||
        e.key === "Ok";

      if (isOkKey && activeEl && activeEl !== document.body) {
        if (
          activeEl.tagName === "BUTTON" ||
          activeEl.tagName === "A" ||
          activeEl.getAttribute("role") === "button"
        ) {
          activeEl.click();
          e.preventDefault();
          return;
        }
      }

      const isDirectional = [
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight"
      ].includes(e.key);

      if (!isDirectional) return;

      const currentScope = activeModal || document.body;
      const candidates = getFocusableCandidates(currentScope);
      if (candidates.length === 0) return;

      // Nếu chưa có phần tử nào được focus (hoặc đang focus vào body)
      if (!activeEl || activeEl === document.body || !currentScope.contains(activeEl)) {
        const firstCandidate = candidates.find((c) => {
          const r = c.getBoundingClientRect();
          return r.top >= 0 && r.top <= window.innerHeight;
        }) || candidates[0];

        if (firstCandidate) {
          firstCandidate.focus();
          try {
            firstCandidate.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
          } catch {}
          e.preventDefault();
        }
        return;
      }

      const currentRect = activeEl.getBoundingClientRect();
      const currentCenterX = currentRect.left + currentRect.width / 2;
      const currentCenterY = currentRect.top + currentRect.height / 2;

      let bestCandidate: HTMLElement | null = null;
      let minDistance = Infinity;

      for (const candidate of candidates) {
        if (candidate === activeEl) continue;

        const rect = candidate.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const dx = centerX - currentCenterX;
        const dy = centerY - currentCenterY;

        let isValidDirection = false;
        let primaryDist = 0;
        let secondaryDist = 0;

        switch (e.key) {
          case "ArrowRight":
            // Phải nằm bên phải (tính từ mép trái đối tượng tới mép phải hiện tại)
            if (rect.left >= currentRect.left + 5) {
              isValidDirection = true;
              primaryDist = Math.max(0, rect.left - currentRect.right);
              secondaryDist = Math.abs(dy);
            }
            break;
          case "ArrowLeft":
            // Phải nằm bên trái
            if (rect.right <= currentRect.right - 5) {
              isValidDirection = true;
              primaryDist = Math.max(0, currentRect.left - rect.right);
              secondaryDist = Math.abs(dy);
            }
            break;
          case "ArrowDown":
            // Phải nằm bên dưới
            if (rect.top >= currentRect.top + 5) {
              isValidDirection = true;
              primaryDist = Math.max(0, rect.top - currentRect.bottom);
              secondaryDist = Math.abs(dx);
            }
            break;
          case "ArrowUp":
            // Phải nằm bên trên
            if (rect.bottom <= currentRect.bottom - 5) {
              isValidDirection = true;
              primaryDist = Math.max(0, currentRect.top - rect.bottom);
              secondaryDist = Math.abs(dx);
            }
            break;
        }

        if (isValidDirection) {
          // Tính điểm khoảng cách trọng số: ưu tiên phương chính, phạt lệch góc vuông
          const distance = primaryDist + secondaryDist * 2.2;
          if (distance < minDistance) {
            minDistance = distance;
            bestCandidate = candidate;
          }
        }
      }

      if (bestCandidate) {
        bestCandidate.focus();
        try {
          bestCandidate.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "center"
          });
        } catch {
          bestCandidate.scrollIntoView();
        }
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);
}
