import axios from "axios";
import tough from "tough-cookie";
import { wrapper } from "axios-cookiejar-support";
import { NextRequest, NextResponse } from "next/server";
import { BASE_URL, extractPnotifyText } from "@/app/api/utils/links.util";
import Logger from "@/app/api/utils/logger.util";
import { CPA_LOGIN_UNAVAILABLE_MESSAGE } from "@/constants/auth";

const MAX_RETRIES = 2;
const CPA_ORIGIN = "https://cpa.cefet-rj.br";
const CPA_REFERER = `${CPA_ORIGIN}/`;
const logger = new Logger();

function isCpaRedirect(location: string | undefined): boolean {
  if (!location) return false;

  try {
    return new URL(location, BASE_URL).origin === CPA_ORIGIN;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Informe usuário e senha." },
        { status: 400 },
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
      }),
    );

    const portalResponse = await client.get(`${BASE_URL}/aluno/`, {
      maxRedirects: 0,
    });

    const wasRedirectedToCpa = isCpaRedirect(
      portalResponse.headers.location as string | undefined,
    );

    if (wasRedirectedToCpa) {
      await client.get(`${BASE_URL}/aluno/`, {
        headers: {
          Referer: CPA_REFERER,
        },
        maxRedirects: 10,
      });
    }

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const response = await client.post(
        `${BASE_URL}/aluno/j_security_check`,
        `j_username=${encodeURIComponent(
          username,
        )}&j_password=${encodeURIComponent(password)}`,
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          maxRedirects: 10,
        },
      );

      const pnotifyText = extractPnotifyText(response.data);
      if (pnotifyText) throw new Error(pnotifyText);

      const cookies = cookieJar.getCookiesSync(`${BASE_URL}/aluno/`);
      const SSO = cookies.find((cookie) => cookie.key === "JSESSIONIDSSO");

      if (!SSO) {
        if (attempt === MAX_RETRIES) {
          if (wasRedirectedToCpa) {
            logger.warning(
              `[Login CPA] Sessão SSO não foi criada após ${MAX_RETRIES} tentativas; retornando erro de CPA ao cliente.`,
            );
            throw new Error(CPA_LOGIN_UNAVAILABLE_MESSAGE);
          }

          throw new Error("Tente novamente mais tarde.");
        }
        continue;
      }
  
      const nextResponse = NextResponse.json(
        {
          status: { ok: true },
          cookies: { SSO },
        },
        { status: 200 },
      );

      return nextResponse;
    }

    throw new Error("Tente novamente mais tarde.");
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Tente novamente mais tarde.";
    const status = message === CPA_LOGIN_UNAVAILABLE_MESSAGE ? 503 : 400;

    return NextResponse.json({ error: message }, { status });
  }
}
