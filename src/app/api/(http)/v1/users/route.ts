import axios from "axios";
import { NextRequest, NextResponse } from "next/server";
import {
  parseIndex,
  parseProfile,
  parseReports,
  resolveCefetCampus,
} from "@/app/api/utils/parsers";

const BASE_URL = "https://alunos.cefet-rj.br";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("CEFETID_SSO");
    if (!token) throw new Error("CEFETID_SSO Cookie not found");

    const cookieHeader = `JSESSIONIDSSO=${token.value}`;

    const indexResponse = await axios.get(`${BASE_URL}/aluno/index.action`, {
      headers: { Cookie: cookieHeader },
    });

    const profileResponse = await axios.get(
      `${BASE_URL}/aluno/aluno/perfil/perfil.action`,
      { headers: { Cookie: cookieHeader } },
    );

    const indexData = parseIndex(indexResponse.data);
    const profileData = parseProfile(profileResponse.data);

    const reportsResponse = await axios.get(
      `${BASE_URL}/aluno/aluno/relatorio/relatorios.action?matricula=${indexData.studentId}`,
      { headers: { Cookie: cookieHeader } },
    );

    const reportsData = parseReports(reportsResponse.data);

    return NextResponse.json(
      {
        user: {
          name: indexData.name ?? "Não encontrado",
          studentId: indexData.studentId,
          studentPublicId: "Não encontrado",
          document: {
            type: "NATURAL_PERSON",
            id: profileData.cpf,
          },
          course: reportsData.courseLabel,
          currentPeriod: reportsData.currentPeriod,
          campus: resolveCefetCampus(reportsData.courseLabel),
          reportsData,
        },
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Tente novamente mais tarde.",
      },
      { status: 400 },
    );
  }
}
