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