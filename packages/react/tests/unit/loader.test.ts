import { describe, it, expect, beforeEach } from 'vitest';

// Mock minimal window for non-DOM environments
if (typeof window === 'undefined') {
  (global as any).window = {
    location: { origin: 'https://safe.com' }
  };
  (global as any).URL = URL;
}

import { load, validatePath } from '../../src/loader';

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

  it('fix: allows loading from same origin', () => {
    const sameOriginPath = `${window.location.origin}/agents/`;
    // Assert synchronously via validatePath: awaiting load() would hang in
    // jsdom because script/Image assets never fire load or error events.
    expect(validatePath(sameOriginPath)).toBe(sameOriginPath);
  });

  it('fix: allows loading from trusted origins', () => {
    const trustedOrigin = 'https://cdn.clippyjs.com';
    (window as any).CLIPPY_TRUSTED_ORIGINS = [trustedOrigin];
    const trustedPath = `${trustedOrigin}/agents/`;
    expect(validatePath(trustedPath)).toBe(trustedPath);
  });

  it('fix: rejects untrusted absolute URLs via validatePath', () => {
    expect(() => validatePath('https://malicious.com/evil'))
      .toThrow(/Security Error/);
  });
});
