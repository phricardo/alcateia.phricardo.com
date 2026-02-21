import axios from "axios";
import { NextResponse } from "next/server";
import { BASE_URL } from "@/app/api/utils/links.util";

const CPA_ORIGIN = "https://cpa.cefet-rj.br";

function isCpaRedirect(location: string | undefined): boolean {
  if (!location) return false;
  try {
    const resolved = new URL(location, BASE_URL);
    return resolved.origin === CPA_ORIGIN;
  } catch {
    return false;
  }
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
      { status: 400 },
    );
  }
}
