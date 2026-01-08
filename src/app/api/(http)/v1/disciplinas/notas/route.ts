import axios from "axios";
import * as cheerio from "cheerio";
import { NextRequest, NextResponse } from "next/server";
import { BASE_URL, extractUser } from "@/app/api/utils/links.util";

function normalizeText(input?: string) {
  return (input ?? "").replace(/\s+/g, " ").trim();
}

function parseAccordionNotas(html: string) {
  const $ = cheerio.load(html);

  const result: Record<
    string,
    Array<{ disciplina: string; situacao: string; turma: string }>
  > = {};

  // Cada header do accordion
  const headers = $("#accordion h3.ui-accordion-header");

  headers.each((_, h3) => {
    const header = $(h3);

    const semestre = normalizeText(header.find(".accordionTurma").text());
    if (!semestre) return;

    // no HTML: <h3> ... </h3><div> ... </div>
    const panel = header.next();
    if (!panel || panel.length === 0) return;

    const disciplinas: Array<{
      disciplina: string;
      situacao: string;
      turma: string;
    }> = [];

    // linhas da tabela
    panel.find("table.table-turmas tbody tr").each((_, tr) => {
      const tds = $(tr).find("td");
      if (tds.length < 3) return;

      const disciplina = normalizeText($(tds[0]).text());
      const situacao = normalizeText($(tds[1]).text());

      // Turma está no 3º td como <a> ou vazio
      const turma = normalizeText(
        $(tds[2]).find("a").text() || $(tds[2]).text()
      );

      disciplinas.push({ disciplina, situacao, turma });
    });

    result[semestre] = disciplinas;
  });

  return result;
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("CEFETID_SSO");
    if (!token) throw new Error("CEFETID_SSO Cookie not found");

    // 1) Index para pegar matrícula (studentId)
    const indexResponse = await axios.get(`${BASE_URL}/aluno/index.action`, {
      headers: { Cookie: `JSESSIONIDSSO=${token.value}` },
    });

    const { studentId } = extractUser(indexResponse.data);

    // 2) Página de notas (HTML com accordion)
    const notasResponse = await axios.get(
      `${BASE_URL}/aluno/aluno/nota/nota.action?matricula=${studentId}`,
      { headers: { Cookie: `JSESSIONIDSSO=${token.value}` } }
    );

    // 3) Parse do HTML → JSON por semestre
    const semestresJson = parseAccordionNotas(notasResponse.data);

    return NextResponse.json(semestresJson, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erro desconhecido",
        semestres: {},
      },
      { status: 400 }
    );
  }
}
