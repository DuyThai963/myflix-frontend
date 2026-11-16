"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { MOVIE_SERVERS, MovieSourceParser, getParserById } from "@/services/movieAdapters";

interface ServerContextType {
  currentServerId: string;
  currentServer: MovieSourceParser;
  serverList: MovieSourceParser[];
  setServerId: (id: string) => void;
  switchServer: (id: string) => void;
}

const ServerContext = createContext<ServerContextType | undefined>(undefined);

const STORAGE_KEY = "myflix_selected_server";

export function ServerProvider({ children }: { children: React.ReactNode }) {
  const [currentServerId, setCurrentServerId] = useState<string>("server_1");
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && MOVIE_SERVERS.some((s) => s.id === saved)) {
        setCurrentServerId(saved);
      } else {
        // Mặc định Server 1: VsMov
        setCurrentServerId("server_1");
        localStorage.setItem(STORAGE_KEY, "server_1");
      }
    } catch {
      // Ignored in SSR
    } finally {
      setIsInitialized(true);
    }
  }, []);

  const switchServer = (id: string) => {
    if (!MOVIE_SERVERS.some((s) => s.id === id)) return;
    setCurrentServerId(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch (e) {
      console.error("Lỗi lưu server vào localStorage:", e);
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("myflix_server_changed", { detail: { serverId: id } }));
    }
  };

  const currentServer = useMemo(() => {
    return getParserById(currentServerId);
  }, [currentServerId]);

  return (
    <ServerContext.Provider
      value={{
        currentServerId,
        currentServer,
        serverList: MOVIE_SERVERS,
        setServerId: switchServer,
        switchServer
      }}
    >
      {children}
    </ServerContext.Provider>
  );
}

export function useServer() {
  const context = useContext(ServerContext);
  if (!context) {
    // Fallback an toàn nếu component nằm ngoài provider
    const fallbackServer = MOVIE_SERVERS[0];
    return {
      currentServerId: "server_1",
      currentServer: fallbackServer,
      serverList: MOVIE_SERVERS,
      setServerId: () => {},
      switchServer: () => {}
    };
  }
  return context;
}
