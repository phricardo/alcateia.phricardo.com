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

const LOGIN_BLOCKED = true;

const LOGIN_BLOCKED_MESSAGE =
  "O Portal do Aluno foi atualizado recentemente e algumas informações agora são carregadas dinamicamente. Estamos ajustando a integração para restabelecer o acesso à matrícula o mais rápido possível.";

export default function LoginPage() {
  const router = useRouter();
  const [state, action] = useFormState(LoginAction, {
    ok: false,
    error: null,
    data: null,
  });

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

      {LOGIN_BLOCKED && (
        <div className={styles.cpaNotice} role="alert">
          {LOGIN_BLOCKED_MESSAGE}
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
            disabled={LOGIN_BLOCKED || undefined}
          />
        </label>

        <label htmlFor="password">
          Senha:
          <PasswordInput
            name="password"
            id="password"
            required
            disabled={LOGIN_BLOCKED || undefined}
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

        <SubmitButton disabled={LOGIN_BLOCKED || undefined}>Entrar</SubmitButton>
      </form>
    </div>
  );
}
