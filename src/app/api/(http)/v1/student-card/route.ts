import axios from "axios";
import { NextRequest, NextResponse } from "next/server";
import pdfParse from "pdf-parse/lib/pdf-parse";
import {
  parseEnrollmentCertificateText,
  parseIndex,
  parseReports,
} from "@/app/api/utils/parsers";

const BASE_URL = "https://alunos.cefet-rj.br";

function compactObject<T extends Record<string, unknown>>(obj: T) {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== null && value !== undefined)
  );
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("CEFETID_SSO");

    if (!token?.value) {
      return NextResponse.json(
        { error: "CEFETID_SSO Cookie not found" },
        { status: 401 }
      );
    }

    const cookieHeader = `JSESSIONIDSSO=${token.value}`;

    const indexResponse = await axios.get(`${BASE_URL}/aluno/index.action`, {
      headers: { Cookie: cookieHeader },
    });

    const indexData = parseIndex(indexResponse.data);

    if (!indexData.studentId) {
      return NextResponse.json(
        { error: "Unable to resolve student enrollment" },
        { status: 401 }
      );
    }

    const reportsResponse = await axios.get(
      `${BASE_URL}/aluno/aluno/relatorio/relatorios.action?matricula=${indexData.studentId}`,
      { headers: { Cookie: cookieHeader } }
    );

    const certificateResponse = await axios.get(
      `${BASE_URL}/aluno/aluno/relatorio/com/comprovanteMatricula.action?matricula=${indexData.studentId}`,
      {
        headers: { Cookie: cookieHeader },
        responseType: "arraybuffer",
      }
    );

    const reportsData = parseReports(reportsResponse.data);
    const certificateData = parseEnrollmentCertificateText(
      (await pdfParse(Buffer.from(certificateResponse.data))).text
    );

    const payload = compactObject({
      studentId: indexData.studentId,
      name: certificateData.studentName ?? indexData.name,
      studentRegistration: certificateData.studentRegistration,
      semesterLabel: certificateData.semesterLabel,
      currentPeriod: reportsData.currentPeriod,
      courseLabel: certificateData.courseLabel ?? reportsData.courseLabel ?? null,
      courseVersion: certificateData.courseVersion,
      authenticationCode: certificateData.authenticationCode,
      authenticationUrl: certificateData.authenticationUrl,
      validityDays: certificateData.validityDays,
      totalCredits: certificateData.totalCredits,
      totalWorkloadHours: certificateData.totalWorkloadHours,
    });

    return NextResponse.json(payload, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Tente novamente mais tarde.",
      },
      { status: 400 }
    );
  }
}
