import { NextRequest, NextResponse } from "next/server";
import { getParserById } from "@/services/movieAdapters";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");
    const serverId = searchParams.get("server") || "server_1";

    if (!slug) {
      return NextResponse.json({ error: "Missing movie slug" }, { status: 400 });
    }

    const parser = getParserById(serverId);
    const targetUrl = parser.getDetailUrl(slug);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json"
      },
      signal: controller.signal,
      next: { revalidate: 600 } // Cache 10 phút
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

    return NextResponse.json({
      status: true,
      server: {
        id: parser.id,
        name: parser.name,
        type: parser.type
      },
      data: parsedData
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message || "Failed to fetch movie from server" 
    }, { status: 500 });
  }
}
