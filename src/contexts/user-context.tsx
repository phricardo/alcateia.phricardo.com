"use client";

import React from "react";
import { USER_GET } from "@/functions/api";
import { IAuthenticatedUser } from "@/@types/authUser.type";

type FetchUserResult = {
  user: IAuthenticatedUser | null;
  unauthorized: boolean;
};

export type IUserContext = {
  user: IAuthenticatedUser | null;
  isLoading: boolean;
  setUser: (user: IAuthenticatedUser | null) => void;
};

const initialUserContextValue: IUserContext = {
  user: null,
  isLoading: false,
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

let setUserStateGlobal: React.Dispatch<
  React.SetStateAction<IAuthenticatedUser | null>
>;
let setIsLoadingGlobal: React.Dispatch<React.SetStateAction<boolean>>;

export async function loadUser() {
  if (setIsLoadingGlobal && setUserStateGlobal) {
    setIsLoadingGlobal(true);

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
        setUserStateGlobal(null);
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

  setUserStateGlobal = setUserState;
  setIsLoadingGlobal = setIsLoading;

  const setUser = (user: IAuthenticatedUser | null) => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
    setUserState(user);
  };

  React.useEffect(() => {
    loadUser();
  }, []);

  return (
    <UserContext.Provider value={{ isLoading, user, setUser }}>
      {children}
    </UserContext.Provider>
  );
}
