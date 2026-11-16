import { NextRequest, NextResponse } from "next/server";
import { getParserById } from "@/services/movieAdapters";

export const dynamic = "force-dynamic";

// ⚡ BỘ ĐỆM RAM IN-MEMORY CACHE (Server-side): Phản hồi dưới 1ms cho các lượt gọi trùng
const serverCache = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 phút

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action") || "home";
    const serverId = searchParams.get("server") || "server_1";
    const slug = searchParams.get("slug") || "";
    const keyword = searchParams.get("keyword") || "";
    const page = parseInt(searchParams.get("page") || "1", 10) || 1;

    const cacheKey = `${serverId}_${action}_${slug}_${keyword}_${page}`;
    const now = Date.now();
    const cached = serverCache.get(cacheKey);

    if (cached && cached.expiry > now) {
      return NextResponse.json(cached.data, {
        headers: {
          "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200",
          "X-Cache": "HIT"
        }
      });
    }

    const parser = getParserById(serverId);
    let targetUrl = "";

    if (action === "home") {
      targetUrl = parser.getHomeUrl(page);
    } else if (action === "category") {
      if (!slug) {
        return NextResponse.json({ error: "Missing category slug" }, { status: 400 });
      }
      targetUrl = parser.getListUrl(slug, page);
    } else if (action === "search") {
      if (!keyword.trim()) {
        return NextResponse.json({ status: true, data: [] });
      }
      targetUrl = parser.getSearchUrl(keyword, page);
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000); // 6s timeout tránh treo

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
    const items = parser.parseList(rawJson);

    const payload = {
      status: true,
      server: {
        id: parser.id,
        name: parser.name,
        type: parser.type
      },
      data: items
    };

    // Lưu vào RAM cache
    serverCache.set(cacheKey, { data: payload, expiry: now + CACHE_TTL_MS });

    // Dọn dẹp cache nếu vượt quá 500 mục
    if (serverCache.size > 500) {
      const firstKey = serverCache.keys().next().value;
      if (firstKey) serverCache.delete(firstKey);
    }

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200",
        "X-Cache": "MISS"
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message || "Failed to fetch movie list"
    }, { status: 500 });
  }
}
