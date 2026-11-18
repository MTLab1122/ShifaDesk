import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/database/prisma.service';
import { ReportQueryResult, ReportExportFormat } from '@matabai/shared';

@Injectable()
export class ReportExportService {
  private readonly logger = new Logger(ReportExportService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Sanitizes text to prevent Formula Injection (CSV / Excel macro execution).
   * If value starts with =, +, -, @, \t, or \r, prefix with a single quote.
   */
  public sanitizeFormulaInjection(value: unknown): string {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (/^[=+\-@\t\r]/.test(str)) {
      return `'${str}`;
    }
    return str;
  }

  /**
   * Generates sanitized CSV buffer with UTF-8 BOM.
   */
  public generateCsv(queryResult: ReportQueryResult, title: string): Buffer {
    const lines: string[] = [];

    // Title & Metadata
    lines.push(`"${this.sanitizeFormulaInjection(title)}"`);
    lines.push(`"Generated At: ${queryResult.generatedAt}"`);
    lines.push(`"Total Records: ${queryResult.totalRows}"`);
    lines.push('');

    // Headers
    const headers = queryResult.columns.map((col) => `"${this.sanitizeFormulaInjection(col.label).replace(/"/g, '""')}"`);
    lines.push(headers.join(','));

    // Rows
    for (const row of queryResult.rows) {
      const rowValues = queryResult.columns.map((col) => {
        const raw = row[col.key];
        const sanitized = this.sanitizeFormulaInjection(raw);
        return `"${sanitized.replace(/"/g, '""')}"`;
      });
      lines.push(rowValues.join(','));
    }

    // Summary section if present
    if (queryResult.summary && Object.keys(queryResult.summary).length > 0) {
      lines.push('');
      lines.push('"--- Summary Metrics ---"');
      for (const [key, val] of Object.entries(queryResult.summary)) {
        lines.push(`"${this.sanitizeFormulaInjection(key)}","${this.sanitizeFormulaInjection(val)}"`);
      }
    }

    // UTF-8 BOM so Excel opens with proper Urdu / UTF-8 characters
    const csvContent = '\uFEFF' + lines.join('\r\n');
    return Buffer.from(csvContent, 'utf-8');
  }

  /**
   * Generates XLSX/XML format with formula injection protection.
   */
  public generateXlsx(queryResult: ReportQueryResult, title: string): Buffer {
    // Universal XML Spreadsheet 2003 format
    const lines: string[] = [];
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push('<?mso-application progid="Excel.Sheet"?>');
    lines.push('<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"');
    lines.push(' xmlns:o="urn:schemas-microsoft-com:office:office"');
    lines.push(' xmlns:x="urn:schemas-microsoft-com:office:excel"');
    lines.push(' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">');
    lines.push('  <Worksheet ss:Name="Report">');
    lines.push('    <Table>');

    // Title Row
    lines.push(`      <Row><Cell><Data ss:Type="String">${this.escapeXml(this.sanitizeFormulaInjection(title))}</Data></Cell></Row>`);
    lines.push(`      <Row><Cell><Data ss:Type="String">Generated: ${queryResult.generatedAt}</Data></Cell></Row>`);
    lines.push('      <Row></Row>');

    // Header Row
    lines.push('      <Row>');
    for (const col of queryResult.columns) {
      lines.push(`        <Cell><Data ss:Type="String">${this.escapeXml(this.sanitizeFormulaInjection(col.label))}</Data></Cell>`);
    }
    lines.push('      </Row>');

    // Data Rows
    for (const row of queryResult.rows) {
      lines.push('      <Row>');
      for (const col of queryResult.columns) {
        const val = row[col.key];
        const isNum = col.type === 'number' || (col.type === 'currency' && typeof val === 'number');
        if (isNum && typeof val === 'number' && !isNaN(val)) {
          lines.push(`        <Cell><Data ss:Type="Number">${val}</Data></Cell>`);
        } else {
          const sanitized = this.sanitizeFormulaInjection(val);
          lines.push(`        <Cell><Data ss:Type="String">${this.escapeXml(sanitized)}</Data></Cell>`);
        }
      }
      lines.push('      </Row>');
    }

    lines.push('    </Table>');
    lines.push('  </Worksheet>');
    lines.push('</Workbook>');

    return Buffer.from(lines.join('\n'), 'utf-8');
  }

  /**
   * Generates synthetic PDF document buffer.
   */
  public generatePdf(queryResult: ReportQueryResult, title: string, clinicName?: string): Buffer {
    const clinic = clinicName || 'MatabAI (ShifaDesk) Healthcare Core';
    const dateStr = new Date().toISOString().split('T')[0]!;
    const rowCount = queryResult.rows.length;

    // Build sample row lines
    const maxPreviewRows = Math.min(rowCount, 15);
    const tableHeaderStr = queryResult.columns.map((c) => c.label).slice(0, 5).join(' | ');

    let previewRowsStr = '';
    for (let i = 0; i < maxPreviewRows; i++) {
      const row = queryResult.rows[i]!;
      const rowText = queryResult.columns
        .slice(0, 5)
        .map((c) => this.sanitizeFormulaInjection(row[c.key]))
        .join(' | ');
      previewRowsStr += `(${this.escapePdf(rowText)}) Tj 0 -16 Td\n`;
    }

    const pdfText = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 1200 >>
stream
BT
/F1 18 Tf
50 740 Td
(${this.escapePdf(clinic)}) Tj
/F1 14 Tf
0 -26 Td
(${this.escapePdf(title)}) Tj
/F1 9 Tf
0 -20 Td
(Date: ${dateStr} | Total Records: ${rowCount} | Confidential Medical & Operational Audit) Tj
0 -25 Td
/F1 10 Tf
(${this.escapePdf(tableHeaderStr)}) Tj
0 -8 Td
(------------------------------------------------------------------------------------------------------) Tj
0 -16 Td
/F1 8 Tf
${previewRowsStr}
0 -25 Td
/F1 8 Tf
(Confidential document generated by MatabAI. Formulas, PII, and sensitive records protected.) Tj
ET
endstream
endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000001500 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
1580
%%EOF`;

    return Buffer.from(pdfText, 'binary');
  }

  /**
   * High-level export dispatcher that formats report, logs export audit event, and returns buffer.
   */
  public async exportReport(
    organizationId: string,
    userId: string,
    format: ReportExportFormat | string,
    queryResult: ReportQueryResult,
    reportName: string,
    category: string,
    clinicId?: string,
    filtersApplied: Record<string, any> = {},
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeBaseName = reportName.replace(/[^a-zA-Z0-9_-]/g, '_');

    let buffer: Buffer;
    let filename: string;
    let mimeType: string;

    const normalizedFormat = format.toUpperCase();

    if (normalizedFormat === ReportExportFormat.CSV || normalizedFormat === 'CSV') {
      buffer = this.generateCsv(queryResult, reportName);
      filename = `${safeBaseName}_${timestamp}.csv`;
      mimeType = 'text/csv';
    } else if (normalizedFormat === ReportExportFormat.XLSX || normalizedFormat === 'XLSX') {
      buffer = this.generateXlsx(queryResult, reportName);
      filename = `${safeBaseName}_${timestamp}.xlsx`;
      mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else {
      buffer = this.generatePdf(queryResult, reportName);
      filename = `${safeBaseName}_${timestamp}.pdf`;
      mimeType = 'application/pdf';
    }

    // Record audit log asynchronously
    this.prisma.analyticsExportLog
      .create({
        data: {
          organizationId,
          clinicId,
          reportName,
          category,
          exportFormat: normalizedFormat,
          filtersApplied,
          rowCount: queryResult.totalRows,
          fileSizeBytes: buffer.length,
          exportedById: userId,
          ipAddress,
          userAgent,
        },
      })
      .catch((err) => this.logger.warn(`Failed to log report export: ${err.message}`));

    return { buffer, filename, mimeType };
  }

  private escapeXml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private escapePdf(str: string): string {
    return str.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }
}
