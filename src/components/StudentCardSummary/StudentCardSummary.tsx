"use client";

import React from "react";
import Link from "next/link";
import { IdentificationCard } from "@phosphor-icons/react";
import { campusDisplayNames } from "@/utils/constants.util";
import { IAuthenticatedUser } from "@/@types/authUser.type";
import styles from "./StudentCardSummary.module.css";

type StudentCardSummaryProps = {
  user: IAuthenticatedUser;
};

function formatCampusName(campus?: IAuthenticatedUser["campus"]) {
  if (!campus) return "Campus nao informado";
  return (
    campusDisplayNames[campus] ??
    campus
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase())
  );
}

function getInitials(name?: string) {
  if (!name) return "??";
  const parts = name.split(" ").filter(Boolean).slice(0, 2);

  const initials = parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
  return initials || "??";
}

export function StudentCardSummary({ user }: StudentCardSummaryProps) {
  const enrollment = user.enrollment ?? user.studentId ?? "Nao informado";
  const course = user.course ?? "Curso nao informado";
  const campus = formatCampusName(user.campus);

  return (
    <section className={styles.card} aria-label="Resumo da carteirinha">
      <div className={styles.cardHeader}>
        <div className={styles.avatar} aria-hidden="true">
          {getInitials(user.name)}
        </div>

        <div className={styles.userDetails}>
          <p className={styles.cardLabel}>Carteirinha digital</p>
          <h3>{user.name}</h3>
          <p className={styles.infoLine}>Matricula: {enrollment}</p>
          <p className={styles.infoLine}>Curso: {course}</p>
          <p className={styles.infoLine}>Campus: {campus}</p>
        </div>
      </div>

      <Link href="/aluno/carteirinha" className={styles.actionButton}>
        <IdentificationCard weight="fill" />
        Visualizar carteirinha
      </Link>
    </section>
  );
}
