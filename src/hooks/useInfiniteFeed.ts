import { useCallback, useEffect, useRef, useState } from "react";

type Pagination = {
  page: number;
  totalPages: number;
};

export type PaginatedResponse<T> = {
  items: T[];
  pagination: Pagination;
};

type UseInfiniteFeedOptions<T> = {
  enabled: boolean;
  queryKey: string;
  fetchPage: (
    page: number,
    signal: AbortSignal,
  ) => Promise<PaginatedResponse<T>>;
};

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function useInfiniteFeed<T>({
  enabled,
  queryKey,
  fetchPage,
}: UseInfiniteFeedOptions<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [initialError, setInitialError] = useState<unknown>(null);
  const [loadMoreError, setLoadMoreError] = useState<unknown>(null);
  const [hasMore, setHasMore] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const nextPageRef = useRef(2);
  const requestIdRef = useRef(0);
  const initialRequestRef = useRef<AbortController | null>(null);
  const loadMoreRequestRef = useRef<AbortController | null>(null);
  const isLoadingMoreRef = useRef(false);

  const reload = useCallback(() => {
    setReloadToken((current) => current + 1);
  }, []);

  useEffect(() => {
    initialRequestRef.current?.abort();
    loadMoreRequestRef.current?.abort();
    const requestId = ++requestIdRef.current;

    setItems([]);
    setInitialError(null);
    setLoadMoreError(null);
    setHasMore(false);
    nextPageRef.current = 2;
    isLoadingMoreRef.current = false;

    if (!enabled) {
      setIsInitialLoading(false);
      setIsLoadingMore(false);
      return;
    }

    const controller = new AbortController();
    initialRequestRef.current = controller;
    setIsInitialLoading(true);
    setIsLoadingMore(false);

    fetchPage(1, controller.signal)
      .then((response) => {
        if (requestId !== requestIdRef.current) return;

        setItems(response.items);
        nextPageRef.current = response.pagination.page + 1;
        setHasMore(
          response.items.length > 0 &&
            response.pagination.page < response.pagination.totalPages,
        );
      })
      .catch((error: unknown) => {
        if (requestId !== requestIdRef.current || isAbortError(error)) return;
        setInitialError(error);
      })
      .finally(() => {
        if (requestId === requestIdRef.current) {
          setIsInitialLoading(false);
        }
      });

    return () => controller.abort();
  }, [enabled, fetchPage, queryKey, reloadToken]);

  const loadMore = useCallback(async () => {
    if (
      !enabled ||
      isInitialLoading ||
      isLoadingMore ||
      isLoadingMoreRef.current ||
      !hasMore
    ) {
      return;
    }

    loadMoreRequestRef.current?.abort();
    const controller = new AbortController();
    const requestId = requestIdRef.current;
    const page = nextPageRef.current;
    loadMoreRequestRef.current = controller;
    isLoadingMoreRef.current = true;

    setIsLoadingMore(true);
    setLoadMoreError(null);

    try {
      const response = await fetchPage(page, controller.signal);
      if (requestId !== requestIdRef.current) return;

      setItems((current) => [...current, ...response.items]);
      nextPageRef.current = response.pagination.page + 1;
      setHasMore(
        response.items.length > 0 &&
          response.pagination.page < response.pagination.totalPages,
      );
    } catch (error: unknown) {
      if (requestId !== requestIdRef.current || isAbortError(error)) return;
      setLoadMoreError(error);
    } finally {
      if (requestId === requestIdRef.current) {
        isLoadingMoreRef.current = false;
        setIsLoadingMore(false);
      }
    }
  }, [enabled, fetchPage, hasMore, isInitialLoading, isLoadingMore]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !enabled || !hasMore || isInitialLoading || isLoadingMore || loadMoreError) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMore();
        }
      },
      { rootMargin: "320px 0px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [enabled, hasMore, isInitialLoading, isLoadingMore, loadMore, loadMoreError]);

  return {
    items,
    hasMore,
    isInitialLoading,
    isLoadingMore,
    initialError,
    loadMoreError,
    sentinelRef,
    reload,
    retryLoadMore: loadMore,
  };
}
