"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useQRCode } from "next-qrcode";
import {
  CaretRight,
  DownloadSimple,
  IdentificationCard,
  LinkSimple,
  QrCode,
  SealCheck,
  Student,
} from "@phosphor-icons/react";
import toast from "react-hot-toast";
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

export default function StudentCardPage() {
  const {
    user,
    isLoading: isUserLoading,
    studentCard,
  } = React.useContext(UserContext);
  const { Canvas } = useQRCode();
  const [data, setData] = React.useState<StudentCardResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const exportRef = React.useRef<HTMLDivElement>(null);

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

  async function handleDownloadPdf() {
    if (!exportRef.current || !data) return;

    try {
      setIsDownloading(true);
      const html2pdfModule = await import("html2pdf.js");
      const html2pdf = html2pdfModule.default;

      await html2pdf()
        .set({
          margin: 10,
          filename: `carteirinha-${data.studentRegistration ?? data.studentId}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: {
            scale: 2,
            backgroundColor: "#f7f3ea",
          },
          jsPDF: {
            unit: "mm",
            format: "a4",
            orientation: "portrait",
          },
        })
        .from(exportRef.current)
        .save();
    } catch {
      toast.error("Não foi possível baixar o PDF.");
    } finally {
      setIsDownloading(false);
    }
  }

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

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <div className={styles.swipeHint}>
          <span>Frente</span>
          <CaretRight size={14} />
          <span>Verso</span>
        </div>

        <button
          className={styles.discreteButton}
          onClick={handleDownloadPdf}
          disabled={isDownloading}
        >
          <DownloadSimple size={16} />
          {isDownloading ? "Baixando..." : "Baixar PDF"}
        </button>
      </div>

      <div ref={exportRef} className={styles.cardRail}>
        <section className={`${styles.cardFace} ${styles.frontFace}`}>
          <div className={styles.frontHeader}>
            <div className={styles.logoShell}>
              <Image
                src="/images/cefetrj.png"
                alt="CEFET/RJ"
                width={140}
                height={52}
                className={styles.logo}
                priority
              />
            </div>

            <div className={styles.titleBlock}>
              <span className={styles.label}>CEFET/RJ</span>
              <h2>Carteirinha do Aluno</h2>
              <p>Documento digital derivado do portal acadêmico.</p>
            </div>
          </div>

          <div className={styles.identityBand}>
            <div>
              <span className={styles.label}>Aluno</span>
              <strong>{formatName(data.name)}</strong>
            </div>
            <div className={styles.periodBadge}>
              <Student size={16} />
              <span>
                {data.currentPeriod ? `${data.currentPeriod}º período` : "Aluno regular"}
              </span>
            </div>
          </div>

          <div className={styles.infoGrid}>
            <div className={styles.infoCard}>
              <span className={styles.label}>Matrícula real</span>
              <strong>{data.studentId}</strong>
            </div>

            {data.studentRegistration && (
              <div className={styles.infoCard}>
                <span className={styles.label}>Matrícula institucional</span>
                <strong>{data.studentRegistration}</strong>
              </div>
            )}

            {data.semesterLabel && (
              <div className={styles.infoCard}>
                <span className={styles.label}>Período letivo</span>
                <strong>{data.semesterLabel}</strong>
              </div>
            )}

            {data.courseVersion && (
              <div className={styles.infoCard}>
                <span className={styles.label}>Versão curricular</span>
                <strong>{data.courseVersion}</strong>
              </div>
            )}

            {data.courseLabel && (
              <div className={`${styles.infoCard} ${styles.infoWide}`}>
                <span className={styles.label}>Curso</span>
                <strong>{data.courseLabel}</strong>
              </div>
            )}

            {typeof data.totalCredits === "number" && (
              <div className={styles.infoCard}>
                <span className={styles.label}>Créditos</span>
                <strong>{data.totalCredits}</strong>
              </div>
            )}

            {typeof data.totalWorkloadHours === "number" && (
              <div className={styles.infoCard}>
                <span className={styles.label}>Carga horária</span>
                <strong>{data.totalWorkloadHours}h</strong>
              </div>
            )}
          </div>
        </section>

        <section className={`${styles.cardFace} ${styles.backFace}`}>
          <div className={styles.backHeader}>
            <div>
              <span className={styles.label}>Verso</span>
              <h3>Validação</h3>
            </div>
            <div className={styles.validityChip}>
              <SealCheck size={16} />
              <span>{data.validityDays ?? 0} dias</span>
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
                        light: "#f8f5eeff",
                      },
                    }}
                  />
                ) : (
                  <QrCode size={64} />
                )}
              </div>
              <p className={styles.helperText}>Arraste para voltar à frente.</p>
            </div>

            <div className={styles.validationColumn}>
              {data.authenticationCode && (
                <div className={styles.infoCard}>
                  <span className={styles.label}>Código de autenticação</span>
                  <strong>{data.authenticationCode}</strong>
                </div>
              )}

              <div className={styles.actionsRow}>
                {data.authenticationCode && (
                  <CopyButton
                    buttonText="Copiar código"
                    valueToCopy={data.authenticationCode}
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

              {verificationUrl && (
                <div className={styles.infoCard}>
                  <span className={styles.label}>URL oficial</span>
                  <strong className={styles.mutedStrong}>{verificationUrl}</strong>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
