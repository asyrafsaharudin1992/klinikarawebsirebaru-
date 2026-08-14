export const appendCacheBuster = (url: string | undefined): string | undefined => {
  if (!url) return url;
  if (!url.includes('firebasestorage.googleapis.com')) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}cb=${new Date().toISOString().split('T')[0]}`;
};

export const slugify = (text: string): string =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '') || 'service';

/** Appends "-2", "-3", etc. until the slug isn't in `taken`. */
export const uniqueSlug = (base: string, taken: Set<string>): string => {
  let slug = base;
  let n = 2;
  while (taken.has(slug)) {
    slug = `${base}-${n}`;
    n++;
  }
  return slug;
};

export const formatPhoneNumber = (phone: string) => {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) { cleaned = '60' + cleaned.substring(1); }
  if (!cleaned.startsWith('60')) { cleaned = '60' + cleaned; }
  return cleaned;
};

export const SERVICE_BASE_URL = 'https://klinikara24jam.hsohealthcare.com/service';

/** Shares a service via the Web Share API, falling back to clipboard. Returns which path was used. */
export const shareService = async (service: { id: string; slug?: string; title: string }): Promise<'shared' | 'copied' | 'failed'> => {
  const shareUrl = `https://share.klinikara24jam.hsohealthcare.com/?service=${service.id}`;
  const warmSentence = `Jom lihat servis ini di Klinik Ara: ${service.title}`;
  const fullMessage = `${shareUrl}\n\n${warmSentence}`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: `Klinik Ara 24 Jam - ${service.title}`,
        text: warmSentence,
        url: shareUrl,
      });
      return 'shared';
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.log('Error sharing', error);
      }
      return 'failed';
    }
  }

  try {
    await navigator.clipboard.writeText(fullMessage);
    return 'copied';
  } catch (err) {
    console.error('Failed to copy', err);
    return 'failed';
  }
};
