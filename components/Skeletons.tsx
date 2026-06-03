export const HeroSkeleton = () => {
  return (
    <div className="w-full h-[56.25vw] max-h-[85vh] bg-zinc-950 animate-pulse relative">
      {/* Khung giả cho phần nội dung (Title, Button) */}
      <div className="absolute bottom-[20%] left-4 md:left-12 flex flex-col gap-4 w-[60%] md:w-[40%]">
        <div className="h-10 md:h-16 bg-zinc-900 rounded w-3/4"></div>
        <div className="h-4 md:h-6 bg-zinc-900 rounded w-full mt-2"></div>
        <div className="h-4 md:h-6 bg-zinc-900 rounded w-5/6 mb-4"></div>
        <div className="flex gap-3">
          <div className="w-24 md:w-32 h-10 md:h-12 bg-zinc-900 rounded"></div>
          <div className="w-32 md:w-40 h-10 md:h-12 bg-zinc-900 rounded"></div>
        </div>
      </div>
    </div>
  );
};

export const RowSkeleton = () => {
  return (
    <div className="pl-4 md:pl-12 py-4 mb-8">
      {/* Khung giả cho Tiêu đề hàng phim */}
      <div className="h-6 md:h-8 bg-zinc-900 rounded w-48 mb-4 animate-pulse"></div>
      {/* Khung giả cho các Poster */}
      <div className="flex gap-2 overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="w-[120px] sm:w-[140px] md:w-[180px] lg:w-[220px] aspect-[2/3] bg-zinc-900 rounded-md shrink-0 animate-pulse"
          ></div>
        ))}
      </div>
    </div>
  );
};