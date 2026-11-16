import { NextRequest, NextResponse } from "next/server";
import { getParserById } from "@/services/movieAdapters";

export const dynamic = "force-dynamic";

// ⚡ BỘ ĐỆM RAM IN-MEMORY CACHE (Server-side): Phản hồi dưới 1ms cho chi tiết phim
const movieDetailCache = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 phút

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");
    const serverId = searchParams.get("server") || "server_1";

    if (!slug) {
      return NextResponse.json({ error: "Missing movie slug" }, { status: 400 });
    }

    const cacheKey = `${serverId}_${slug}`;
    const now = Date.now();
    const cached = movieDetailCache.get(cacheKey);

    if (cached && cached.expiry > now) {
      return NextResponse.json(cached.data, {
        headers: {
          "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800",
          "X-Cache": "HIT"
        }
      });
    }

    const parser = getParserById(serverId);
    const targetUrl = parser.getDetailUrl(slug);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json"
      },
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json({ 
        error: `Server ${parser.name} returned status ${res.status}` 
      }, { status: res.status });
    }

    const rawJson = await res.json();
    const parsedData = parser.parse(rawJson);

    if (!parsedData || (!parsedData.name && !parsedData.title)) {
      return NextResponse.json({ error: `Cannot parse movie detail from ${parser.name}` }, { status: 404 });
    }

    const payload = {
      status: true,
      server: {
        id: parser.id,
        name: parser.name,
        type: parser.type
      },
      data: parsedData
    };

    // Lưu vào RAM cache
    movieDetailCache.set(cacheKey, { data: payload, expiry: now + CACHE_TTL_MS });

    if (movieDetailCache.size > 500) {
      const firstKey = movieDetailCache.keys().next().value;
      if (firstKey) movieDetailCache.delete(firstKey);
    }

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800",
        "X-Cache": "MISS"
      }
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message || "Failed to fetch movie from server" 
    }, { status: 500 });
  }
}
