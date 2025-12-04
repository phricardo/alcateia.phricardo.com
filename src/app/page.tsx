"use client";

import React, { useEffect, useContext } from "react";
import Link from "next/link";
import {
  Calendar,
  CalendarStar,
  Student,
  Database,
  ArrowSquareOut,
  Newspaper,
  IdentificationCard,
  ChalkboardSimple,
} from "@phosphor-icons/react";
import { UserContext } from "@/contexts/user-context";
import AdPlaceholderImage from "@/components/AdPlaceholderImage/AdPlaceholderImage";
import { StudentCardSummary } from "@/components/StudentCardSummary/StudentCardSummary";

import styles from "./page.module.css";
import { LatestNews } from "@/components/LatestNews/LatestNews";

type LinkItem = {
  label: React.ReactNode;
  href: string;
  icon: React.ReactNode;
  external?: boolean;
};

export default function IndexPage() {
  const { user, isLoading } = useContext(UserContext);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/service-worker.js")
        .then((registration) => {
          console.log("[SW] Registrado com sucesso:", registration.scope);
        })
        .catch((err) => {
          console.error("[SW] Falha ao registrar:", err);
        });
    }
  }, []);

  const commonLinks: LinkItem[] = [
    {
      label: "Notícias",
      href: "/noticias",
      icon: <Newspaper />,
    },
    {
      label: "Calendário Acadêmico",
      href: "/calendarios",
      icon: <Calendar />,
    },
    {
      label: "Eventos",
      href: "/eventos",
      icon: <CalendarStar />,
    },
  ];

  const privateLinks: LinkItem[] = [
    {
      label: "Carteirinha",
      href: "/aluno/carteirinha",
      icon: <IdentificationCard />,
    },
    {
      label: "Minhas Aulas",
      href: "/aluno/aulas",
      icon: <ChalkboardSimple />,
    },
  ];

  const campusSpecificLinks: LinkItem[] =
    !isLoading && user?.campus === "NOVA_FRIBURGO"
      ? [
          {
            label: (
              <>
                Banco de Provas <ArrowSquareOut size={18} color="#000" />
              </>
            ),
            href: "https://cefetdb.rattz.xyz",
            icon: <Database />,
            external: true,
          },
        ]
      : [];

  const externalLinks: LinkItem[] = [
    {
      label: (
        <>
          Portal do Aluno <ArrowSquareOut size={18} color="#000" />
        </>
      ),
      href: "https://alunos.cefet-rj.br/aluno/login.action",
      icon: <ChalkboardSimple />,
      external: true,
    },
    {
      label: (
        <>
          Registro Cefet/RJ <ArrowSquareOut size={18} />
        </>
      ),
      href: "https://registro.cefet-rj.br/",
      icon: <Student />,
      external: true,
    },
  ];

  const allLinks: LinkItem[] = [
    ...commonLinks,
    ...(!isLoading && user ? privateLinks : []),
    ...campusSpecificLinks,
    ...externalLinks,
  ];

  return (
    <div className={styles.indexWrapper}>
      {!isLoading && !user && <AdPlaceholderImage />}
      {!isLoading && user && <StudentCardSummary user={user} />}
      {!isLoading && user && <LatestNews campus={user.campus ?? undefined} />}

      <div className={styles.links}>
        <ul>
          {allLinks.map(({ label, href, icon, external }, index) => (
            <li className={styles.linkWrapper} key={index}>
              <Link
                href={href}
                target={external ? "_blank" : undefined}
                rel={external ? "noopener noreferrer" : undefined}
              >
                <div>{icon}</div>
                <span>{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
