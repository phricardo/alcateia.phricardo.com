import axios from "axios";
import tough from "tough-cookie";
import { wrapper } from "axios-cookiejar-support";
import { NextRequest, NextResponse } from "next/server";
import { BASE_URL, extractPnotifyText } from "@/app/api/utils/links.util";

const MAX_RETRIES = 2;

const CPA_BLOCK_MESSAGE =
  "Login temporariamente indisponível devido ao período de CPA. Tente novamente em alguns dias.";

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
    const status = message === CPA_BLOCK_MESSAGE ? 503 : 400;

    return NextResponse.json({ error: message }, { status });
  }
}
