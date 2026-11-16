import { useState, useEffect, useRef, useCallback } from "react";
import { Movie } from "@/types/movie";
import { movieService } from "@/services/movie.service";

interface UsePrefetchPaginationProps {
  categorySlug: string;
  currentServerId: string;
}

export function usePrefetchPagination({ categorySlug, currentServerId }: UsePrefetchPaginationProps) {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Buffer lưu trữ phim trang tiếp theo đã tải trước
  const prefetchedDataRef = useRef<{ page: number; data: Movie[] } | null>(null);
  const isPrefetchingRef = useRef(false);
  const activeFetchPromiseRef = useRef<Promise<Movie[]> | null>(null);

  // Sentinel element ref để theo dõi cuộn gần tới cuối
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // 1. Tải trang đầu tiên khi khởi tạo hoặc khi đổi Server / Đổi thể loại
  useEffect(() => {
    let isCurrent = true;
    setPage(1);
    setHasMore(true);
    setLoading(true);
    prefetchedDataRef.current = null;
    isPrefetchingRef.current = false;
    activeFetchPromiseRef.current = null;

    const loadInitialPage = async () => {
      try {
        const data = await movieService.getMoviesByCategory(categorySlug, 1, currentServerId);
        if (!isCurrent) return;

        if (data && data.length > 0) {
          setMovies(data);
          if (data.length < 10) {
            setHasMore(false);
          }
        } else {
          setMovies([]);
          setHasMore(false);
        }
      } catch (err) {
        console.error("Lỗi khi tải trang đầu:", err);
        if (isCurrent) setHasMore(false);
      } finally {
        if (isCurrent) setLoading(false);
      }
    };

    loadInitialPage();

    return () => {
      isCurrent = false;
    };
  }, [categorySlug, currentServerId]);

  // 2. Hàm âm thầm tải trước (Pre-fetch) trang tiếp theo vào bộ đệm RAM
  const prefetchNextPage = useCallback(async (nextPage: number) => {
    if (
      isPrefetchingRef.current ||
      !hasMore ||
      loading ||
      (prefetchedDataRef.current && prefetchedDataRef.current.page === nextPage)
    ) {
      return;
    }

    isPrefetchingRef.current = true;
    const fetchPromise = movieService.getMoviesByCategory(categorySlug, nextPage, currentServerId);
    activeFetchPromiseRef.current = fetchPromise;

    try {
      const data = await fetchPromise;
      if (data && data.length > 0) {
        prefetchedDataRef.current = { page: nextPage, data };
        if (data.length < 10) {
          // Trang kế tiếp trả về ít hơn 10 thì trang đó sẽ là trang cuối
        }
      } else {
        // Không còn dữ liệu ở trang kế
        setHasMore(false);
        prefetchedDataRef.current = { page: nextPage, data: [] };
      }
    } catch (err) {
      console.error("Lỗi âm thầm pre-fetch trang kế tiếp:", err);
    } finally {
      isPrefetchingRef.current = false;
      activeFetchPromiseRef.current = null;
    }
  }, [categorySlug, currentServerId, hasMore, loading]);

  // 3. Tự động kích hoạt Pre-fetch khi người dùng cuộn gần tới khu vực nút "Xem thêm"
  useEffect(() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) return;
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMore && !loading) {
          const nextPage = page + 1;
          prefetchNextPage(nextPage);
        }
      },
      {
        root: null,
        rootMargin: "450px 0px", // Kích hoạt sớm khi cuộn cách nút ~450px
        threshold: 0.01,
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [page, hasMore, loading, prefetchNextPage]);

  // 4. Khi người dùng click "Xem thêm" (hoặc bấm nút OK trên Remote TV):
  // - Nếu đã pre-fetch xong: Bung ra NGAY LẬP TỨC 0ms không cần chờ mạng!
  // - Nếu đang tải dở: Đợi promise hoàn thành rồi bung.
  // - Nếu chưa tải: Fetch bình thường.
  const handleLoadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    const nextPage = page + 1;

    // Trường hợp 1: Dữ liệu trang tiếp theo đã nằm sẵn trong bộ nhớ đệm RAM (Instant 0ms)
    if (prefetchedDataRef.current && prefetchedDataRef.current.page === nextPage) {
      const nextBatch = prefetchedDataRef.current.data;
      prefetchedDataRef.current = null; // Xóa đệm để chuẩn bị cho trang sau

      if (nextBatch.length > 0) {
        setMovies((prev) => [...prev, ...nextBatch]);
        setPage(nextPage);
        if (nextBatch.length < 10) {
          setHasMore(false);
        }
      } else {
        setHasMore(false);
      }
      return;
    }

    // Trường hợp 2: Dữ liệu đang được tải ngầm dở dang, đợi xong là hiển thị
    if (activeFetchPromiseRef.current) {
      setLoading(true);
      try {
        const data = await activeFetchPromiseRef.current;
        prefetchedDataRef.current = null;
        if (data && data.length > 0) {
          setMovies((prev) => [...prev, ...data]);
          setPage(nextPage);
          if (data.length < 10) setHasMore(false);
        } else {
          setHasMore(false);
        }
      } catch (err) {
        console.error("Lỗi khi load thêm:", err);
      } finally {
        setLoading(false);
      }
      return;
    }

    // Trường hợp 3: Chưa kịp tải trước (ví dụ người dùng bấm quá nhanh)
    setLoading(true);
    try {
      const data = await movieService.getMoviesByCategory(categorySlug, nextPage, currentServerId);
      if (data && data.length > 0) {
        setMovies((prev) => [...prev, ...data]);
        setPage(nextPage);
        if (data.length < 10) setHasMore(false);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("Lỗi khi load thêm:", err);
    } finally {
      setLoading(false);
    }
  }, [page, loading, hasMore, categorySlug, currentServerId]);

  return {
    movies,
    page,
    loading,
    hasMore,
    handleLoadMore,
    sentinelRef,
  };
}
