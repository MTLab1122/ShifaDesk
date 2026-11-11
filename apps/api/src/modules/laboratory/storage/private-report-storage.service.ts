import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class PrivateReportStorageService {
  private readonly logger = new Logger(PrivateReportStorageService.name);
  private readonly baseStorageDir: string;
  private readonly encryptionKey: Buffer;

  constructor() {
    this.baseStorageDir =
      process.env.LAB_STORAGE_PATH ||
      path.join(process.cwd(), 'storage', 'lab-reports');

    // Ensure base storage dir exists
    if (!fs.existsSync(this.baseStorageDir)) {
      fs.mkdirSync(this.baseStorageDir, { recursive: true });
    }

    // Derive 32-byte AES key from env or fallback secret
    const secret =
      process.env.REPORT_ENCRYPTION_SECRET ||
      'matabai-lab-report-secure-storage-key-2026';
    this.encryptionKey = crypto.createHash('sha256').update(secret).digest();
  }

  /**
   * Validate that the buffer starts with genuine PDF magic bytes (%PDF-)
   */
  public validatePdfMagicBytes(buffer: Buffer): void {
    if (!buffer || buffer.length < 5) {
      throw new BadRequestException('Invalid file: Empty or truncated file payload');
    }

    const header = buffer.subarray(0, 5).toString('ascii');
    if (!header.startsWith('%PDF-')) {
      throw new BadRequestException(
        'Security rejection: Uploaded file does not contain valid PDF magic bytes (%PDF-). Only genuine PDF documents are accepted.',
      );
    }
  }

  /**
   * Save a PDF report with AES-256-GCM encryption and path-traversal prevention
   */
  public async saveReportFile(
    organizationId: string,
    reportId: string,
    pdfBuffer: Buffer,
    _originalFileName?: string,
  ): Promise<{ storagePath: string; fileSizeBytes: number; checksum: string }> {
    this.validatePdfMagicBytes(pdfBuffer);

    // Compute SHA-256 checksum of original PDF
    const checksum = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

    // Prepare tenant isolated directory
    const tenantDir = path.join(this.baseStorageDir, organizationId);
    if (!fs.existsSync(tenantDir)) {
      fs.mkdirSync(tenantDir, { recursive: true });
    }

    // Generate safe filename and encrypted storage path
    const sanitizedFileName = `${reportId}.enc`;
    const fullStoragePath = path.join(tenantDir, sanitizedFileName);

    // Security check: Path traversal prevention
    const resolvedPath = path.resolve(fullStoragePath);
    if (!resolvedPath.startsWith(path.resolve(this.baseStorageDir))) {
      throw new BadRequestException('Security exception: Invalid storage destination path');
    }

    // Encrypt buffer with AES-256-GCM
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(pdfBuffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Packed format: [IV 12B][AuthTag 16B][Encrypted Payload]
    const packed = Buffer.concat([iv, authTag, encrypted]);
    await fs.promises.writeFile(resolvedPath, packed);

    this.logger.log(
      `Securely stored lab report ${reportId} for org ${organizationId} (Original: ${pdfBuffer.length} bytes, SHA256: ${checksum})`,
    );

    return {
      storagePath: path.relative(this.baseStorageDir, resolvedPath),
      fileSizeBytes: pdfBuffer.length,
      checksum,
    };
  }

  /**
   * Read and decrypt an encrypted report file
   */
  public async readReportFile(
    _organizationId: string,
    storagePath: string,
  ): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
    const fullPath = path.resolve(this.baseStorageDir, storagePath);

    // Security check: Prevent path traversal
    if (!fullPath.startsWith(path.resolve(this.baseStorageDir))) {
      throw new BadRequestException('Security exception: Directory traversal forbidden');
    }

    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException('Diagnostic report file not found on disk');
    }

    const packed = await fs.promises.readFile(fullPath);
    if (packed.length < 28) {
      throw new BadRequestException('Corrupted encrypted report payload');
    }

    // Extract IV, AuthTag, and Encrypted Data
    const iv = packed.subarray(0, 12);
    const authTag = packed.subarray(12, 28);
    const encrypted = packed.subarray(28);

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    try {
      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
      this.validatePdfMagicBytes(decrypted);

      return {
        buffer: decrypted,
        fileName: `${path.basename(storagePath, '.enc')}.pdf`,
        mimeType: 'application/pdf',
      };
    } catch (err: any) {
      this.logger.error(`Failed to decrypt report ${storagePath}: ${err.message}`);
      throw new BadRequestException('Integrity failure: Unable to decrypt report file');
    }
  }

  /**
   * Delete an encrypted report file
   */
  public async deleteReportFile(storagePath: string): Promise<void> {
    const fullPath = path.resolve(this.baseStorageDir, storagePath);
    if (fullPath.startsWith(path.resolve(this.baseStorageDir)) && fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
    }
  }

  /**
   * Generate a standard, professional diagnostic laboratory PDF report
   * Valid PDF-1.4 format with %PDF- header, standard text font, clean layout, and %%EOF trailer
   */
  public generateSyntheticPdfReport(data: {
    clinicName: string;
    orderRef: string;
    reportRef: string;
    version: number;
    patientName: string;
    patientMrn?: string;
    patientPhone?: string;
    doctorName?: string;
    sampleRef?: string;
    sampleType?: string;
    items: Array<{
      testName: string;
      testCode: string;
      resultValue: string;
      unit?: string | null;
      referenceRange?: string | null;
      status: string;
    }>;
    approvedBy?: string | null;
    approvedAt?: string | null;
  }): Buffer {
    const lines: string[] = [];
    lines.push('========================================================================');
    lines.push(`               ${data.clinicName.toUpperCase()} - DIAGNOSTIC LABORATORY`);
    lines.push('                    OFFICIAL CLINICAL LABORATORY REPORT');
    lines.push('========================================================================');
    lines.push(`Report Reference: ${data.reportRef} (Version ${data.version})`);
    lines.push(`Order Reference:  ${data.orderRef}`);
    lines.push(`Generated At:     ${new Date().toISOString()}`);
    lines.push('------------------------------------------------------------------------');
    lines.push(`Patient Name:     ${data.patientName}`);
    lines.push(`MRN / ID:         ${data.patientMrn || 'N/A'}`);
    lines.push(`Contact:          ${data.patientPhone || 'N/A'}`);
    lines.push(`Ordering Doctor:  ${data.doctorName || 'Self / Walk-in'}`);
    lines.push(`Sample Reference: ${data.sampleRef || 'SMP-STANDARD'}`);
    lines.push(`Sample Type:      ${data.sampleType || 'Diagnostic Specimen'}`);
    lines.push('------------------------------------------------------------------------');
    lines.push('INVESTIGATION / TEST        RESULT        UNIT     REFERENCE RANGE   STATUS');
    lines.push('------------------------------------------------------------------------');

    for (const item of data.items) {
      const name = item.testName.padEnd(26, ' ').slice(0, 26);
      const val = item.resultValue.padEnd(13, ' ').slice(0, 13);
      const unit = (item.unit || '-').padEnd(8, ' ').slice(0, 8);
      const ref = (item.referenceRange || 'Normal').padEnd(17, ' ').slice(0, 17);
      const status = item.status;
      lines.push(`${name} ${val} ${unit} ${ref} ${status}`);
    }

    lines.push('------------------------------------------------------------------------');
    lines.push(`Approved By:      ${data.approvedBy || 'Chief Pathologist / Lab Reviewer'}`);
    lines.push(`Approved At:      ${data.approvedAt || new Date().toISOString()}`);
    lines.push('Electronic Verification: VALIDATED & AUTHENTICATED VIA MATABAI SHIFADESK');
    lines.push('Note: This report contains administrative diagnostic results for authorized clinical review.');
    lines.push('========================================================================');

    const textContent = lines.join('\n');
    return this.buildMinimalPdf(textContent);
  }

  /**
   * Build a standard valid PDF-1.4 binary buffer from ASCII lines
   */
  private buildMinimalPdf(text: string): Buffer {
    // Escape special PDF characters: (, ), \
    const escaped = text
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');

    const textLines = escaped.split('\n');

    // Build PDF content stream
    let streamBody = 'BT\n/F1 10 Tf\n20 780 Td\n13 TL\n';
    for (let i = 0; i < textLines.length; i++) {
      if (i > 0) {
        streamBody += 'T*\n';
      }
      streamBody += `(${textLines[i]}) Tj\n`;
    }
    streamBody += 'ET\n';

    const streamLength = Buffer.byteLength(streamBody, 'utf-8');

    // Objects
    const obj1 = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
    const obj2 = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
    const obj3 =
      '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n';
    const obj4 = `4 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamBody}endstream\nendobj\n`;
    const obj5 = '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n';

    const header = '%PDF-1.4\n%âãÏÓ\n';

    const offset1 = header.length;
    const offset2 = offset1 + obj1.length;
    const offset3 = offset2 + obj2.length;
    const offset4 = offset3 + obj3.length;
    const offset5 = offset4 + obj4.length;
    const xrefOffset = offset5 + obj5.length;

    const pad10 = (n: number) => n.toString().padStart(10, '0');

    const xref =
      `xref\n` +
      `0 6\n` +
      `0000000000 65535 f \n` +
      `${pad10(offset1)} 00000 n \n` +
      `${pad10(offset2)} 00000 n \n` +
      `${pad10(offset3)} 00000 n \n` +
      `${pad10(offset4)} 00000 n \n` +
      `${pad10(offset5)} 00000 n \n`;

    const trailer =
      `trailer\n` +
      `<< /Size 6 /Root 1 0 R >>\n` +
      `startxref\n` +
      `${xrefOffset}\n` +
      `%%EOF\n`;

    const fullPdfString = header + obj1 + obj2 + obj3 + obj4 + obj5 + xref + trailer;
    return Buffer.from(fullPdfString, 'utf-8');
  }
}
