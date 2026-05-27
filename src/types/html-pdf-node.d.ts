declare module 'html-pdf-node' {
  export type PdfFile = {
    content: string
  }

  export type PdfOptions = {
    format?: string
    margin?: Record<string, string>
    printBackground?: boolean
  }

  export function generatePdf(file: PdfFile, options?: PdfOptions): Promise<Buffer>
}
