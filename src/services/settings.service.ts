import { SettingsRepository } from '../repositories/settings.repo';

export interface LoanExtendSettings {
  maxExtends: number;
  allowOverdueExtend: boolean;
  extendCharge: number;
}

const LOAN_SETTING_KEYS = [
  'loan.maxExtends',
  'loan.allowOverdueExtend',
  'loan.extendCharge',
] as const;

const DEFAULTS: Record<string, string> = {
  'loan.maxExtends': '1',
  'loan.allowOverdueExtend': 'false',
  'loan.extendCharge': '0',
};

export async function getLoanExtendSettings(): Promise<LoanExtendSettings> {
  const raw = await SettingsRepository.getMany([...LOAN_SETTING_KEYS]);
  return {
    maxExtends: parseInt(raw['loan.maxExtends'] ?? DEFAULTS['loan.maxExtends'], 10),
    allowOverdueExtend: (raw['loan.allowOverdueExtend'] ?? DEFAULTS['loan.allowOverdueExtend']) === 'true',
    extendCharge: parseFloat(raw['loan.extendCharge'] ?? DEFAULTS['loan.extendCharge']),
  };
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const stored = await SettingsRepository.getAll();
  return { ...DEFAULTS, ...stored };
}

export async function updateSettings(entries: Record<string, string>): Promise<Record<string, string>> {
  await SettingsRepository.setMany(entries);
  return getAllSettings();
}
