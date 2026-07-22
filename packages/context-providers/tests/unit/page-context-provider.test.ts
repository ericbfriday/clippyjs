import { describe, it, expect, beforeEach } from 'vitest';
import { PageContextProvider } from '../../src/page-context/page-context-provider.js';

describe('PageContextProvider', () => {
  let provider: PageContextProvider;

  beforeEach(() => {
    document.body.innerHTML = '';
    document.title = '';
    provider = new PageContextProvider();
  });

  describe('name', () => {
    it('should have name "page-context"', () => {
      expect(provider.name).toBe('page-context');
    });
  });

  describe('enabled', () => {
    it('should be enabled by default', () => {
      expect(provider.enabled).toBe(true);
    });
  });

  describe('shouldInclude', () => {
    it('should return true for proactive trigger', () => {
      expect(provider.shouldInclude('proactive')).toBe(true);
    });

    it('should return true for user-prompt trigger', () => {
      expect(provider.shouldInclude('user-prompt')).toBe(true);
    });

    it('should return true for any trigger', () => {
      expect(provider.shouldInclude('page-change' as never)).toBe(true);
    });
  });

  describe('gather', () => {
    it('should return ContextData with correct provider name', async () => {
      document.title = 'Test Page';
      document.body.innerHTML = '<h1>Test</h1><p>Content</p>';

      const result = await provider.gather();
      expect(result.provider).toBe('page-context');
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.data).toBeDefined();
    });

    it('should include url in page context', async () => {
      document.body.innerHTML = '<p>Content</p>';

      const result = await provider.gather();
      const data = result.data as Record<string, unknown>;
      expect(data.url).toBeDefined();
      expect(typeof data.url).toBe('string');
    });

    it('should include title from document', async () => {
      document.title = 'My Test Page';
      document.body.innerHTML = '<p>Content</p>';

      const result = await provider.gather();
      const data = result.data as Record<string, unknown>;
      expect(data.title).toBe('My Test Page');
    });

    it('should include viewport information', async () => {
      document.body.innerHTML = '<p>Content</p>';

      const result = await provider.gather();
      const data = result.data as Record<string, unknown>;
      const viewport = data.viewport as Record<string, unknown>;
      expect(viewport).toBeDefined();
      expect(typeof viewport.width).toBe('number');
      expect(typeof viewport.height).toBe('number');
    });

    it('should include content type', async () => {
      document.body.innerHTML = '<p>Simple content</p>';

      const result = await provider.gather();
      const data = result.data as Record<string, unknown>;
      expect(data.contentType).toBeDefined();
    });

    it('should include main topics', async () => {
      document.body.innerHTML = '<h1>TypeScript Programming</h1><p>Learn typescript</p>';

      const result = await provider.gather();
      const data = result.data as Record<string, unknown>;
      expect(data.mainTopics).toBeInstanceOf(Array);
    });

    it('should include heading structure', async () => {
      document.body.innerHTML = `
        <h1>Main Title</h1>
        <h2>Subtitle</h2>
        <h3>Sub-subtitle</h3>
      `;

      const result = await provider.gather();
      const data = result.data as Record<string, unknown>;
      const headings = data.headingStructure as Array<Record<string, unknown>>;
      expect(headings.length).toBe(3);
      expect(headings[0].level).toBe(1);
      expect(headings[0].text).toBe('Main Title');
    });

    it('should include landmark roles', async () => {
      document.body.innerHTML = `
        <header>Header</header>
        <nav>Nav</nav>
        <main>Main</main>
        <footer>Footer</footer>
      `;

      const result = await provider.gather();
      const data = result.data as Record<string, unknown>;
      const landmarks = data.landmarkRoles as Array<Record<string, unknown>>;
      expect(landmarks.length).toBeGreaterThan(0);
      const roles = landmarks.map((l) => l.role);
      expect(roles).toContain('main');
      expect(roles).toContain('navigation');
    });

    it('should detect interactive elements (buttons and links)', async () => {
      document.body.innerHTML = `
        <button id="btn1">Click</button>
        <a href="/page" id="link1">Go</a>
      `;

      const result = await provider.gather();
      const data = result.data as Record<string, unknown>;
      expect(data.buttons).toBeInstanceOf(Array);
      expect(data.links).toBeInstanceOf(Array);
    });

    it('should include form analysis', async () => {
      document.body.innerHTML = `
        <form id="test-form">
          <input type="text" name="field" />
        </form>
      `;

      const result = await provider.gather();
      const data = result.data as Record<string, unknown>;
      const forms = data.forms as Array<Record<string, unknown>>;
      expect(forms.length).toBe(1);
    });

    it('should include word count', async () => {
      document.body.innerHTML = '<p>one two three four five</p>';

      const result = await provider.gather();
      const data = result.data as Record<string, unknown>;
      expect(typeof data.wordCount).toBe('number');
      expect(data.wordCount as number).toBeGreaterThanOrEqual(5);
    });

    it('should include reading level', async () => {
      document.body.innerHTML = '<p>This is a simple sentence. Another sentence here.</p>';

      const result = await provider.gather();
      const data = result.data as Record<string, unknown>;
      expect(data.readingLevel).toBeDefined();
      expect(typeof data.readingLevel).toBe('string');
    });

    it('should include scroll position data', async () => {
      document.body.innerHTML = '<p>Content</p>';

      const result = await provider.gather();
      const data = result.data as Record<string, unknown>;
      expect(typeof data.scrollPosition).toBe('number');
      expect(typeof data.scrollDepth).toBe('number');
    });
  });
});
