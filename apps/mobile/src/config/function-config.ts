export function readFunctionConfig(): { url: string; secret: string } | null {
  const url = process.env.EXPO_PUBLIC_ENRICH_URL;
  const secret = process.env.EXPO_PUBLIC_ENRICH_SECRET;
  return url && secret ? { url, secret } : null;
}

export function balancesUrl(enrichUrl: string): string {
  return `${enrichUrl.replace(/\/+$/, '')}/balances`;
}

export function readBalancesConfig(): { url: string; secret: string } | null {
  const enrich = readFunctionConfig();
  if (!enrich) {
    return null;
  }
  return { url: process.env.EXPO_PUBLIC_BALANCES_URL || balancesUrl(enrich.url), secret: enrich.secret };
}
