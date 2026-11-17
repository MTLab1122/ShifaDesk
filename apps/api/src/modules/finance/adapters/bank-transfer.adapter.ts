import { Injectable } from '@nestjs/common';

export interface BankTransferDetails {
  bankName: string;
  accountTitle: string;
  accountNumber: string;
  iban: string;
  branchCode?: string;
  instructions: string;
}

@Injectable()
export class BankTransferAdapter {
  private readonly defaultDetails: BankTransferDetails = {
    bankName: process.env.CLINIC_BANK_NAME || 'Meezan Bank Limited',
    accountTitle: process.env.CLINIC_BANK_ACCOUNT_TITLE || 'MatabAI Healthcare Services',
    accountNumber: process.env.CLINIC_BANK_ACCOUNT_NUMBER || '01020304050607',
    iban: process.env.CLINIC_BANK_IBAN || 'PK45MEZN0001020304050607',
    branchCode: process.env.CLINIC_BANK_BRANCH_CODE || '0101',
    instructions:
      'Please transfer the exact amount via IBFT / Raast. Use the Invoice Reference as the payment transaction description / remarks. Upload or present the payment slip at the clinic counter for reconciliation.',
  };

  public getClinicBankDetails(): BankTransferDetails {
    return this.defaultDetails;
  }

  public validateIban(iban: string): boolean {
    const cleanIban = iban.replace(/\s+/g, '').toUpperCase();
    if (cleanIban.length !== 24 || !cleanIban.startsWith('PK')) {
      return false;
    }
    return /^[A-Z0-9]+$/.test(cleanIban);
  }
}
