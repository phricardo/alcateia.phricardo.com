"use client";

import Link from "next/link";
import React, { useState, useEffect } from "react";
import { EventsResponse } from "@/@types/eventsResponse.type";
import { campusDisplayNames } from "@/utils/constants.util";
import { formatDate } from "@/utils/formatarData.util";
import { CalendarStar, FunnelSimple } from "@phosphor-icons/react";
import CopyButton from "@/components/CopyButton/CopyButton";
import { SkeletonLoading } from "@/components/SkeletonLoading/SkeletonLoading";
import { SystemUnavailable } from "@/components/SystemUnavailable/SystemUnavailable";
import { useCefetStatus } from "@/hooks/useCefetStatus";
import styles from "./page.module.css";
import Image from "next/image";

type ErrorPayload = {
  message: string;
  isSearchError: boolean;
};

export default function EventsPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<ErrorPayload | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [data, setData] = useState<EventsResponse | null>(null);
  const [selectedCampus, setSelectedCampus] = useState<string | null>(null);
  const { checks, isChecking, refresh } = useCefetStatus();
  const isCefetMainUnavailable = checks.main === false;

  const buildURL = React.useCallback((): string => {
    let url = `/api/v1/events?page=${currentPage}`;
    if (selectedCampus) url += `&campus=${selectedCampus}`;
    return url;
  }, [currentPage, selectedCampus]);

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

  const handleError = React.useCallback((error: unknown) => {
    if (error instanceof Error) {
      try {
        const err = JSON.parse(error.message) as ErrorPayload;
        setError(err);
      } catch {
        setError({
          message: "Serviços temporariamente desligados.",
          isSearchError: false,
        });
      }
    }
  }, []);

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const url = buildURL();
      const response = await fetch(url, { cache: "no-store" });
      const data = await handleFetchResponse(response);
      setData(data);
    } catch (error: unknown) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  }, [buildURL, handleError, handleFetchResponse]);

  useEffect(() => {
    if (isCefetMainUnavailable) {
      setLoading(false);
      setData(null);
      setError({
        message: "Serviços temporariamente desligados.",
        isSearchError: false,
      });
      return;
    }

    fetchData();
  }, [fetchData, isCefetMainUnavailable]);

  useEffect(() => {
    if (error && !error.isSearchError) setData(null);
  }, [error]);

  const handleCampusChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setError(null);
    setSelectedCampus(event.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    setTimeout(() => {
      setCurrentPage(newPage);
    }, 500);
  };

  const handleRetry = async () => {
    setError(null);
    await refresh();
    await fetchData();
  };

  const shouldShowUnavailable =
    isCefetMainUnavailable ||
    (!loading && Boolean(error && !error.isSearchError)) ||
    (!loading &&
      Boolean(data && data.items.length === 0) &&
      checks.main === false);
  const shouldShowLoading =
    loading || (isChecking && (!data || data.items.length === 0));

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
            isRetrying={isChecking || loading}
          />
        ) : !data || data.items.length === 0 ? (
          <p>Nenhum conteúdo encontrado.</p>
        ) : (
          data.items.map((item) => (
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
          ))
        )}
      </div>

      {data && (
        <div className={styles.pagination}>
          <p>
            Página {data.pagination.page} de {data.pagination.totalPages}
          </p>

          <div className={styles.pageNav}>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Anterior
            </button>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === data.pagination.totalPages}
            >
              Próximo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
