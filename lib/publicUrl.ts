export function getPublicBaseUrl(): string {
  const isProd = process.env.NODE_ENV === 'production';
  const appUrl = process.env.APP_URL?.trim();

  if (isProd) {
    if (!appUrl || appUrl === '' || appUrl.includes('localhost')) {
      throw new Error('APP_URL must be configured in production and cannot be localhost');
    }
  }

  return (appUrl || 'http://localhost:3000').replace(/\/$/, '');
}
