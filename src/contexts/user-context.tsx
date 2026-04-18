"use client";

import React from "react";
import { USER_GET } from "@/functions/api";
import { IAuthenticatedUser } from "@/@types/authUser.type";
import {
  StudentCardData,
  clearStoredStudentCard,
  readStoredStudentCard,
  writeStoredStudentCard,
} from "@/functions/student-card-storage";

type FetchUserResult = {
  user: IAuthenticatedUser | null;
  unauthorized: boolean;
};

export type IUserContext = {
  user: IAuthenticatedUser | null;
  isLoading: boolean;
  hasStudentCard: boolean;
  studentCard: StudentCardData | null;
  setUser: (user: IAuthenticatedUser | null) => void;
};

const initialUserContextValue: IUserContext = {
  user: null,
  isLoading: false,
  hasStudentCard: false,
  studentCard: null,
  setUser: () => {},
};

export const UserContext = React.createContext<IUserContext>(
  initialUserContextValue
);

async function fetchUser(): Promise<FetchUserResult> {
  try {
    const { url, options } = USER_GET();
    const response = await fetch(url, options);

    if (response.status === 401 || response.status === 403) {
      return {
        user: null,
        unauthorized: true,
      };
    }

    if (!response.ok) {
      return {
        user: null,
        unauthorized: false,
      };
    }

    const json = await response.json();
    const user = json?.user ?? null;

    return {
      user,
      unauthorized: !user,
    };
  } catch {
    return {
      user: null,
      unauthorized: false,
    };
  }
}

async function fetchStudentCard(): Promise<StudentCardData | null> {
  try {
    const response = await fetch("/api/v1/student-card", {
      credentials: "include",
      cache: "no-store",
    });

    if (!response.ok) return null;

    const json = (await response.json()) as StudentCardData;

    if (!json?.studentId) return null;

    writeStoredStudentCard(json);
    return json;
  } catch {
    return null;
  }
}

let setUserStateGlobal: React.Dispatch<
  React.SetStateAction<IAuthenticatedUser | null>
>;
let setIsLoadingGlobal: React.Dispatch<React.SetStateAction<boolean>>;
let setStudentCardGlobal: React.Dispatch<
  React.SetStateAction<StudentCardData | null>
>;
let setHasStudentCardGlobal: React.Dispatch<React.SetStateAction<boolean>>;

export async function loadUser() {
  if (
    setIsLoadingGlobal &&
    setUserStateGlobal &&
    setStudentCardGlobal &&
    setHasStudentCardGlobal
  ) {
    setIsLoadingGlobal(true);

    const cachedCard = readStoredStudentCard();
    setStudentCardGlobal(cachedCard);
    setHasStudentCardGlobal(Boolean(cachedCard));

    let cachedUser: IAuthenticatedUser | null = null;
    const local = localStorage.getItem("user");
    if (local) {
      try {
        cachedUser = JSON.parse(local) as IAuthenticatedUser;
        setUserStateGlobal(cachedUser);
      } catch {
        localStorage.removeItem("user");
        setUserStateGlobal(null);
      }
    } else {
      setUserStateGlobal(null);
    }

    try {
      const { user, unauthorized } = await fetchUser();

      if (unauthorized) {
        localStorage.removeItem("user");
        clearStoredStudentCard();
        setUserStateGlobal(null);
        setStudentCardGlobal(null);
        setHasStudentCardGlobal(false);
        return;
      }

      if (user) {
        localStorage.setItem("user", JSON.stringify(user));
        setUserStateGlobal(user);
      }
    } finally {
      setIsLoadingGlobal(false);
    }
  }
}

export function UserContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isLoading, setIsLoading] = React.useState(true);
  const [user, setUserState] = React.useState<IAuthenticatedUser | null>(null);
  const [studentCard, setStudentCard] = React.useState<StudentCardData | null>(
    null
  );
  const [hasStudentCard, setHasStudentCard] = React.useState(false);

  setUserStateGlobal = setUserState;
  setIsLoadingGlobal = setIsLoading;
  setStudentCardGlobal = setStudentCard;
  setHasStudentCardGlobal = setHasStudentCard;

  const setUser = (user: IAuthenticatedUser | null) => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
      clearStoredStudentCard();
      setStudentCard(null);
      setHasStudentCard(false);
    }
    setUserState(user);
  };

  React.useEffect(() => {
    loadUser();
  }, []);

  React.useEffect(() => {
    if (isLoading || !user) return;

    const cachedCard = readStoredStudentCard();
    if (cachedCard) {
      setStudentCard(cachedCard);
      setHasStudentCard(true);
      return;
    }

    let cancelled = false;

    startTransition(() => {
      fetchStudentCard().then((card) => {
        if (cancelled || !card) return;
        setStudentCard(card);
        setHasStudentCard(true);
      });
    });

    return () => {
      cancelled = true;
    };
  }, [isLoading, user]);

  return (
    <UserContext.Provider
      value={{ isLoading, user, hasStudentCard, studentCard, setUser }}
    >
      {children}
    </UserContext.Provider>
  );
}

function startTransition(callback: () => void) {
  React.startTransition(callback);
}
