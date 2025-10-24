import { describe, it, expect, beforeEach } from 'vitest';
import { DOMContextProvider } from '../../src/context/DOMContext';

describe('DOMContextProvider', () => {
  let provider: DOMContextProvider;

  beforeEach(() => {
    // Set up basic DOM
    document.body.innerHTML = `
      <div>
        <h1>Test Title</h1>
        <h2>Subtitle</h2>
        <p>Some visible text content</p>
        <form id="test-form">
          <input name="username" type="text" />
          <input name="password" type="password" />
        </form>
        <meta name="description" content="Test description" />
        <meta property="og:title" content="Test OG Title" />
      </div>
    `;

    provider = new DOMContextProvider();
  });

  it('should have correct name and be enabled by default', () => {
    expect(provider.name).toBe('dom');
    expect(provider.enabled).toBe(true);
  });

  it('should gather DOM context data', async () => {
    const context = await provider.gather();

    expect(context.provider).toBe('dom');
    expect(context.timestamp).toBeInstanceOf(Date);
    expect(context.data).toBeDefined();
  });

  it('should extract URL and title', async () => {
    const context = await provider.gather();
    const data = context.data;

    expect(data.url).toBe(window.location.href);
    expect(data.title).toBe(document.title);
  });

  it('should extract headings', async () => {
    const context = await provider.gather();
    const data = context.data;

    expect(data.headings).toBeInstanceOf(Array);
    expect(data.headings).toContain('Test Title');
    expect(data.headings).toContain('Subtitle');
  });

  it('should detect forms and fields', async () => {
    const context = await provider.gather();
    const data = context.data;

    expect(data.forms).toBeInstanceOf(Array);
    expect(data.forms).toHaveLength(1);
    expect(data.forms[0].id).toBe('test-form');
    expect(data.forms[0].fields).toContain('username');
    expect(data.forms[0].fields).toContain('password');
  });

  it('should extract visible text', async () => {
    const context = await provider.gather();
    const data = context.data;

    expect(data.visibleText).toContain('Test Title');
    expect(data.visibleText).toContain('Some visible text content');
  });

  it('should extract meta tags', async () => {
    const context = await provider.gather();
    const data = context.data;

    expect(data.meta).toBeDefined();
    expect(data.meta.description).toBe('Test description');
    expect(data.meta['og:title']).toBe('Test OG Title');
  });

  it('should always include context for any trigger', () => {
    expect(provider.shouldInclude('proactive')).toBe(true);
    expect(provider.shouldInclude('user-prompt')).toBe(true);
  });

  it('should limit visible text to 5000 characters', async () => {
    // Create very long text
    const longText = 'A'.repeat(10000);
    document.body.innerHTML = `<p>${longText}</p>`;

    const context = await provider.gather();
    const data = context.data;

    expect(data.visibleText.length).toBeLessThanOrEqual(5000);
  });

  it('should skip hidden elements', async () => {
    document.body.innerHTML = `
      <p>Visible text</p>
      <p style="display: none;">Hidden text</p>
      <p style="visibility: hidden;">Invisible text</p>
    `;

    const context = await provider.gather();
    const data = context.data;

    expect(data.visibleText).toContain('Visible text');
    expect(data.visibleText).not.toContain('Hidden text');
    expect(data.visibleText).not.toContain('Invisible text');
  });
});
