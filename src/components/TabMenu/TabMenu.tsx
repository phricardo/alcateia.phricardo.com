"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, IdentificationCard, SignIn } from "@phosphor-icons/react";
import { UserContext } from "@/contexts/user-context";
import styles from "./TabMenu.module.css";

export default function TabMenu() {
  const pathname = usePathname();
  const { user, isLoading, hasStudentCard } = React.useContext(UserContext);

  const tabs = [
    {
      label: "Início",
      href: "/",
      icon: House,
    },
    !isLoading && user && hasStudentCard
      ? {
          label: "Carteirinha",
          href: "/aluno/carteirinha",
          icon: IdentificationCard,
        }
      : {
          label: "Entrar",
          href: "/auth/login",
          icon: SignIn,
        },
  ];

  return (
    <div className={`container ${styles.tabMenu}`}>
      {tabs.map((tab, index) => {
        if (!tab) return null;

        const isActive = pathname === tab.href;
        const Icon = tab.icon;

        return (
          <Link key={index} href={tab.href}>
            <div
              className={`${styles.tabItem} ${isActive ? styles.active : ""}`}
            >
              <Icon size={24} weight={isActive ? "fill" : "regular"} />
              <span>{tab.label}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
