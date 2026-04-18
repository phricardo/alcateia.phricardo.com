declare module "html2pdf.js" {
  type Html2PdfInstance = {
    set: (options: Record<string, unknown>) => Html2PdfInstance;
    from: (element: HTMLElement) => Html2PdfInstance;
    save: () => Promise<void>;
  };

  export default function html2pdf(): Html2PdfInstance;
}
