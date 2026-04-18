declare module "pdf-parse/lib/pdf-parse" {
  type PDFParseResult = {
    text: string;
    numpages: number;
    numrender: number;
    info?: Record<string, unknown>;
    metadata?: unknown;
    version?: string;
  };

  export default function pdfParse(
    dataBuffer: Buffer,
    options?: Record<string, unknown>
  ): Promise<PDFParseResult>;
}
