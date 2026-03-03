/**
 * Hash a URL for caching
 */
export function hashUrl(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get cache key for URL and format
 */
export function getCacheKey(url: string, format: string): string {
  const hash = hashUrl(url);
  return `cache:${hash}:${format}`;
}

/**
 * Check robots.txt (simplified for prototype)
 * TODO: Implement full robots.txt parser
 */
export async function checkRobotsTxt(url: string): Promise<boolean> {
  // For prototype, always return true
  // In production, parse robots.txt
  return true;
}
