import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ClippyEmbedder } from '../../src/core/embedder.js';

if (typeof CSSStyleSheet === 'undefined' || !CSSStyleSheet.prototype.replaceSync) {
  global.CSSStyleSheet = class {
    replaceSync(_css: string) {}
  } as unknown as typeof CSSStyleSheet;
}

describe('ClippyEmbedder Integration', () => {
  let embedder: ClippyEmbedder;

  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = `
      <header><nav><a href="/">Home</a><a href="/about">About</a></nav></header>
      <main>
        <h1>Welcome to Test App</h1>
        <p>This is a test page with enough content to be analyzed properly by the semantic extractor.</p>
        <form id="contact-form">
          <label for="name">Name</label>
          <input type="text" id="name" name="name" required />
          <label for="email">Email</label>
          <input type="email" id="email" name="email" required />
          <button type="submit">Submit</button>
        </form>
      </main>
      <footer>Footer content</footer>
    `;
    document.title = 'Test App - Welcome';
  });

  afterEach(() => {
    embedder?.destroy();
    vi.useRealTimers();
  });

  it('should complete full embedding lifecycle', async () => {
    embedder = new ClippyEmbedder({
      apiKey: 'test-integration-key',
      position: 'bottom-right',
      theme: 'light',
      zIndex: 10000,
    });

    expect(document.querySelector('[data-clippy-host]')).toBeNull();

    await embedder.init();

    const host = document.querySelector('[data-clippy-host]') as HTMLElement;
    expect(host).not.toBeNull();
    expect(host.getAttribute('data-position')).toBe('bottom-right');
    expect(host.shadowRoot).not.toBeNull();

    const shadow = host.shadowRoot!;
    expect(shadow.querySelector('.clippy-container')).not.toBeNull();
    expect(shadow.querySelector('.clippy-agent')).not.toBeNull();
    expect(shadow.querySelector('.clippy-balloon')).not.toBeNull();
    expect(shadow.querySelector('.clippy-chat')).not.toBeNull();
  });

  it('should gather context with page and behavior data', async () => {
    embedder = new ClippyEmbedder({ apiKey: 'test-integration-key' });
    await embedder.init();

    const context = await embedder.gatherContext();

    expect(context.page).not.toBeNull();
    expect(context.behavior).not.toBeNull();

    const page = context.page as Record<string, unknown>;
    expect(page.title).toBe('Test App - Welcome');
    expect(page.url).toBeDefined();
    expect(page.contentType).toBeDefined();
    expect(page.sections).toBeInstanceOf(Array);
    expect(page.buttons).toBeInstanceOf(Array);
    expect(page.links).toBeInstanceOf(Array);
    expect(page.forms).toBeInstanceOf(Array);

    const forms = page.forms as Array<Record<string, unknown>>;
    expect(forms.length).toBe(1);
    expect(forms[0].id).toBe('contact-form');
  });

  it('should show and hide balloon messages', async () => {
    embedder = new ClippyEmbedder({ apiKey: 'test-integration-key' });
    await embedder.init();

    const host = document.querySelector('[data-clippy-host]') as HTMLElement;
    const shadow = host.shadowRoot!;
    const balloon = shadow.querySelector('.clippy-balloon') as HTMLElement;

    expect(balloon.hidden).toBe(true);

    embedder.showMessage('It looks like you need help!');
    expect(balloon.hidden).toBe(false);
    expect(balloon.textContent).toBe('It looks like you need help!');

    embedder.hideMessage();
    expect(balloon.hidden).toBe(true);
  });

  it('should clean up completely on destroy', async () => {
    embedder = new ClippyEmbedder({ apiKey: 'test-integration-key' });
    await embedder.init();

    expect(document.querySelector('[data-clippy-host]')).not.toBeNull();

    embedder.destroy();

    expect(document.querySelector('[data-clippy-host]')).toBeNull();
  });

  it('should track user behavior across the lifecycle', async () => {
    embedder = new ClippyEmbedder({ apiKey: 'test-integration-key' });
    await embedder.init();

    document.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    document.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    const context = await embedder.gatherContext();
    const behavior = context.behavior as Record<string, unknown>;
    expect(behavior.clickCount as number).toBeGreaterThanOrEqual(2);
    expect(typeof behavior.sessionDuration).toBe('number');
  });

  it('should detect form fields on the page', async () => {
    embedder = new ClippyEmbedder({ apiKey: 'test-integration-key' });
    await embedder.init();

    const context = await embedder.gatherContext();
    const page = context.page as Record<string, unknown>;
    const forms = page.forms as Array<Record<string, unknown>>;

    expect(forms.length).toBe(1);
    const fields = forms[0].fields as Array<Record<string, unknown>>;
    expect(fields.length).toBe(2);

    const names = fields.map((f) => f.name);
    expect(names).toContain('name');
    expect(names).toContain('email');
  });

  it('should support re-initialization after destroy', async () => {
    embedder = new ClippyEmbedder({ apiKey: 'test-integration-key' });

    await embedder.init();
    expect(document.querySelector('[data-clippy-host]')).not.toBeNull();

    embedder.destroy();
    expect(document.querySelector('[data-clippy-host]')).toBeNull();

    await embedder.init();
    expect(document.querySelector('[data-clippy-host]')).not.toBeNull();

    embedder.showMessage('Back again!');
    const host = document.querySelector('[data-clippy-host]') as HTMLElement;
    const balloon = host.shadowRoot!.querySelector('.clippy-balloon') as HTMLElement;
    expect(balloon.textContent).toBe('Back again!');
  });
});
