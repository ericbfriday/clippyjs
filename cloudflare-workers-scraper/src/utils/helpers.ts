import robotsParser from 'robots-parser';

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
 * Check robots.txt
 */
export async function checkRobotsTxt(url: string): Promise<boolean> {
  try {
    const targetUrl = new URL(url);
    const robotsUrl = new URL('/robots.txt', targetUrl.origin).toString();
    const userAgent = 'Mozilla/5.0 (compatible; Cloudflare-Workers-Scraper; +https://github.com/ericbfriday/clippyjs)';
    const botName = 'Cloudflare-Workers-Scraper';

    // Use Cloudflare fetch options to cache the robots.txt file for 1 hour (3600 seconds)
    // This prevents hammering target servers on every scrape request.
    const response = await fetch(robotsUrl, {
      headers: {
        'User-Agent': userAgent
      },
      cf: {
        cacheTtl: 3600,
        cacheEverything: true
      }
    });

    if (response.ok) {
      const content = await response.text();
      const robots = robotsParser(robotsUrl, content);

      const isAllowed = robots.isAllowed(url, botName);
      return isAllowed !== false; // isAllowed can be undefined, default to true if undefined
    }

    // If robots.txt fetch fails (e.g. 404), allow scraping by default
    return true;
  } catch (error) {
    // Fail open on any errors (invalid URL, network error, etc.)
    return true;
  }
}
