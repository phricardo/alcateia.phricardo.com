"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormState } from "react-dom";
import { WarningCircle } from "@phosphor-icons/react";
import SubmitButton from "@/components/Button/SubmitButton";
import styles from "./LoginPage.module.css";
import PasswordInput from "@/components/PasswordInput/PasswordInput";
import LoginAction from "@/actions/login.action";
import toast from "react-hot-toast";
import { loadUser } from "@/contexts/user-context";
import { CPA_STATUS_GET } from "@/functions/api";
import { useCefetStatus } from "@/hooks/useCefetStatus";

export default function LoginPage() {
  const router = useRouter();
  const [state, action] = useFormState(LoginAction, {
    ok: false,
    error: null,
    data: null,
  });
  const [cpaActive, setCpaActive] = React.useState<boolean | null>(null);
  const { checks, isChecking: isCefetChecking, refresh } = useCefetStatus();
  const isPortalUnavailable = !isCefetChecking && checks.alunos !== true;
  const isLoginDisabled = isCefetChecking || checks.alunos !== true;

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

    if (checks.alunos !== true) {
      setCpaActive(null);
      return;
    }

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
  }, [checks.alunos]);

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
          <span>
            O Portal do Aluno está redirecionando o acesso para a CPA. Por isso,
            o Alcateia pode não conseguir concluir o login neste momento.
          </span>
          <Link
            href="https://alunos.cefet-rj.br/aluno/login.action"
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir Portal do Aluno
          </Link>
        </div>
      )}

      {!cpaActive && isCefetChecking && (
        <div
          className={`${styles.statusNotice} ${styles.checkingNotice}`}
          role="status"
        >
          <WarningCircle weight="duotone" />
          <span>
            Estamos verificando a conexão com o Portal do Aluno do Cefet/RJ. O
            login será liberado assim que o sistema responder.
          </span>
        </div>
      )}

      {!cpaActive && isPortalUnavailable && (
        <div
          className={`${styles.statusNotice} ${styles.offlineNotice}`}
          role="alert"
        >
          <WarningCircle weight="duotone" />
          <span>
            Não estamos conseguindo conectar ao Portal do Aluno do Cefet/RJ. O
            login ficará indisponível até o sistema voltar.
          </span>
          <button
            type="button"
            className={styles.retryButton}
            onClick={() => refresh()}
            disabled={isCefetChecking}
          >
            Tentar novamente
          </button>
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
            disabled={isLoginDisabled || undefined}
          />
        </label>

        <label htmlFor="password">
          Senha:
          <PasswordInput
            name="password"
            id="password"
            required
            disabled={isLoginDisabled || undefined}
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

        <SubmitButton disabled={isLoginDisabled || undefined}>
          Entrar
        </SubmitButton>
      </form>
    </div>
  );
}
