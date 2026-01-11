import axios from "axios";
import { NextRequest, NextResponse } from "next/server";
import tough from "tough-cookie";
import { wrapper } from "axios-cookiejar-support";
import cheerio from "cheerio";
import { BASE_URL } from "@/app/api/utils/links.util";

const CPA_ORIGIN = "https://cpa.cefet-rj.br";
const CPA_FORM_URL = `${CPA_ORIGIN}/aluno/`;
const CPA_MANUAL_MESSAGE =
  "Acesse o sistema do CPA, preencha o formulario e volte para continuar.";

function isCpaRedirect(location: string | undefined): boolean {
  if (!location) return false;
  try {
    const resolved = new URL(location, BASE_URL);
    return resolved.origin === CPA_ORIGIN;
  } catch {
    return false;
  }
}

function getCookieValue(jar: tough.CookieJar, key: string): string | undefined {
  return jar
    .getCookiesSync(CPA_ORIGIN)
    .find((cookie) => cookie.key.toLowerCase() === key.toLowerCase())?.value;
}

function extractHereLink(html: string): string | null {
  const $ = cheerio.load(html);
  let found: string | null = null;

  $("a").each((_, el) => {
    const text = $(el).text().trim().toLowerCase();
    if (text.includes("aqui")) {
      const href = $(el).attr("href");
      if (href) {
        try {
          found = new URL(href, CPA_ORIGIN).toString();
        } catch {
          found = href;
        }
        return false;
      }
    }
  });

  return found;
}

export async function GET() {
  try {
    const res = await axios.get(`${BASE_URL}/aluno/index.action`, {
      maxRedirects: 0,
      validateStatus: (s) => s >= 200 && s < 400,
    });

    const location = res.headers?.location as string | undefined;
    const underCpa = isCpaRedirect(location);

    return NextResponse.json({ underCpa }, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json(
      { underCpa: false, error: "Falha ao verificar CPA." },
      { status: 400 }
    );
  }
}

// LOGIN ABAIXO COM CPA
export async function POST(request: NextRequest) {
  try {
    const { cpf } = await request.json();

    if (!cpf) {
      return NextResponse.json(
        {
          error: "Informe o CPF para validar o CPA.",
          cpaUrl: CPA_FORM_URL,
          message: CPA_MANUAL_MESSAGE,
        },
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

    // 1) Captura o csrftoken no cookie.
    await client.get(`${CPA_ORIGIN}/aluno/`, {
      headers: {
        Referer: `${CPA_ORIGIN}/aluno/`,
        Origin: CPA_ORIGIN,
      },
    });

    const csrfToken = getCookieValue(cookieJar, "csrftoken");

    if (!csrfToken) {
      return NextResponse.json(
        {
          error: "Nao foi possivel obter o token do CPA.",
          cpaUrl: CPA_FORM_URL,
          message: CPA_MANUAL_MESSAGE,
        },
        { status: 400 }
      );
    }

    // 2) Envia o CPF para /aluno/validar/.
    const formData = new URLSearchParams();
    formData.set("csrfmiddlewaretoken", csrfToken);
    formData.set("cpf", cpf);

    const validarResponse = await client.post(
      `${CPA_ORIGIN}/aluno/validar/`,
      formData.toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Origin: CPA_ORIGIN,
          Referer: `${CPA_ORIGIN}/aluno/`,
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      }
    );

    const html =
      typeof validarResponse.data === "string" ? validarResponse.data : "";

    const link = extractHereLink(html);

    if (!link) {
      return NextResponse.json(
        {
          error: "Nao foi possivel capturar o link do CPA.",
          cpaUrl: CPA_FORM_URL,
          message: CPA_MANUAL_MESSAGE,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ link }, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Tente novamente mais tarde.";

    return NextResponse.json(
      { error: message, cpaUrl: CPA_FORM_URL, message: CPA_MANUAL_MESSAGE },
      { status: 400 }
    );
  }
}
