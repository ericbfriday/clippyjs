import { describe, it, expect, beforeEach } from 'vitest';
import { SemanticExtractor } from '../../src/semantic/semantic-extractor.js';

describe('SemanticExtractor', () => {
  let extractor: SemanticExtractor;

  beforeEach(() => {
    document.body.innerHTML = '';
    document.title = '';
    extractor = new SemanticExtractor();
  });

  describe('extractTitle', () => {
    it('should return document.title when available', () => {
      document.title = 'My Page Title';
      expect(extractor.extractTitle()).toBe('My Page Title');
    });

    it('should fall back to h1 when document.title is empty', () => {
      document.title = '';
      document.body.innerHTML = '<h1>Heading Title</h1>';
      expect(extractor.extractTitle()).toBe('Heading Title');
    });

    it('should fall back to og:title meta tag', () => {
      document.title = '';
      document.body.innerHTML = '';
      const meta = document.createElement('meta');
      meta.setAttribute('property', 'og:title');
      meta.content = 'OG Title';
      document.head.appendChild(meta);

      expect(extractor.extractTitle()).toBe('OG Title');
      document.head.removeChild(meta);
    });

    it('should fall back to any heading element', () => {
      document.title = '';
      document.body.innerHTML = '<h3>Fallback Heading</h3>';
      expect(extractor.extractTitle()).toBe('Fallback Heading');
    });

    it('should return empty string when no title source exists', () => {
      document.title = '';
      document.body.innerHTML = '<p>No headings here</p>';
      expect(extractor.extractTitle()).toBe('');
    });

    it('should trim whitespace from title', () => {
      document.title = '  Spaced Title  ';
      expect(extractor.extractTitle()).toBe('Spaced Title');
    });
  });

  describe('extractDescription', () => {
    it('should extract from meta description tag', () => {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'This is a meta description for the page.';
      document.head.appendChild(meta);

      expect(extractor.extractDescription()).toBe(
        'This is a meta description for the page.',
      );
      document.head.removeChild(meta);
    });

    it('should fall back to og:description', () => {
      const meta = document.createElement('meta');
      meta.setAttribute('property', 'og:description');
      meta.content = 'OG description content here.';
      document.head.appendChild(meta);

      expect(extractor.extractDescription()).toBe(
        'OG description content here.',
      );
      document.head.removeChild(meta);
    });

    it('should fall back to first long paragraph', () => {
      const longText =
        'This is a paragraph that is definitely longer than fifty characters, so it should be used as the description.';
      document.body.innerHTML = `<p>${longText}</p>`;
      expect(extractor.extractDescription()).toBe(longText);
    });

    it('should skip short paragraphs', () => {
      document.body.innerHTML = '<p>Short</p>';
      expect(extractor.extractDescription()).toBe('');
    });

    it('should truncate description to 300 characters', () => {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'A'.repeat(400);
      document.head.appendChild(meta);

      expect(extractor.extractDescription().length).toBe(300);
      document.head.removeChild(meta);
    });

    it('should return empty string when no description source exists', () => {
      document.body.innerHTML = '<div>No paragraphs</div>';
      expect(extractor.extractDescription()).toBe('');
    });
  });

  describe('extractTopics', () => {
    it('should extract topics from meta keywords', async () => {
      const meta = document.createElement('meta');
      meta.name = 'keywords';
      meta.content = 'typescript, javascript, react';
      document.head.appendChild(meta);
      document.body.innerHTML = '<p>Some content</p>';

      const topics = await extractor.extractTopics();
      expect(topics).toContain('typescript');
      expect(topics).toContain('javascript');
      expect(topics).toContain('react');
      document.head.removeChild(meta);
    });

    it('should extract topics from headings', async () => {
      document.body.innerHTML =
        '<h1>TypeScript Programming</h1><h2>Advanced Patterns</h2>';

      const topics = await extractor.extractTopics();
      expect(topics).toContain('typescript');
      expect(topics).toContain('programming');
    });

    it('should return max 10 topics', async () => {
      const meta = document.createElement('meta');
      meta.name = 'keywords';
      meta.content =
        'topic1, topic2, topic3, topic4, topic5, topic6, topic7, topic8, topic9, topic10, topic11, topic12';
      document.head.appendChild(meta);
      document.body.innerHTML = '<p>Content</p>';

      const topics = await extractor.extractTopics();
      expect(topics.length).toBeLessThanOrEqual(10);
      document.head.removeChild(meta);
    });

    it('should filter out stop words', async () => {
      document.body.innerHTML =
        '<h1>The quick brown fox and the lazy dog</h1>';

      const topics = await extractor.extractTopics();
      expect(topics).not.toContain('the');
      expect(topics).not.toContain('and');
      expect(topics).toContain('quick');
    });
  });

  describe('classifyContentType', () => {
    it('should detect product pages with schema.org markup', async () => {
      document.body.innerHTML =
        '<div itemscope itemtype="https://schema.org/Product"><span itemprop="name">Widget</span></div>';
      const contentType = await extractor.classifyContentType();
      expect(contentType).toBe('product');
    });

    it('should detect article pages with schema.org markup', async () => {
      document.body.innerHTML =
        '<div itemscope itemtype="https://schema.org/Article"><p>Article content</p></div>';
      const contentType = await extractor.classifyContentType();
      expect(contentType).toBe('article');
    });

    it('should detect article pages from long article element', async () => {
      const words = Array(350).fill('word').join(' ');
      document.body.innerHTML = `<article>${words}</article>`;
      const contentType = await extractor.classifyContentType();
      expect(contentType).toBe('article');
    });

    it('should detect form pages with 3+ forms', async () => {
      document.body.innerHTML =
        '<form><input /></form><form><input /></form><form><input /></form>';
      const contentType = await extractor.classifyContentType();
      expect(contentType).toBe('form');
    });

    it('should detect product-listing pages', async () => {
      document.body.innerHTML =
        '<div class="product">A</div><div class="product">B</div><div class="product">C</div>';
      const contentType = await extractor.classifyContentType();
      expect(contentType).toBe('product-listing');
    });

    it('should detect form in main area', async () => {
      document.body.innerHTML =
        '<main><form><input type="text" /><button>Submit</button></form></main>';
      const contentType = await extractor.classifyContentType();
      expect(contentType).toBe('form');
    });

    it('should detect dashboard with multiple sections', async () => {
      document.body.innerHTML =
        '<main><section>Panel 1</section><section>Panel 2</section></main>';
      const contentType = await extractor.classifyContentType();
      expect(contentType).toBe('dashboard');
    });

    it('should detect documentation with h1 and long prose', async () => {
      const words = Array(600).fill('documentation').join(' ');
      document.body.innerHTML = `<h1>API Reference</h1><p>${words}</p>`;
      const contentType = await extractor.classifyContentType();
      expect(contentType).toBe('documentation');
    });

    it('should return unknown for unclassifiable pages', async () => {
      document.body.innerHTML = '<div>Simple content</div>';
      const contentType = await extractor.classifyContentType();
      expect(contentType).toBe('unknown');
    });
  });

  describe('extractSections', () => {
    it('should extract sections from landmark elements', () => {
      document.body.innerHTML = `
        <header>Header content</header>
        <main>Main content</main>
        <footer>Footer content</footer>
      `;
      const sections = extractor.extractSections();
      expect(sections.length).toBeGreaterThanOrEqual(3);
    });

    it('should set correct section types', () => {
      document.body.innerHTML = `
        <header>Header</header>
        <main>Main</main>
        <aside>Sidebar</aside>
        <footer>Footer</footer>
      `;
      const sections = extractor.extractSections();
      const types = sections.map((s) => s.type);
      expect(types).toContain('header');
      expect(types).toContain('main');
      expect(types).toContain('sidebar');
      expect(types).toContain('footer');
    });

    it('should use heading text as section title when present', () => {
      document.body.innerHTML = '<section><h2>Section Title</h2><p>Content</p></section>';
      const sections = extractor.extractSections();
      expect(sections[0].title).toBe('Section Title');
    });

    it('should limit sections to MAX_SECTIONS (20)', () => {
      const sectionHtml = Array(25)
        .fill('<section>Content</section>')
        .join('');
      document.body.innerHTML = sectionHtml;
      const sections = extractor.extractSections();
      expect(sections.length).toBeLessThanOrEqual(20);
    });

    it('should skip empty sections', () => {
      document.body.innerHTML = '<section></section><section>Has content</section>';
      const sections = extractor.extractSections();
      expect(sections.length).toBe(1);
      expect(sections[0].content).toContain('Has content');
    });

    it('should truncate section content to 500 chars', () => {
      const longContent = 'A'.repeat(600);
      document.body.innerHTML = `<section>${longContent}</section>`;
      const sections = extractor.extractSections();
      expect(sections[0].content.length).toBeLessThanOrEqual(500);
    });

    it('should assign importance based on tag', () => {
      document.body.innerHTML = `
        <main>Main content</main>
        <header>Header content</header>
        <aside>Side content</aside>
      `;
      const sections = extractor.extractSections();
      const mainSection = sections.find((s) => s.type === 'main');
      const headerSection = sections.find((s) => s.type === 'header');
      const sidebarSection = sections.find((s) => s.type === 'sidebar');

      expect(mainSection?.importance).toBe(1.0);
      expect(headerSection?.importance).toBe(0.8);
      expect(sidebarSection?.importance).toBe(0.3);
    });
  });

  describe('extractEntities', () => {
    it('should extract price entities', () => {
      document.body.innerHTML = '<p>The price is $29.99 and shipping is $5</p>';
      const entities = extractor.extractEntities();
      const prices = entities.filter((e) => e.type === 'price');
      expect(prices.length).toBe(2);
      expect(prices[0].text).toBe('$29.99');
      expect(prices[1].text).toBe('$5');
    });

    it('should extract date entities', () => {
      document.body.innerHTML = '<p>Published on Jan 15, 2024</p>';
      const entities = extractor.extractEntities();
      const dates = entities.filter((e) => e.type === 'date');
      expect(dates.length).toBe(1);
      expect(dates[0].text).toBe('Jan 15, 2024');
    });

    it('should extract product entities from schema.org markup', () => {
      document.body.innerHTML = `
        <div itemscope itemtype="https://schema.org/Product">
          <span itemprop="name">Super Widget</span>
        </div>
      `;
      const entities = extractor.extractEntities();
      const products = entities.filter((e) => e.type === 'product');
      expect(products.length).toBe(1);
      expect(products[0].text).toBe('Super Widget');
    });

    it('should extract organization entities from schema.org markup', () => {
      document.body.innerHTML = `
        <div itemscope itemtype="https://schema.org/Organization">
          <span itemprop="name">Acme Corp</span>
        </div>
      `;
      const entities = extractor.extractEntities();
      const orgs = entities.filter((e) => e.type === 'organization');
      expect(orgs.length).toBe(1);
      expect(orgs[0].text).toBe('Acme Corp');
    });

    it('should deduplicate entities', () => {
      document.body.innerHTML = '<p>$10 and $10 and $10</p>';
      const entities = extractor.extractEntities();
      const prices = entities.filter((e) => e.type === 'price');
      expect(prices.length).toBe(1);
    });

    it('should set confidence to 0.8 for all entities', () => {
      document.body.innerHTML = '<p>$99.99 on Jan 1, 2024</p>';
      const entities = extractor.extractEntities();
      for (const entity of entities) {
        expect(entity.confidence).toBe(0.8);
      }
    });

    it('should limit to 20 entities', () => {
      const prices = Array(25)
        .fill(0)
        .map((_, i) => `$${i + 1}`)
        .join(' ');
      document.body.innerHTML = `<p>${prices}</p>`;
      const entities = extractor.extractEntities();
      expect(entities.length).toBeLessThanOrEqual(20);
    });
  });

  describe('extract (full pipeline)', () => {
    it('should return complete SemanticContent object', async () => {
      document.title = 'Test Page';
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'A test page description that is long enough to be picked up.';
      document.head.appendChild(meta);
      document.body.innerHTML = `
        <main>
          <h1>Welcome</h1>
          <p>Some content with $19.99 price</p>
        </main>
      `;

      const result = await extractor.extract();

      expect(result.title).toBe('Test Page');
      expect(result.description).toContain('test page description');
      expect(result.contentType).toBeDefined();
      expect(result.mainTopics).toBeInstanceOf(Array);
      expect(result.sections).toBeInstanceOf(Array);
      expect(result.entities).toBeInstanceOf(Array);

      document.head.removeChild(meta);
    });
  });
});
