"use client";

import React from "react";
import { ArrowClockwise, WarningCircle } from "@phosphor-icons/react";
import styles from "./SystemUnavailable.module.css";

type SystemUnavailableProps = {
  icon?: React.ReactNode;
  title: string;
  message?: string;
  actionLabel?: string;
  isRetrying?: boolean;
  onRetry?: () => void | Promise<void>;
};

const DEFAULT_MESSAGE =
  "Não estamos conseguindo nos conectar com o sistema do Cefet/RJ. Tente novamente em instantes.";

export function SystemUnavailable({
  icon,
  title,
  message = DEFAULT_MESSAGE,
  actionLabel = "Tentar novamente",
  isRetrying = false,
  onRetry,
}: SystemUnavailableProps) {
  return (
    <section className={styles.wrapper} role="status" aria-live="polite">
      <div className={styles.iconWrapper}>
        {icon ?? <WarningCircle weight="duotone" />}
      </div>

      <div className={styles.content}>
        <h2>{title}</h2>
        <p>{message}</p>
      </div>

      {onRetry && (
        <button type="button" onClick={onRetry} disabled={isRetrying}>
          <ArrowClockwise />
          {isRetrying ? "Verificando..." : actionLabel}
        </button>
      )}
    </section>
  );
}
