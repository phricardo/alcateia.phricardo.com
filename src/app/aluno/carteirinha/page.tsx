"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useQRCode } from "next-qrcode";
import {
  IdentificationCard,
  LinkSimple,
  QrCode,
  SealCheck,
  Student,
} from "@phosphor-icons/react";
import { UserContext } from "@/contexts/user-context";
import CopyButton from "@/components/CopyButton/CopyButton";
import {
  readStoredStudentCard,
  writeStoredStudentCard,
} from "@/functions/student-card-storage";
import styles from "./page.module.css";

type StudentCardResponse = {
  studentId: string;
  name?: string;
  studentRegistration?: string;
  semesterLabel?: string;
  currentPeriod?: string;
  courseLabel?: string;
  courseVersion?: string;
  authenticationCode?: string;
  authenticationUrl?: string;
  validityDays?: number;
  totalCredits?: number;
  totalWorkloadHours?: number;
};

function formatName(name?: string) {
  return (name ?? "")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getMockValidityLabel() {
  return `31/12/${new Date().getFullYear()}`;
}

export default function StudentCardPage() {
  const {
    user,
    isLoading: isUserLoading,
    studentCard,
  } = React.useContext(UserContext);
  const { Canvas } = useQRCode();
  const [data, setData] = React.useState<StudentCardResponse | null>(null);
  const [activeFace, setActiveFace] = React.useState<"front" | "back">("front");
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isUserLoading) return;
    if (!user) {
      setIsLoading(false);
      return;
    }

    const cachedCard = studentCard ?? readStoredStudentCard();
    if (cachedCard) {
      setData(cachedCard);
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function loadStudentCard() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/v1/student-card", {
          credentials: "include",
          cache: "no-store",
        });
        const json = await response.json();

        if (!response.ok) {
          throw new Error(json?.error || "Não foi possível carregar a carteirinha.");
        }

        if (isMounted) {
          writeStoredStudentCard(json);
          setData(json);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Não foi possível carregar a carteirinha."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadStudentCard();

    return () => {
      isMounted = false;
    };
  }, [isUserLoading, studentCard, user]);

  if (!isUserLoading && !user) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyState}>
          <IdentificationCard size={40} />
          <h2>Faça login para ver sua carteirinha</h2>
          <p>
            A carteirinha depende da sessão autenticada com o portal do aluno do
            CEFET/RJ.
          </p>
          <Link href="/auth/login">Entrar</Link>
        </div>
      </div>
    );
  }

  if (isLoading || isUserLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingCard} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyState}>
          <IdentificationCard size={40} />
          <h2>Carteirinha indisponível</h2>
          <p>{error ?? "Não foi possível carregar os dados da carteirinha."}</p>
          <button className={styles.discreteButton} onClick={() => window.location.reload()}>
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const verificationUrl = data.authenticationUrl ?? "";
  const mockValidityLabel = getMockValidityLabel();

  function renderFront(card: StudentCardResponse) {
    return (
      <section className={`${styles.cardFace} ${styles.frontFace}`.trim()}>
        <div className={styles.frontHeader}>
          <Image
            src="/images/cefetrj.png"
            alt="CEFET/RJ"
            width={200}
            height={64}
            className={styles.logo}
            priority
          />

          <div className={styles.titleBlock}>
            <h2>Carteira de Identificação Estudantil</h2>
            <p>Centro Federal de Educação Tecnológica do Rio de Janeiro</p>
          </div>
        </div>

        <div className={styles.identityBand}>
          <div>
            <span className={styles.label}>Aluno</span>
            <strong>{formatName(card.name)}</strong>
          </div>
          <div className={styles.periodBadge}>
            <Student size={16} />
            <span>
                {card.currentPeriod ? `${card.currentPeriod}º período` : "Aluno regular"}
            </span>
          </div>
        </div>

        <div className={styles.infoGrid}>
          <div className={styles.infoCard}>
            <span className={styles.label}>Número de Registro</span>
            <strong>{card.studentId}</strong>
          </div>

          {card.studentRegistration && (
            <div className={styles.infoCard}>
              <span className={styles.label}>Matrícula institucional</span>
              <strong>{card.studentRegistration}</strong>
            </div>
          )}

          {card.semesterLabel && (
            <div className={styles.infoCard}>
              <span className={styles.label}>Período letivo</span>
              <strong>{card.semesterLabel}</strong>
            </div>
          )}

          {card.courseVersion && (
            <div className={styles.infoCard}>
              <span className={styles.label}>Versão curricular</span>
              <strong>{card.courseVersion}</strong>
            </div>
          )}

          <div className={styles.infoCard}>
            <span className={styles.label}>Validade</span>
            <strong>{mockValidityLabel}</strong>
          </div>

          {card.courseLabel && (
            <div className={`${styles.infoCard} ${styles.infoWide}`}>
              <span className={styles.label}>Curso</span>
              <strong>{card.courseLabel}</strong>
            </div>
          )}

          {typeof card.totalCredits === "number" && (
            <div className={styles.infoCard}>
              <span className={styles.label}>Créditos</span>
              <strong>{card.totalCredits}</strong>
            </div>
          )}

          {typeof card.totalWorkloadHours === "number" && (
            <div className={styles.infoCard}>
              <span className={styles.label}>Carga horária</span>
              <strong>{card.totalWorkloadHours}h</strong>
            </div>
          )}
        </div>
      </section>
    );
  }

  function renderBack(card: StudentCardResponse) {
    return (
      <section className={`${styles.cardFace} ${styles.backFace}`.trim()}>
        <div className={styles.backHeader}>
          <div>
            <span className={styles.label}>Verso</span>
            <h3>Validação</h3>
          </div>
          <div className={styles.validityChip}>
            <SealCheck size={16} />
            <span>{card.validityDays ?? 0} dias</span>
          </div>
        </div>

        <div className={styles.backContent}>
          <div className={styles.qrColumn}>
            <div className={styles.qrFrame}>
              {verificationUrl ? (
                <Canvas
                  text={verificationUrl}
                  options={{
                    errorCorrectionLevel: "M",
                    margin: 2,
                    scale: 4,
                    width: 148,
                    color: {
                      dark: "#506072ff",
                      light: "#ffffffff",
                    },
                  }}
                />
              ) : (
                <QrCode size={64} />
              )}
            </div>
            <p className={styles.helperText}>Validação oficial do documento.</p>
          </div>

          <div className={styles.validationColumn}>
            {card.authenticationCode && (
              <div className={styles.infoCard}>
                <span className={styles.label}>Código de autenticação</span>
                <strong>{card.authenticationCode}</strong>
              </div>
            )}

            <div className={styles.actionsRow}>
              {card.authenticationCode && (
                <CopyButton
                  buttonText="Copiar código"
                  valueToCopy={card.authenticationCode}
                  className={styles.inlineButton}
                />
              )}

              {verificationUrl && (
                <Link
                  href={verificationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.inlineLink}
                >
                  <LinkSimple size={15} />
                  Abrir validação
                </Link>
              )}
            </div>

          </div>
        </div>
      </section>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <div className={styles.faceTabs}>
          <button
            className={`${styles.faceTab} ${activeFace === "front" ? styles.faceTabActive : ""}`}
            onClick={() => setActiveFace("front")}
            type="button"
          >
            Frente
          </button>
          <button
            className={`${styles.faceTab} ${activeFace === "back" ? styles.faceTabActive : ""}`}
            onClick={() => setActiveFace("back")}
            type="button"
          >
            Verso
          </button>
        </div>
      </div>

      <div className={styles.screenCard}>
        {activeFace === "front" ? renderFront(data) : renderBack(data)}
      </div>
    </div>
  );
}
