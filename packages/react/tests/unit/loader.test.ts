import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock minimal window for non-DOM environments
if (typeof window === 'undefined') {
  (global as any).window = {
    location: { origin: 'https://safe.com' }
  };
  (global as any).URL = URL;
}

import { load } from '../../src/loader';

describe('loader security', () => {
  beforeEach(() => {
    (window as any).CLIPPY_CDN = undefined;
    (window as any).CLIPPY_TRUSTED_ORIGINS = undefined;
  });

  it('fix: rejects loading scripts from arbitrary domains via basePath', async () => {
    const maliciousPath = 'https://malicious.com/evil';
    await expect(load('Clippy', { basePath: maliciousPath }))
      .rejects.toThrow(/Security Error/);
  });

  it('fix: rejects loading scripts from arbitrary domains via window.CLIPPY_CDN', async () => {
    const maliciousPath = 'https://malicious.com/evil/';
    (window as any).CLIPPY_CDN = maliciousPath;
    await expect(load('Clippy')).rejects.toThrow(/Security Error/);
  });

  it('fix: rejects protocol-relative URLs', async () => {
    const maliciousPath = '//malicious.com/evil';
    await expect(load('Clippy', { basePath: maliciousPath }))
      .rejects.toThrow(/Security Error/);
  });

  it('fix: allows loading from same origin', async () => {
    const sameOriginPath = `${window.location.origin}/agents/`;

    try {
        await load('Clippy', { basePath: sameOriginPath });
    } catch (e) {
        expect((e as Error).message).not.toContain('Security Error');
    }
  });

  it('fix: allows loading from trusted origins', async () => {
    const trustedOrigin = 'https://cdn.clippyjs.com';
    (window as any).CLIPPY_TRUSTED_ORIGINS = [trustedOrigin];
    const trustedPath = `${trustedOrigin}/agents/`;

    try {
        await load('Clippy', { basePath: trustedPath });
    } catch (e) {
        expect((e as Error).message).not.toContain('Security Error');
    }
  });
});
