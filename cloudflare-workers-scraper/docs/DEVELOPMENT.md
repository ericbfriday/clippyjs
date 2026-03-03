# Development Guide

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Type check
npm run typecheck
```

## Project Structure

```
cloudflare-workers-scraper/
├── src/
│   ├── index.ts           # Main entry point, API routes
│   ├── utils/
│   │   ├── helpers.ts     # Helper functions
│   │   └── types.ts       # TypeScript types
│   ├── formatters/        # Output formatters (TODO)
│   └── extractors/        # Content extractors (TODO)
├── tests/                 # Tests (TODO)
├── docs/                  # Documentation
├── wrangler.toml          # Cloudflare Workers config
├── tsconfig.json          # TypeScript config
└── package.json
```

## Development Workflow

### 1. Make Changes
Edit files in `src/`

### 2. Test Locally
```bash
npm run dev
```

### 3. Type Check
```bash
npm run typecheck
```

### 4. Deploy to Testing
```bash
# First, create KV namespace and D1 database
npx wrangler kv:namespace create "CACHE_KV"
npx wrangler d1 create "scraper_db"

# Update wrangler.toml with the IDs

# Deploy
npm run deploy
```

## API Development

### Adding New Endpoints

1. Define the route in `src/index.ts`
2. Add TypeScript types in `src/utils/types.ts`
3. Add helper functions in `src/utils/helpers.ts`
4. Test with curl or PowerShell

## Debugging

### View Logs

```bash
# Real-time logs
npx wrangler tail

# Filter by status
npx wrangler tail --status error
```

### Common Issues

**Issue: Module not found**
- Solution: Run `npm install`

**Issue: Type errors**
- Solution: Run `npm run typecheck`

**Issue: Deployment fails**
- Solution: Check wrangler.toml configuration

## Next Steps

- [ ] Add HTML parser (linkedom)
- [ ] Implement KV caching
- [ ] Add format converters (CSV, XML, MD, PDF)
- [ ] Integrate Workers AI
- [ ] Add authentication
- [ ] Write tests
