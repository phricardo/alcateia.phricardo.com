"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Megaphone, Newspaper, Bell } from "@phosphor-icons/react";
import styles from "./LatestNews.module.css";
import { campusDisplayNames } from "@/utils/constants.util";

type NewsItem = {
  title: string;
  link: string;
  description: string;
  guid: string;
  pubDate: string[];
  campus: string;
  isEveryone: boolean;
};

type NewsResponse = {
  items: NewsItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};

type LatestNewsProps = {
  campus?: string | null;
};

export function LatestNews({ campus }: LatestNewsProps) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoadingNews, setIsLoadingNews] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!campus) return;

    let isCancelled = false;

    async function loadNews() {
      try {
        setIsLoadingNews(true);
        setError(null);

        const params = new URLSearchParams({ pageSize: "2" });
        if (campus) params.set("campus", campus);

        const res = await fetch(`/api/v1/news?${params.toString()}`);
        if (!res.ok) throw new Error("Erro ao carregar notícias");

        const data: NewsResponse = await res.json();
        if (!isCancelled) setNews(data.items ?? []);
      } catch (err) {
        if (!isCancelled) setError("Não foi possível carregar os comunicados.");
      } finally {
        if (!isCancelled) setIsLoadingNews(false);
      }
    }

    loadNews();
    return () => {
      isCancelled = true;
    };
  }, [campus]);

  if (!campus) return null;

  function formatTime(dateStr: string) {
    const date = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();
    const diffH = Math.floor(diffMs / 3600000);

    if (diffH < 1) return "Agora mesmo";
    if (diffH === 1) return "Há 1 hora";
    if (diffH < 24) return `Há ${diffH} horas`;

    const diffD = Math.floor(diffH / 24);
    if (diffD === 1) return "Há 1 dia";
    return `Há ${diffD} dias`;
  }

  return (
    <section className={styles.latestNews}>
      <header className={styles.header}>
        <h2>
          <Megaphone size={22} weight="fill" className={styles.icon} />
          Últimos Comunicados
        </h2>
        <Link href="/noticias" className={styles.seeMore}>
          Ver todos →
        </Link>
      </header>

      {isLoadingNews && <p className={styles.message}>Carregando…</p>}
      {error && <p className={styles.message}>{error}</p>}

      {!isLoadingNews && !error && (
        <ul className={styles.list}>
          {news.map((item) => (
            <li key={item.guid} className={styles.card}>
              <a href={item.link} target="_blank" rel="noopener noreferrer">
                <div className={styles.cardHeader}>
                  <strong className={styles.title}>{item.title}</strong>

                  <span className={styles.badge}>
                    {item.isEveryone
                      ? "geral"
                      : campusDisplayNames[item.campus]}
                  </span>
                </div>

                <p className={styles.time}>{formatTime(item.pubDate[0])}</p>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
