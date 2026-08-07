import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type CefetStatus = "online" | "parcial" | "offline";

const TIMEOUT_MS = 5000;
const CACHE_CONTROL = "no-store, no-cache, max-age=0, must-revalidate";
const CPA_ORIGIN = "https://cpa.cefet-rj.br";

const HTML_FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

const MAIN_SITE_PATTERNS = [
  /CEFET\s*\/\s*RJ/i,
  /Centro\s+Federal/i,
  /Celso\s+Suckow/i,
];

const ALUNOS_SITE_PATTERNS = [
  /j_security_check/i,
  /j_username/i,
  /Portal\s+do\s+Aluno/i,
];

function jsonStatusResponse({
  status,
  mainOK,
  alunosOK,
  underCpa,
}: {
  status: CefetStatus;
  mainOK: boolean;
  alunosOK: boolean;
  underCpa: boolean;
}) {
  const response = NextResponse.json({
    status,
    checkedAt: new Date().toISOString(),
    checks: {
      main: mainOK,
      alunos: alunosOK,
    },
    underCpa,
  });

  response.headers.set("Cache-Control", CACHE_CONTROL);

  return response;
}

function hasOrigin(url: string, origin: string): boolean {
  try {
    return new URL(url).origin === origin;
  } catch {
    return false;
  }
}

export async function GET() {
  const fetchWithTimeout = (
    url: string,
    expectedPatterns: RegExp[],
    acceptedRedirectOrigin?: string,
  ): Promise<{ ok: boolean; underCpa: boolean }> => {
    return new Promise((resolve) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), TIMEOUT_MS);

      fetch(url, {
        signal: controller.signal,
        cache: "no-store",
        redirect: "follow",
        headers: HTML_FETCH_HEADERS,
      })
        .then(async (res) => {
          if (!res.ok) {
            resolve({ ok: false, underCpa: false });
            return;
          }

          const html = await res.text();
          const hasContent = html.trim().length > 0;
          const hasExpectedContent = expectedPatterns.some((pattern) =>
            pattern.test(html)
          );
          const isAcceptedRedirect =
            acceptedRedirectOrigin !== undefined &&
            hasOrigin(res.url, acceptedRedirectOrigin);

          resolve({
            ok: hasContent && (hasExpectedContent || isAcceptedRedirect),
            underCpa: isAcceptedRedirect,
          });
        })
        .catch(() => {
          resolve({ ok: false, underCpa: false });
        })
        .finally(() => {
          clearTimeout(id);
        });
    });
  };

  const [mainResult, alunosResult] = await Promise.all([
    fetchWithTimeout("https://www.cefet-rj.br/", MAIN_SITE_PATTERNS),
    fetchWithTimeout(
      "https://alunos.cefet-rj.br/aluno/login.action?error=",
      ALUNOS_SITE_PATTERNS,
      CPA_ORIGIN,
    ),
  ]);
  const mainOK = mainResult.ok;
  const alunosOK = alunosResult.ok;
  const underCpa = alunosResult.underCpa;

  if (mainOK && alunosOK) {
    return jsonStatusResponse({ status: "online", mainOK, alunosOK, underCpa });
  }

  if (mainOK || alunosOK) {
    return jsonStatusResponse({ status: "parcial", mainOK, alunosOK, underCpa });
  }

  return jsonStatusResponse({ status: "offline", mainOK, alunosOK, underCpa });
}
