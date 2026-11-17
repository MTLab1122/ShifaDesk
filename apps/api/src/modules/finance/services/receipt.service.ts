import { Injectable } from '@nestjs/common';
import { Invoice, Payment } from '@matabai/shared';

@Injectable()
export class ReceiptService {
  /**
   * Generates a clean, professional HTML receipt for 80mm thermal point-of-sale printers.
   */
  public generateThermalReceiptHtml(
    invoice: Invoice,
    payment: Payment,
    clinicName: string = 'MatabAI (ShifaDesk) Medical Center',
    clinicPhone: string = '+92 51 111 222 333',
    clinicAddress: string = 'Blue Area, Islamabad, Pakistan',
    cashierName?: string,
  ): string {
    const pkrPaid = (payment.amountMinor / 100).toFixed(2);
    const pkrTotal = (invoice.totalMinor / 100).toFixed(2);
    const pkrOutstanding = (invoice.outstandingMinor / 100).toFixed(2);

    const itemsHtml = (invoice.items || [])
      .map(
        (it) => `
        <tr>
          <td style="text-align: left; padding: 2px 0;">${this.escape(it.descriptionSnapshot)} (x${it.quantity})</td>
          <td style="text-align: right; padding: 2px 0;">PKR ${(it.totalMinor / 100).toFixed(2)}</td>
        </tr>`,
      )
      .join('');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt - ${payment.paymentReference}</title>
  <style>
    body {
      font-family: 'Courier New', Courier, monospace;
      width: 280px;
      margin: 0 auto;
      padding: 10px;
      font-size: 12px;
      color: #000;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .border-top { border-top: 1px dashed #000; margin: 8px 0; }
    .border-double { border-top: 2px dashed #000; margin: 8px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    .bold { font-weight: bold; }
  </style>
</head>
<body>
  <div class="text-center">
    <h3 style="margin: 0 0 4px 0;">${this.escape(clinicName)}</h3>
    <div style="font-size: 11px;">شفا ڈیسک کلینک</div>
    <div style="font-size: 10px; margin-top: 2px;">${this.escape(clinicAddress)}</div>
    <div style="font-size: 10px;">Tel: ${this.escape(clinicPhone)}</div>
  </div>

  <div class="border-top"></div>

  <div>
    <div><strong>Receipt:</strong> ${payment.paymentReference}</div>
    <div><strong>Invoice:</strong> ${invoice.invoiceReference}</div>
    <div><strong>Date:</strong> ${new Date(payment.createdAt).toLocaleString('en-PK')}</div>
    <div><strong>Patient:</strong> ${this.escape(invoice.patient?.fullName || 'Walk-in Patient')}</div>
    ${invoice.patient?.patientNumber ? `<div><strong>MRN:</strong> ${invoice.patient.patientNumber}</div>` : ''}
    ${cashierName ? `<div><strong>Cashier:</strong> ${this.escape(cashierName)}</div>` : ''}
  </div>

  <div class="border-top"></div>

  <table>
    <thead>
      <tr style="border-bottom: 1px solid #000;">
        <th style="text-align: left; padding-bottom: 4px;">Item</th>
        <th style="text-align: right; padding-bottom: 4px;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div class="border-top"></div>

  <table>
    <tr>
      <td>Invoice Total:</td>
      <td class="text-right">PKR ${pkrTotal}</td>
    </tr>
    <tr class="bold">
      <td>Paid (${payment.method}):</td>
      <td class="text-right">PKR ${pkrPaid}</td>
    </tr>
    <tr>
      <td>Balance Due:</td>
      <td class="text-right">PKR ${pkrOutstanding}</td>
    </tr>
  </table>

  <div class="border-double"></div>

  <div class="text-center" style="font-size: 10px;">
    <div>Thank you for visiting!</div>
    <div style="margin-top: 2px;">Keep this receipt for all inquiries.</div>
    <div style="margin-top: 4px; font-size: 9px; color: #555;">Powered by MatabAI (ShifaDesk)</div>
  </div>
</body>
</html>`;
  }

  /**
   * Generates a full-page A4 printable invoice HTML layout.
   */
  public generateA4InvoiceHtml(
    invoice: Invoice,
    clinicName: string = 'MatabAI (ShifaDesk) Medical Center',
    clinicPhone: string = '+92 51 111 222 333',
    clinicAddress: string = 'Blue Area, Islamabad, Pakistan',
  ): string {
    const pkrSubtotal = (invoice.subtotalMinor / 100).toFixed(2);
    const pkrDiscount = (invoice.discountMinor / 100).toFixed(2);
    const pkrTax = (invoice.taxMinor / 100).toFixed(2);
    const pkrTotal = (invoice.totalMinor / 100).toFixed(2);
    const pkrPaid = (invoice.paidMinor / 100).toFixed(2);
    const pkrOutstanding = (invoice.outstandingMinor / 100).toFixed(2);

    const itemsRows = (invoice.items || [])
      .map(
        (it, idx) => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px; text-align: center;">${idx + 1}</td>
          <td style="padding: 10px;">
            <div style="font-weight: 600; color: #0f172a;">${this.escape(it.descriptionSnapshot)}</div>
            <div style="font-size: 12px; color: #64748b;">${it.itemType}</div>
          </td>
          <td style="padding: 10px; text-align: center;">${it.quantity}</td>
          <td style="padding: 10px; text-align: right;">PKR ${(it.unitPriceMinor / 100).toFixed(2)}</td>
          <td style="padding: 10px; text-align: right; font-weight: 600;">PKR ${(it.totalMinor / 100).toFixed(2)}</td>
        </tr>`,
      )
      .join('');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice - ${invoice.invoiceReference}</title>
  <style>
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 40px;
      color: #0f172a;
      background: #ffffff;
    }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      font-size: 12px;
      font-weight: 700;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .badge-paid { background: #dcfce7; color: #15803d; }
    .badge-partially_paid { background: #fef9c3; color: #854d0e; }
    .badge-issued { background: #e0f2fe; color: #0369a1; }
    .badge-cancelled { background: #fee2e2; color: #b91c1c; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background: #f8fafc; padding: 10px; text-align: left; font-size: 13px; color: #475569; border-bottom: 2px solid #cbd5e1; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 style="margin: 0; color: #0284c7; font-size: 26px;">${this.escape(clinicName)}</h1>
      <div style="font-size: 14px; color: #64748b; margin-top: 4px;">Outpatient Healthcare & Diagnostic Billing</div>
      <div style="font-size: 13px; color: #64748b; margin-top: 2px;">${this.escape(clinicAddress)}</div>
      <div style="font-size: 13px; color: #64748b;">Phone: ${this.escape(clinicPhone)}</div>
    </div>
    <div style="text-align: right;">
      <h2 style="margin: 0; font-size: 20px; color: #1e293b;">INVOICE</h2>
      <div style="font-size: 15px; font-weight: 700; color: #0284c7; margin-top: 4px;">${invoice.invoiceReference}</div>
      <div style="margin-top: 6px;">
        <span class="badge badge-${invoice.status.toLowerCase()}">${invoice.status}</span>
      </div>
      <div style="font-size: 13px; color: #64748b; margin-top: 6px;">Date: ${new Date(invoice.createdAt).toLocaleDateString('en-PK')}</div>
      ${invoice.dueAt ? `<div style="font-size: 13px; color: #64748b;">Due: ${new Date(invoice.dueAt).toLocaleDateString('en-PK')}</div>` : ''}
    </div>
  </div>

  <div style="display: flex; justify-content: space-between; padding: 16px; background: #f8fafc; border-radius: 8px; margin-bottom: 25px;">
    <div>
      <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 700;">Billed To:</div>
      <div style="font-size: 16px; font-weight: 700; margin-top: 2px;">${this.escape(invoice.patient?.fullName || 'Walk-in Patient')}</div>
      ${invoice.patient?.patientNumber ? `<div style="font-size: 13px; color: #475569;">MRN: ${invoice.patient.patientNumber}</div>` : ''}
      ${invoice.patient?.phone ? `<div style="font-size: 13px; color: #475569;">Phone: ${invoice.patient.phone}</div>` : ''}
    </div>
    ${
      invoice.appointment
        ? `<div style="text-align: right;">
            <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 700;">Service Context:</div>
            <div style="font-size: 14px; font-weight: 600; margin-top: 2px;">Appointment ${invoice.appointment.appointmentNumber}</div>
            <div style="font-size: 13px; color: #475569;">Date: ${invoice.appointment.appointmentDate} (${invoice.appointment.startTime})</div>
          </div>`
        : ''
    }
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 5%; text-align: center;">#</th>
        <th style="width: 50%;">Investigation / Consultation Service</th>
        <th style="width: 15%; text-align: center;">Qty</th>
        <th style="width: 15%; text-align: right;">Rate</th>
        <th style="width: 15%; text-align: right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
  </table>

  <div style="display: flex; justify-content: flex-end; margin-top: 25px;">
    <div style="width: 320px;">
      <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px;">
        <span style="color: #64748b;">Subtotal:</span>
        <span style="font-weight: 600;">PKR ${pkrSubtotal}</span>
      </div>
      ${
        Number(pkrDiscount) > 0
          ? `<div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; color: #15803d;">
              <span>Discount:</span>
              <span>- PKR ${pkrDiscount}</span>
            </div>`
          : ''
      }
      ${
        Number(pkrTax) > 0
          ? `<div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; color: #64748b;">
              <span>Tax (${invoice.taxRatePercent}%):</span>
              <span>+ PKR ${pkrTax}</span>
            </div>`
          : ''
      }
      <div style="display: flex; justify-content: space-between; padding: 10px 0; font-size: 17px; font-weight: 700; border-top: 2px solid #e2e8f0; border-bottom: 2px solid #e2e8f0; margin: 6px 0;">
        <span>Grand Total:</span>
        <span style="color: #0284c7;">PKR ${pkrTotal}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px;">
        <span style="color: #15803d; font-weight: 600;">Amount Paid:</span>
        <span style="color: #15803d; font-weight: 600;">PKR ${pkrPaid}</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 15px; font-weight: 700;">
        <span style="color: #b91c1c;">Balance Outstanding:</span>
        <span style="color: #b91c1c;">PKR ${pkrOutstanding}</span>
      </div>
    </div>
  </div>

  <div style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: flex-end; font-size: 12px; color: #94a3b8;">
    <div>
      <div>Thank you for choosing ${this.escape(clinicName)}.</div>
      <div>This is an authoritative computer-generated invoice and does not require a physical stamp.</div>
    </div>
    <div style="text-align: right;">
      <div>MatabAI (ShifaDesk) Healthcare Core</div>
      <div>Issued: ${new Date().toLocaleString('en-PK')}</div>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Builds a standard PDF document buffer containing official invoice details.
   */
  public generateSyntheticInvoicePdf(
    invoice: Invoice,
    clinicName: string = 'MatabAI (ShifaDesk) Medical Center',
  ): Buffer {
    const invoiceRef = invoice.invoiceReference;
    const patientName = invoice.patient?.fullName || 'Walk-in Patient';
    const totalPkr = (invoice.totalMinor / 100).toFixed(2);
    const paidPkr = (invoice.paidMinor / 100).toFixed(2);
    const balancePkr = (invoice.outstandingMinor / 100).toFixed(2);

    const pdfText = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length 520 >>
stream
BT
/F1 20 Tf
50 720 Td
(${this.escapePdf(clinicName)}) Tj
/F1 14 Tf
0 -30 Td
(OFFICIAL MEDICAL INVOICE - ${this.escapePdf(invoiceRef)}) Tj
/F1 10 Tf
0 -25 Td
(Status: ${invoice.status} | Date: ${new Date(invoice.createdAt).toISOString()}) Tj
0 -20 Td
(Patient: ${this.escapePdf(patientName)} | MRN: ${this.escapePdf(invoice.patient?.patientNumber || 'N/A')}) Tj
0 -30 Td
(Total Amount: PKR ${totalPkr} | Amount Paid: PKR ${paidPkr} | Balance Due: PKR ${balancePkr}) Tj
0 -30 Td
(Items Billed: ${invoice.items?.length || 0} line items) Tj
0 -40 Td
(Generated securely by MatabAI Healthcare Platform) Tj
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
0000000816 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
895
%%EOF`;

    return Buffer.from(pdfText, 'utf-8');
  }

  private escape(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private escapePdf(str: string): string {
    return str.replace(/[()\\]/g, '');
  }
}
