// Mobile-number accounts: Supabase needs an email, so a phone number maps to an internal address
// that never receives mail. The visitor only ever sees and types the phone number.
export const PHONE_EMAIL_DOMAIN = 'phone.nursingjob.online';

/** Returns the number as 01XXXXXXXXX, or null if it is not a valid Bangladeshi mobile number. */
export function normalizeBdPhone(input: string): string | null {
  const d = input.replace(/[^\d]/g, '').replace(/^(?:00)?88(?=01)/, '');
  return /^01[3-9]\d{8}$/.test(d) ? d : null;
}

export const phoneToEmail = (phone: string) => `${phone}@${PHONE_EMAIL_DOMAIN}`;
export const isPhoneEmail = (email?: string | null) => !!email && email.endsWith(`@${PHONE_EMAIL_DOMAIN}`);
export const emailToPhone = (email: string) => email.split('@')[0];
