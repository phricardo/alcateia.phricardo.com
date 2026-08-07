"use client";

import React from "react";
import Link from "next/link";

import {
  ArrowRight,
  Buildings,
  CalendarBlank,
  CircleNotch,
  FunnelSimple,
  LinkSimple,
  Newspaper,
  Tag,
} from "@phosphor-icons/react";
import { formatDate } from "@/utils/formatarData.util";
import { campusDisplayNames } from "@/utils/constants.util";
import CopyButton from "@/components/CopyButton/CopyButton";
import { NewsResponse, NewsItem } from "@/@types/newsResponse.type";
import { SkeletonLoading } from "@/components/SkeletonLoading/SkeletonLoading";
import { SystemUnavailable } from "@/components/SystemUnavailable/SystemUnavailable";
import { useCefetStatus } from "@/hooks/useCefetStatus";
import { useInfiniteFeed } from "@/hooks/useInfiniteFeed";
import styles from "./page.module.css";

type ErrorPayload = {
  message: string;
  isSearchError: boolean;
};

export default function NewsPage() {
  const [selectedCampus, setSelectedCampus] = React.useState<string | null>(null);
  const { checks, isChecking, refresh } = useCefetStatus();
  const isCefetMainUnavailable = checks.main === false;

  const handleFetchResponse = React.useCallback(async (
    response: Response
  ): Promise<NewsResponse> => {
    if (!response.ok) {
      const errorPayload = {
        message:
          response.status === 404
            ? "Não encontramos nada para sua pesquisa."
            : "Serviços temporariamente desligados.",
        isSearchError: response.status === 404,
      };
      throw new Error(JSON.stringify(errorPayload));
    }
    return (await response.json()) as NewsResponse;
  }, []);

  const fetchPage = React.useCallback(async (
    page: number,
    signal: AbortSignal,
  ): Promise<NewsResponse> => {
    let url = `/api/v1/news?page=${page}&pageSize=10`;
    if (selectedCampus) url += `&campus=${selectedCampus}`;

    const response = await fetch(url, { cache: "no-store", signal });
    return handleFetchResponse(response);
  }, [handleFetchResponse, selectedCampus]);

  const {
    items,
    hasMore,
    isInitialLoading,
    isLoadingMore,
    initialError,
    loadMoreError,
    sentinelRef,
    reload,
    retryLoadMore,
  } = useInfiniteFeed({
    enabled: !isCefetMainUnavailable,
    fetchPage,
    queryKey: selectedCampus || "all-campuses",
  });

  const initialErrorPayload = React.useMemo<ErrorPayload | null>(() => {
    if (!(initialError instanceof Error)) return null;

    try {
      return JSON.parse(initialError.message) as ErrorPayload;
    } catch {
      return {
        message: "Serviços temporariamente desligados.",
        isSearchError: false,
      };
    }
  }, [initialError]);

  const handleCampusChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCampus(event.target.value);
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleRetry = async () => {
    await refresh();
    reload();
  };

  const shouldShowUnavailable =
    isCefetMainUnavailable ||
    Boolean(initialErrorPayload && !initialErrorPayload.isSearchError);
  const shouldShowLoading =
    isInitialLoading || (isChecking && items.length === 0);

  return (
    <div className={styles.feed}>
      <div className={styles.options}>
        <div className={styles.option}>
          <label htmlFor="selectCampus">
            <FunnelSimple color="#000000" size={22} /> Filtrar por Unidade:
          </label>
          <select
            id="selectCampus"
            value={selectedCampus || ""}
            onChange={handleCampusChange}
          >
            <option value="">Todas as Unidades</option>
            {Object.keys(campusDisplayNames).map((campus) => (
              <option key={campus} value={campus}>
                {campusDisplayNames[campus]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.newsWrapper}>
        {shouldShowLoading ? (
          <div className={styles.skeletonWrapper}>
            {Array.from({ length: 5 }).map((_, index) => (
              <SkeletonLoading key={index} height="150px" width="100%" />
            ))}
          </div>
        ) : shouldShowUnavailable ? (
          <SystemUnavailable
            icon={<Newspaper weight="duotone" />}
            title="Notícias indisponíveis"
            onRetry={handleRetry}
            isRetrying={isChecking || isInitialLoading}
          />
        ) : items.length === 0 ? (
          <p>Nenhum conteúdo encontrado.</p>
        ) : (
          <>
            {items.map((item: NewsItem) => (
              <div key={item.guid} className={styles.newsItem}>
                <div className={styles.newsItemHeader}>
                  <div className={styles.newsItemDetails}>
                    <span className={styles.detailPill}>
                      <CalendarBlank weight="duotone" aria-hidden="true" />
                      {formatDate(item.pubDate)}
                    </span>
                    {item.isEveryone ? (
                      <span className={styles.detailPill}>
                        <Tag weight="duotone" aria-hidden="true" />
                        Geral
                      </span>
                    ) : (
                      item.campus && (
                        <span className={styles.detailPill}>
                          <Buildings weight="duotone" aria-hidden="true" />
                          Uned {campusDisplayNames[item.campus]}
                        </span>
                      )
                    )}
                  </div>
                  <CopyButton
                    className={styles.copyLink}
                    valueToCopy={item.guid}
                    buttonText="Copiar link"
                    icon={<LinkSimple weight="bold" aria-hidden="true" />}
                  />
                </div>
                <Link
                  className={styles.newsTitleLink}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <h1>{item.title}</h1>
                </Link>
                <p>{item.description}</p>
                <Link
                  className={styles.readMoreLink}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Ler mais
                  <ArrowRight weight="bold" aria-hidden="true" />
                </Link>
              </div>
            ))}

            <div className={styles.feedStatus}>
              {isLoadingMore ? (
                <div className={styles.feedLoading} role="status" aria-live="polite">
                  <CircleNotch weight="bold" aria-hidden="true" />
                  Carregando mais notícias...
                </div>
              ) : loadMoreError ? (
                <div className={styles.feedLoadError} role="alert">
                  <span>Não foi possível carregar mais notícias.</span>
                  <button type="button" onClick={retryLoadMore}>
                    Tentar novamente
                  </button>
                </div>
              ) : hasMore ? (
                <div ref={sentinelRef} className={styles.feedSentinel} aria-hidden="true" />
              ) : (
                <p className={styles.feedEnd}>Você chegou ao fim das notícias.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
