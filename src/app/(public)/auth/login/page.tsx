"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormState } from "react-dom";
import SubmitButton from "@/components/Button/SubmitButton";
import styles from "./LoginPage.module.css";
import PasswordInput from "@/components/PasswordInput/PasswordInput";
import LoginAction from "@/actions/login.action";
import toast from "react-hot-toast";
import { loadUser } from "@/contexts/user-context";
import { CPA_STATUS_GET } from "@/functions/api";

export default function LoginPage() {
  const router = useRouter();
  const [state, action] = useFormState(LoginAction, {
    ok: false,
    error: null,
    data: null,
  });
  const [cpaActive, setCpaActive] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    if (state && state.ok) {
      router.push("/");
      loadUser();
    }
  }, [state, router]);

  React.useEffect(() => {
    if (state && state.error) {
      toast.error(state.error);
    }
  }, [state]);

  React.useEffect(() => {
    let cancelled = false;

    async function checkCpa() {
      try {
        const { url, options } = CPA_STATUS_GET();
        const res = await fetch(url, options);
        const json = await res.json();
        if (!cancelled) setCpaActive(Boolean(json.underCpa));
      } catch {
        if (!cancelled) setCpaActive(false);
      }
    }

    checkCpa();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={styles.loginWrapper}>
      <div className={styles.header}>
        <h1>Acesso</h1>
        <p>
          Entre com seu usuario e senha do{" "}
          <Link href="https://alunos.cefet-rj.br" target="_blank">
            Portal do Aluno
          </Link>
        </p>
      </div>

      {cpaActive && (
        <div className={styles.cpaNotice} role="alert">
          O login esta temporariamente indisponivel durante o periodo de CPA do
          CEFET/RJ. Tente novamente em alguns dias.
        </div>
      )}

      <form action={action}>
        <label htmlFor="username">
          Usuario:
          <input
            type="text"
            name="username"
            id="username"
            required
            disabled={cpaActive || undefined}
          />
        </label>

        <label htmlFor="password">
          Senha:
          <PasswordInput
            name="password"
            id="password"
            required
            disabled={cpaActive || undefined}
          />
        </label>

        <p>
          Esqueceu a senha?{" "}
          <Link
            href="https://alunos.cefet-rj.br/usuario/publico/usuario/recuperacaosenha.action"
            target="_blank"
          >
            Recuperar agora.
          </Link>
        </p>

        <SubmitButton disabled={cpaActive || undefined}>Entrar</SubmitButton>
      </form>
    </div>
  );
}
