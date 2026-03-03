# Testing Examples

## Local Testing with Wrangler

```bash
# Start development server
cd cloudflare-workers-scraper
npm install
npm run dev

# Server will start at http://localhost:8787
```

## Test the Health Endpoint

```bash
curl http://localhost:8787/api/v1/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-15T00:53:00Z",
  "version": "0.1.0"
}
```

## Test Content Extraction

### Example 1: Simple HTML Page

```bash
curl -X POST http://localhost:8787/api/v1/extract \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "format": "json"
  }'
```

### Example 2: News Article

```bash
curl -X POST http://localhost:8787/api/v1/extract \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://news.ycombinator.com/",
    "format": "json"
  }'
```

## Test with PowerShell

```powershell
# Test health endpoint
Invoke-RestMethod -Uri "http://localhost:8787/api/v1/health" -Method Get

# Test extract endpoint
$body = @{
  url = "https://example.com"
  format = "json"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8787/api/v1/extract" -Method Post -Body $body -ContentType "application/json"
```

## Expected Behavior

### Success Response
- HTTP 200
- success: true
- Contains data.content.title
- Contains data.content.body

### Error Responses
- HTTP 400 for invalid URL
- HTTP 404 for non-existent endpoints
- HTTP 500 for server errors

## Testing Checklist

- [ ] Health endpoint returns 200
- [ ] Extract endpoint works with example.com
- [ ] Extract endpoint handles invalid URLs (400 error)
- [ ] Extract endpoint handles non-existent URLs (404/500 error)
- [ ] Response includes title extraction
- [ ] Response includes body content
- [ ] Body content has scripts/styles removed
- [ ] CORS headers are present
