export const appendCacheBuster = (url: string | undefined): string | undefined => {
  if (!url) return url;
  if (!url.includes('firebasestorage.googleapis.com')) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}cb=${new Date().toISOString().split('T')[0]}`;
};
