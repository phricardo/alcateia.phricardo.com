"use client";

import React from "react";
import { useFormState } from "react-dom";
import LogoutAction from "@/actions/logout.action";
import { UserContext } from "@/contexts/user-context";
import { SignOut } from "@phosphor-icons/react";
import SubmitButton from "./SubmitButton";

export default function LogoutButton() {
  const { setUser } = React.useContext(UserContext);
  const [state, action] = useFormState(LogoutAction, {
    ok: false,
    error: "",
    data: null,
  });

  React.useEffect(() => {
    const domLoaded = typeof window !== "undefined";
    if (state.ok && domLoaded) {
      setUser(null);
      window.location.reload();
    }
  }, [state, setUser]);

  return (
    <form action={action}>
      <SubmitButton>
        <SignOut /> Sair
      </SubmitButton>
    </form>
  );
}
