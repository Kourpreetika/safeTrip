/**
 * Indian mobile numbers: 10 digits starting with 6–9.
 * Accepts 9876543210, 09876543210, +919876543210, 91 98765 43210.
 */
export function normalizeIndianMobile(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  let ten = digits;
  if (digits.length === 12 && digits.startsWith("91")) ten = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) ten = digits.slice(1);
  if (!/^[6-9]\d{9}$/.test(ten)) return null;
  return `+91${ten}`;
}

export function indianMobileSchemaMessage(): string {
  return "Enter a valid 10-digit Indian mobile number (starts with 6–9).";
}
