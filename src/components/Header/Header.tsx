"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { UserContext } from "@/contexts/user-context";
import { IAuthenticatedUser } from "@/@types/authUser.type";
import { SkeletonLoading } from "../SkeletonLoading/SkeletonLoading";
import styles from "./Header.module.css";
import Image from "next/image";
import Link from "next/link";
import { BackLink } from "../BackLink/BackLink";
import { SignInLink } from "../SignInLink/SignInLink";
import LogoutButton from "../Button/LogoutButton";
import { Info } from "@phosphor-icons/react";
import { useCefetStatus } from "@/hooks/useCefetStatus";

export function Header() {
  const pathname = usePathname();
  const status = useCefetStatus();
  const { user, isLoading } = React.useContext(UserContext);
  const [greeting, setGreeting] = React.useState<string | null>(null);

  function getDisplayName(user: IAuthenticatedUser | null): string {
    if (user?.name) {
      const names = user.name.split(" ");
      if (names.length > 0) {
        const firstName = names[0];
        const lastName = names[names.length - 1];
        return `${firstName} ${lastName}`;
      }
    }
    return "aluno(a)";
  }

  React.useEffect(() => {
    const currentHour = new Date().getHours();
    if (currentHour >= 5 && currentHour < 12) {
      setGreeting("Bom dia");
    } else if (currentHour >= 12 && currentHour < 18) {
      setGreeting("Boa tarde");
    } else {
      setGreeting("Boa noite");
    }
  }, []);

  return (
    <header className={styles.header}>
      <div className="container">
        <div className={styles.menu}>
          <div>
            <Link href="/">
              <Image
                src="/images/logo.png"
                height={35}
                width={130}
                alt="alcateia.Cefet/RJ"
              />
            </Link>
          </div>

          <div className={styles.group}>
            <div>
              {pathname != "/" && (
                <div>
                  <BackLink
                    text="Voltar"
                    className={styles.btnBack}
                    redirectToHome={true}
                  />
                </div>
              )}

              {isLoading && pathname === "/" && (
                <SkeletonLoading width="4rem" height="2rem" />
              )}

              {!isLoading && !user && pathname === "/" && <SignInLink />}

              {!isLoading && user && pathname === "/" && <LogoutButton />}
            </div>

            <Link href="/sobre" className={styles.about}>
              <Info />
            </Link>
          </div>
        </div>
        <div className={styles.hero}>
          <h1>
            {greeting && !isLoading ? (
              `${greeting}, ${getDisplayName(user)} 👋!`
            ) : (
              <SkeletonLoading width="20rem" height="2rem" />
            )}
          </h1>
          <p>
            {!isLoading && user
              ? user.campus
                ? `Você está matriculado no campus ${user.campus
                    .replaceAll("_", " ")
                    .toLowerCase()
                    .replace(/\b\w/g, (l) => l.toUpperCase())}.`
                : "Seja bem-vindo(a) à sua conta!"
              : "Faça login para obter mais recursos!"}
          </p>

          <div className={styles.statusWrapper}>
            <span
              className={`${styles.statusIndicator} ${
                status === "online"
                  ? styles.online
                  : status === "parcial"
                  ? styles.partial
                  : status === "offline"
                  ? styles.offline
                  : status === "checking"
                  ? styles.checking
                  : ""
              }`}
            />
            <span className={styles.statusText}>
              {status === "online" && "Conectado ao sistema do CEFET/RJ"}
              {status === "parcial" && "Conexão parcial com o sistema"}
              {status === "offline" &&
                "Sem conexão com o sistema do Cefet/RJ"}
              {status === "checking" && "Verificando conexão..."}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
