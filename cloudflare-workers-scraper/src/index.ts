import { Router } from 'itty-router';

// Export types for Cloudflare Workers
export interface Env {
  CACHE_KV: KVNamespace;
  DB: D1Database;
  AI: Ai;
  ENVIRONMENT: string;
}

// Create router
const router = Router();

// Health check endpoint
router.get('/api/v1/health', () => {
  return new Response(JSON.stringify({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '0.1.0'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
});

// Extract endpoint (prototype - basic implementation)
router.post('/api/v1/extract', async (request: Request, env: Env) => {
  try {
    const body = await request.json() as { url: string; format?: string };
    
    if (!body.url) {
      return new Response(JSON.stringify({
        success: false,
        error: {
          code: 'INVALID_URL',
          message: 'URL is required'
        }
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Fetch the URL with proper headers
    const response = await fetch(body.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br'
      }
    });

    if (!response.ok) {
      return new Response(JSON.stringify({
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: `Failed to fetch URL: ${response.status}`
        }
      }), { 
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const html = await response.text();

    // Basic HTML extraction (prototype)
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';

    // Extract body content (very basic for prototype)
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const bodyText = bodyMatch 
      ? bodyMatch[1].replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                   .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                   .replace(/<[^>]+>/g, ' ')
                   .replace(/\s+/g, ' ')
                   .trim()
      : '';

    // Return extracted content
    return new Response(JSON.stringify({
      success: true,
      data: {
        url: body.url,
        format: body.format || 'json',
        extractedAt: new Date().toISOString(),
        content: {
          title,
          body: bodyText.substring(0, 5000) // Limit for prototype
        },
        stats: {
          contentLength: html.length,
          processingTime: 'prototype'
        }
      }
    }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

// 404 handler
router.all('*', () => {
  return new Response(JSON.stringify({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found'
    }
  }), { 
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
});

// Export the fetch handler for Cloudflare Workers
export default {
  fetch: (request: Request, env: Env, ctx: ExecutionContext) => 
    router.handle(request).catch((error: Error) => {
      console.error('Error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: error.message
        }
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    })
};
