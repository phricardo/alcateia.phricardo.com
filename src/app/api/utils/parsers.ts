import * as cheerio from "cheerio";

function clean(v?: string | null) {
    return (v ?? "").replace(/\s+/g, " ").trim();
}

function normalizeLabel(v: string) {
    return clean(v)
        .replace(/\s+/g, " ")
        .replace(/:$/, "")
        .toLowerCase();
}

function getValueFromTd($: cheerio.CheerioAPI, td: cheerio.Element) {
    const clone = $(td).clone();
    clone.find("span.label").remove();
    return clean(clone.text());
}

export function parseReports(html: string) {
    const $ = cheerio.load(html);

    const result: {
        courseLabel: string | null;
        currentPeriod: string | null;
    } = {
        courseLabel: null,
        currentPeriod: null,
    };

    // Pega os 4 tds do topo
    const tds = $("div.topopage table.table-topo td").toArray();

    for (const td of tds) {
        const label = normalizeLabel($(td).find("span.label").first().text());
        const value = getValueFromTd($, td);

        if (!value) continue;

        else if (label === "curso") result.courseLabel = value; // NF - BACHARELADO...
        else if (label.includes("período atual")) result.currentPeriod = value; // 5
    }

    return result;
}

function pickFirst(...vals: Array<string | null | undefined>) {
    for (const v of vals) {
        const c = clean(v);
        if (c) return c;
    }
    return null;
}

export function parseIndex(html: string) {
    const $ = cheerio.load(html);

    // Nome (botão no menu)
    const name =
        pickFirst(
            $("#menu .ui-button-text").text(),
            $("button .ui-button-text").first().text(),
            $("#menu button").text()
        ) ?? null;

    // Matrícula numérica (input hidden)
    const studentId =
        pickFirst(
            $("#matricula").attr("value"),
            $("input#matricula").val() as any
        ) ?? null;

    // Data do portal (opcional)
    const portalDateLabel =
        pickFirst($("span.menudate").text()) ?? null;

    // Base path/context (opcional)
    const hasAlunoContext = html.includes("/aluno/");

    return {
        name,
        studentId,
        portalDateLabel,
        hasAlunoContext,
    };
}

export function parseProfile(html: string) {
    const $ = cheerio.load(html);

    // Tentativas comuns (ajuste conforme o HTML real do perfil)
    const cpf =
        pickFirst(
            $("#cpf").text(),
            $("#cpf").attr("value"),
            $('input[name="cpf"]').attr("value"),
            $('span:contains("CPF")').next().text()
        ) ?? null;

    const enrollment =
        pickFirst(
            $("#matriculaInstitucional").text(),
            $('span:contains("Matrícula")').next().text()
        ) ?? null;

    const course =
        pickFirst(
            $("#curso").text(),
            $('span:contains("Curso")').next().text()
        ) ?? null;

    const campus =
        pickFirst(
            $("#unidade").text(),
            $('span:contains("Unidade")').next().text(),
            $('span:contains("Campus")').next().text()
        ) ?? null;

    const currentPeriod =
        pickFirst(
            $("#periodoAtual").text(),
            $('span:contains("Período")').next().text()
        ) ?? null;

    return {
        cpf,
        enrollment,
        course,
        campus,
        currentPeriod,
    };
}

export function resolveCefetCampus(courseLabel?: string | null) {
    if (!courseLabel) return null;

    // pega a sigla antes do "-"
    const sigla = courseLabel.split("-")[0].trim().toUpperCase();

    const CAMPUS_MAP: Record<string, string> = {
        // UNEDs
        NF: "UNED Nova Friburgo",
        NI: "UNED Nova Iguaçu",
        PE: "UNED Petrópolis",
        IT: "UNED Itaguaí",
        VP: "UNED Valença",

        // Campi principais
        RJ: "Maracanã (Rio de Janeiro)",
        MA: "Maracanã (Rio de Janeiro)", // alguns cursos usam MA
        MT: "Maria da Graça",

        // casos extras possíveis (fallback histórico)
        AD: "Angra dos Reis",
    };

    return CAMPUS_MAP[sigla] ?? sigla;
}

type EnrollmentCertificateDiscipline = {
    code: string;
    classGroup: string;
    courseCode: string;
    name: string;
    credits: number | null;
    workloadHours: number | null;
};

type EnrollmentCertificateData = {
    studentRegistration: string | null;
    studentName: string | null;
    semesterLabel: string | null;
    courseLabel: string | null;
    courseVersion: string | null;
    authenticationCode: string | null;
    authenticationUrl: string | null;
    validityDays: number | null;
    issuedAt: string | null;
    totalCredits: number | null;
    totalWorkloadHours: number | null;
    disciplines: EnrollmentCertificateDiscipline[];
};

function toNullableNumber(v?: string | null) {
    const cleaned = clean(v);
    if (!cleaned) return null;

    const parsed = Number(cleaned.replace(/[^\d]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
}

export function parseEnrollmentCertificateText(text: string): EnrollmentCertificateData {
    const normalizedText = text.replace(/\r/g, "");
    const lines = normalizedText
        .split("\n")
        .map((line) => clean(line))
        .filter(Boolean);

    const result: EnrollmentCertificateData = {
        studentRegistration: null,
        studentName: null,
        semesterLabel: null,
        courseLabel: null,
        courseVersion: null,
        authenticationCode: null,
        authenticationUrl: null,
        validityDays: null,
        issuedAt: null,
        totalCredits: null,
        totalWorkloadHours: null,
        disciplines: [],
    };

    for (const line of lines) {
        if (!result.authenticationCode) {
            const match = line.match(/Autentica(?:ç|c)[aã]o\s*:\s*([A-Z0-9.]+)/i);
            if (match?.[1]) result.authenticationCode = clean(match[1]);
        }

        if (!result.authenticationUrl) {
            const match = line.match(/Consultar em\s*:\s*(https?:\/\/\S+)/i);
            if (match?.[1]) result.authenticationUrl = clean(match[1]);
        }

        if (result.validityDays == null) {
            const match = line.match(/Validade\s*:\s*(\d+)\s*dia/i);
            if (match?.[1]) result.validityDays = Number(match[1]);
        }

        if (!result.issuedAt) {
            const match = line.match(/Realiza(?:ç|c)[aã]o e\/ou [ÚU]ltima Inclus[aã]o em\s*(\d{2}\/\d{2}\/\d{4})/i);
            if (match?.[1]) result.issuedAt = match[1];
        }

        if (!result.studentRegistration || !result.studentName) {
            const match = line.match(/Aluno\s*:\s*([A-Z0-9]+)\s*-\s*(.+?)(?:\s+Per[íi]odo\s*:|$)/i);
            if (match) {
                result.studentRegistration = clean(match[1]);
                result.studentName = clean(match[2]);
            }
        }

        if (!result.semesterLabel) {
            const match = line.match(/Per[íi]odo\s*:\s*(.+)$/i);
            if (match?.[1]) result.semesterLabel = clean(match[1]);
        }

        if (!result.courseLabel) {
            const match = line.match(/Curso\s*:\s*(.+?)(?:\s+Vers[aã]o\s*:|$)/i);
            if (match?.[1]) result.courseLabel = clean(match[1]);
        }

        if (!result.courseVersion) {
            const match = line.match(/Vers[aã]o\s*:\s*([A-Z0-9.\-]+)/i);
            if (match?.[1]) result.courseVersion = clean(match[1]);
        }

        if (result.totalCredits == null || result.totalWorkloadHours == null) {
            const match = line.match(/Total de Cr[ée]ditos e Carga Hor[aá]ria\s*:\s*(\d+)\s+(\d+)/i);
            if (match) {
                result.totalCredits = Number(match[1]);
                result.totalWorkloadHours = Number(match[2]);
            }
        }

        const rowMatch = line.match(
            /^([A-Z]{3,}\d{3,}[A-Z]{1,})\s+(.+?)\s+([A-Z]{3,}\w*)\s+(.+?)\s+(\d+)\s+(\d+)$/
        );

        if (rowMatch) {
            const [, code, classGroup, courseCode, disciplineName, credits, workloadHours] = rowMatch;

            result.disciplines.push({
                code: clean(code),
                classGroup: clean(classGroup),
                courseCode: clean(courseCode),
                name: clean(disciplineName),
                credits: toNullableNumber(credits),
                workloadHours: toNullableNumber(workloadHours),
            });
        }
    }

    return result;
}
