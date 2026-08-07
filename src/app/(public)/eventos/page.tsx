"use client";

import Link from "next/link";
import React from "react";
import { EventsResponse } from "@/@types/eventsResponse.type";
import { campusDisplayNames } from "@/utils/constants.util";
import { formatDate } from "@/utils/formatarData.util";
import { CalendarStar, CircleNotch, FunnelSimple } from "@phosphor-icons/react";
import CopyButton from "@/components/CopyButton/CopyButton";
import { SkeletonLoading } from "@/components/SkeletonLoading/SkeletonLoading";
import { SystemUnavailable } from "@/components/SystemUnavailable/SystemUnavailable";
import { useCefetStatus } from "@/hooks/useCefetStatus";
import { useInfiniteFeed } from "@/hooks/useInfiniteFeed";
import styles from "./page.module.css";
import Image from "next/image";

type ErrorPayload = {
  message: string;
  isSearchError: boolean;
};

export default function EventsPage() {
  const [selectedCampus, setSelectedCampus] = React.useState<string | null>(null);
  const { checks, isChecking, refresh } = useCefetStatus();
  const isCefetMainUnavailable = checks.main === false;

  const handleFetchResponse = React.useCallback(async (
    response: Response
  ): Promise<EventsResponse> => {
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
    return (await response.json()) as EventsResponse;
  }, []);

  const fetchPage = React.useCallback(async (
    page: number,
    signal: AbortSignal,
  ): Promise<EventsResponse> => {
    let url = `/api/v1/events?page=${page}&pageSize=10`;
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

      <div className={styles.eventsWrapper}>
        {shouldShowLoading ? (
          <div className={styles.skeletonWrapper}>
            {Array.from({ length: 5 }).map((_, index) => (
              <SkeletonLoading key={index} height="150px" width="100%" />
            ))}
          </div>
        ) : shouldShowUnavailable ? (
          <SystemUnavailable
            icon={<CalendarStar weight="duotone" />}
            title="Eventos indisponíveis"
            onRetry={handleRetry}
            isRetrying={isChecking || isInitialLoading}
          />
        ) : items.length === 0 ? (
          <p>Nenhum conteúdo encontrado.</p>
        ) : (
          <>
            {items.map((item) => (
              <div key={item.guid} className={styles.eventsItem}>
                {item.imageUrl && (
                  <div>
                    <Image
                      width={200}
                      height={200}
                      src={item.imageUrl}
                      alt={item.title}
                    />
                  </div>

                )}

                <div>
                  <div className={styles.eventsItemHeader}>
                    <div className={styles.eventsItemDetails}>
                      <span>{formatDate(item.pubDate)}</span>
                      {item.isEveryone ? (
                        <span>Geral</span>
                      ) : (
                        <span>Uned {campusDisplayNames[item.campus]}</span>
                      )}
                    </div>
                    <div>
                      <CopyButton
                        className={styles.copyLink}
                        valueToCopy={item.guid}
                        buttonText="Copiar Link"
                      />
                    </div>
                  </div>

                  <Link href={item.link} target="_blank">
                    <h1>{item.title}</h1>
                  </Link>
                  <p>{item.description}</p>
                  <Link href={item.link} target="_blank">
                    Ler Mais
                  </Link>
                </div>
              </div>
            ))}

            <div className={styles.feedStatus}>
              {isLoadingMore ? (
                <div className={styles.feedLoading} role="status" aria-live="polite">
                  <CircleNotch weight="bold" aria-hidden="true" />
                  Carregando mais eventos...
                </div>
              ) : loadMoreError ? (
                <div className={styles.feedLoadError} role="alert">
                  <span>Não foi possível carregar mais eventos.</span>
                  <button type="button" onClick={retryLoadMore}>
                    Tentar novamente
                  </button>
                </div>
              ) : hasMore ? (
                <div ref={sentinelRef} className={styles.feedSentinel} aria-hidden="true" />
              ) : (
                <p className={styles.feedEnd}>Você chegou ao fim dos eventos.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
