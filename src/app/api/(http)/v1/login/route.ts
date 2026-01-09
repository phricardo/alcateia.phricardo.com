import axios from "axios";
import tough from "tough-cookie";
import { wrapper } from "axios-cookiejar-support";
import { NextRequest, NextResponse } from "next/server";
import {
  BASE_URL,
  capitalizeName,
  extractPnotifyText,
  extractUser,
} from "@/app/api/utils/links.util";

const MAX_RETRIES = 2;
const CPA_BLOCK_MESSAGE =
  "Login temporariamente indisponível devido ao período de CPA. Tente novamente em alguns dias.";

function isCpaUrl(url: string) {
  return url.startsWith("https://cpa.cefet-rj.br/");
}

async function fetchIndexOrThrowCPA(
  client: ReturnType<typeof wrapper>,
  urlToOpen: string
) {
  const res = await client.get(urlToOpen, {
    maxRedirects: 0,
    validateStatus: (s) => s >= 200 && s < 400,
  });

  if (res.status < 300 || res.status >= 400) return res;

  const location = (res.headers?.location as string | undefined) ?? "";
  if (!location) return res;

  const redirectUrl = new URL(location, urlToOpen).toString();

  if (isCpaUrl(redirectUrl)) {
    throw new Error(CPA_BLOCK_MESSAGE);
  }

  return client.get(redirectUrl, {
    maxRedirects: 10,
    validateStatus: (s) => s >= 200 && s < 500,
  });
}

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Informe usuário e senha." },
        { status: 400 }
      );
    }

    const cookieJar = new tough.CookieJar();
    const client = wrapper(
      axios.create({
        jar: cookieJar,
        withCredentials: true,
        timeout: 30000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        validateStatus: (s) => s >= 200 && s < 500,
      })
    );

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const response = await client.post(
        `${BASE_URL}/aluno/j_security_check`,
        `j_username=${encodeURIComponent(
          username
        )}&j_password=${encodeURIComponent(password)}`,
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          maxRedirects: 10,
        }
      );

      const pnotifyText = extractPnotifyText(response.data);
      if (pnotifyText) throw new Error(pnotifyText);

      const indexResponse = await fetchIndexOrThrowCPA(
        client,
        `${BASE_URL}/aluno/index.action`
      );

      const cookies = cookieJar.getCookiesSync(`${BASE_URL}/aluno/`);
      const SSO = cookies.find((cookie) => cookie.key === "JSESSIONIDSSO");

      const { name, studentId } = extractUser(indexResponse.data);
      if (!studentId) {
        throw new Error("Falha ao autenticar. Matrícula não encontrada.");
      }

      if (!SSO) {
        if (attempt === MAX_RETRIES) {
          throw new Error("Tente novamente mais tarde.");
        }
        continue;
      }

      const nextResponse = NextResponse.json(
        {
          status: { ok: true },
          student: {
            name: capitalizeName(name),
            studentId,
          },
          cookies: { SSO },
        },
        { status: 200 }
      );

      nextResponse.cookies.set("CEFETID_SSO", SSO.value, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/",
      });

      return nextResponse;
    }

    throw new Error("Tente novamente mais tarde.");
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Tente novamente mais tarde.";
    const status = message === CPA_BLOCK_MESSAGE ? 503 : 400;

    return NextResponse.json({ error: message }, { status });
  }
}
