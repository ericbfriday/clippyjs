# Cloudflare Workers Web Scraper

Production-grade web scraper on Cloudflare Workers with multi-format export.

## Features

- 🚀 Edge computing (Cloudflare Workers)
- 📊 Multiple output formats (JSON, CSV, XML, Markdown, PDF)
- ⚡ Fast caching (Workers KV)
- 🔒 robots.txt compliance
- 🤖 AI-powered content extraction (Workers AI)

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Deploy to production
npm run deploy
```

## API Usage

### Extract Content

```bash
curl -X POST https://your-worker.workers.dev/api/v1/extract \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/article",
    "format": "json",
    "options": {
      "extractMainContent": true
    }
  }'
```

### Response

```json
{
  "success": true,
  "data": {
    "url": "https://example.com/article",
    "format": "json",
    "extractedAt": "2026-01-15T00:53:00Z",
    "content": {
      "title": "Article Title",
      "body": "Content..."
    },
    "stats": {
      "processingTime": "1.2s"
    }
  }
}
```

## API Endpoints

- `POST /api/v1/extract` - Extract content from URL
- `GET /api/v1/health` - Health check

## Project Status

- [x] Phase 1: Research ✅
- [x] Phase 2: Architect ✅
- [x] Phase 3: Prototype (IN PROGRESS) 🚧
- [ ] Phase 4: Leverage
- [ ] Phase 5: Optimize
- [ ] Phase 6: Polish
- [ ] Phase 7: Ship

## Development

```bash
# Type checking
npm run typecheck

# Run tests
npm test

# Deploy to staging
npm run deploy:staging
```

## License

MIT
