import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InteractionDetector } from '../../src/interaction/interaction-detector.js';

describe('InteractionDetector', () => {
  let detector: InteractionDetector;

  beforeEach(() => {
    document.body.innerHTML = '';
    detector = new InteractionDetector();
  });

  afterEach(() => {
    detector.destroy();
  });

  describe('detectAll', () => {
    it('should detect buttons', () => {
      document.body.innerHTML = '<button id="btn1">Click Me</button>';
      const elements = detector.detectAll();
      expect(elements.length).toBe(1);
      expect(elements[0].type).toBe('button');
      expect(elements[0].id).toBe('btn1');
    });

    it('should detect links', () => {
      document.body.innerHTML = '<a href="/about" id="link1">About</a>';
      const elements = detector.detectAll();
      expect(elements.length).toBe(1);
      expect(elements[0].type).toBe('link');
    });

    it('should detect input fields by type', () => {
      document.body.innerHTML = `
        <input type="text" id="name" />
        <input type="email" id="email" />
        <input type="password" id="pass" />
        <input type="checkbox" id="check" />
        <input type="radio" id="radio" />
        <input type="number" id="num" />
        <input type="file" id="file" />
      `;
      const elements = detector.detectAll();
      const types = elements.map((el) => el.type);
      expect(types).toContain('input-text');
      expect(types).toContain('input-email');
      expect(types).toContain('input-password');
      expect(types).toContain('input-checkbox');
      expect(types).toContain('input-radio');
      expect(types).toContain('input-number');
      expect(types).toContain('input-file');
    });

    it('should detect select elements', () => {
      document.body.innerHTML = '<select id="sel"><option>A</option></select>';
      const elements = detector.detectAll();
      expect(elements.length).toBe(1);
      expect(elements[0].type).toBe('select');
    });

    it('should detect textarea elements', () => {
      document.body.innerHTML = '<textarea id="ta"></textarea>';
      const elements = detector.detectAll();
      expect(elements.length).toBe(1);
      expect(elements[0].type).toBe('textarea');
    });

    it('should detect ARIA role elements', () => {
      document.body.innerHTML = `
        <div role="button" id="rb">Custom Button</div>
        <div role="link" id="rl">Custom Link</div>
        <div role="menuitem" id="mi">Menu Item</div>
        <div role="tab" id="tb">Tab</div>
      `;
      const elements = detector.detectAll();
      expect(elements.length).toBe(4);
      const types = elements.map((el) => el.type);
      expect(types).toContain('button');
      expect(types).toContain('link');
      expect(types).toContain('menuitem');
      expect(types).toContain('tab');
    });

    it('should detect elements with tabindex', () => {
      document.body.innerHTML = '<div tabindex="0" id="focusable">Focusable</div>';
      const elements = detector.detectAll();
      expect(elements.length).toBe(1);
    });

    it('should not detect tabindex=-1 elements', () => {
      document.body.innerHTML = '<div tabindex="-1">Not focusable</div>';
      const elements = detector.detectAll();
      expect(elements.length).toBe(0);
    });

    it('should detect summary elements', () => {
      document.body.innerHTML = '<details><summary id="s1">Expand</summary><p>Details</p></details>';
      const elements = detector.detectAll();
      expect(elements.length).toBe(1);
      expect(elements[0].type).toBe('accordion');
    });

    it('should detect elements with onclick', () => {
      document.body.innerHTML = '<div onclick="doSomething()" id="clk">Clickable</div>';
      const elements = detector.detectAll();
      expect(elements.length).toBe(1);
    });

    it('should cap elements at 200', () => {
      const buttons = Array(210)
        .fill(0)
        .map((_, i) => `<button id="btn-${i}">B${i}</button>`)
        .join('');
      document.body.innerHTML = buttons;
      const elements = detector.detectAll();
      expect(elements.length).toBeLessThanOrEqual(200);
    });

    it('should use data-testid as id when no id attribute', () => {
      document.body.innerHTML = '<button data-testid="submit-btn">Submit</button>';
      const elements = detector.detectAll();
      expect(elements[0].id).toBe('submit-btn');
    });

    it('should generate id from tag and index when no id or data-testid', () => {
      document.body.innerHTML = '<button>No ID</button>';
      const elements = detector.detectAll();
      expect(elements[0].id).toMatch(/^button-\d+$/);
    });
  });

  describe('getByType', () => {
    it('should filter elements by type', () => {
      document.body.innerHTML = `
        <button id="b1">Btn</button>
        <a href="/x" id="l1">Link</a>
        <button id="b2">Btn2</button>
      `;
      detector.detectAll();
      const buttons = detector.getByType('button');
      expect(buttons.length).toBe(2);
      buttons.forEach((b) => expect(b.type).toBe('button'));
    });

    it('should return empty array when no elements match', () => {
      document.body.innerHTML = '<button id="b1">Btn</button>';
      detector.detectAll();
      const selects = detector.getByType('select');
      expect(selects.length).toBe(0);
    });
  });

  describe('getByAction', () => {
    it('should find link element by href action', () => {
      document.body.innerHTML = '<a href="/save-page" id="save-link">Save</a>';
      detector.detectAll();
      const el = detector.getByAction('/save-page');
      expect(el).toBeDefined();
      expect(el?.id).toBe('save-link');
    });

    it('should be case-insensitive', () => {
      document.body.innerHTML = '<a href="/DELETE-item" id="del">Delete</a>';
      detector.detectAll();
      const el = detector.getByAction('delete');
      expect(el).toBeDefined();
    });

    it('should find input by type:name action', () => {
      document.body.innerHTML = '<input type="email" name="user_email" id="em" />';
      detector.detectAll();
      const el = detector.getByAction('email');
      expect(el).toBeDefined();
    });

    it('should return undefined when no match', () => {
      document.body.innerHTML = '<a href="/about" id="l1">About</a>';
      detector.detectAll();
      const el = detector.getByAction('nonexistent');
      expect(el).toBeUndefined();
    });
  });

  describe('element properties', () => {
    it('should extract aria-label as label', () => {
      document.body.innerHTML = '<button aria-label="Close dialog" id="close">X</button>';
      const elements = detector.detectAll();
      expect(elements[0].label).toBe('Close dialog');
    });

    it('should extract title as label fallback', () => {
      document.body.innerHTML = '<button title="Submit form" id="sub"></button>';
      const elements = detector.detectAll();
      expect(elements[0].label).toBe('Submit form');
    });

    it('should build selector with id when available', () => {
      document.body.innerHTML = '<button id="my-btn">Click</button>';
      const elements = detector.detectAll();
      expect(elements[0].selector).toBe('#my-btn');
    });

    it('should build selector with tag.class when no id', () => {
      document.body.innerHTML = '<button class="primary large">Click</button>';
      const elements = detector.detectAll();
      expect(elements[0].selector).toBe('button.primary.large');
    });

    it('should infer action as href for links', () => {
      document.body.innerHTML = '<a href="/about" id="about-link">About</a>';
      const elements = detector.detectAll();
      expect(elements[0].action).toContain('/about');
    });

    it('should infer action for buttons (via innerText)', () => {
      document.body.innerHTML = '<button id="sub">Submit Form</button>';
      const elements = detector.detectAll();
      expect(typeof elements[0].action).toBe('string');
    });

    it('should infer action as type:name for inputs', () => {
      document.body.innerHTML = '<input type="email" name="user_email" id="em" />';
      const elements = detector.detectAll();
      expect(elements[0].action).toBe('email:user_email');
    });

    it('should extract description from aria-describedby', () => {
      document.body.innerHTML = `
        <span id="help-text">Enter your full name</span>
        <input type="text" aria-describedby="help-text" id="name-input" />
      `;
      const elements = detector.detectAll();
      const input = elements.find((el) => el.id === 'name-input');
      expect(input?.description).toBe('Enter your full name');
    });

    it('should report element state', () => {
      document.body.innerHTML = '<button id="test-btn" disabled>Disabled</button>';
      const elements = detector.detectAll();
      expect(elements[0].state.enabled).toBe(false);
    });
  });

  describe('watchForChanges', () => {
    it('should call callback when DOM changes', async () => {
      vi.useFakeTimers();
      const callback = vi.fn();
      const cleanup = detector.watchForChanges(callback);

      const btn = document.createElement('button');
      btn.id = 'new-btn';
      btn.textContent = 'New Button';
      document.body.appendChild(btn);

      await vi.advanceTimersByTimeAsync(350);

      expect(callback).toHaveBeenCalled();
      const elements = callback.mock.calls[0][0];
      expect(elements.length).toBeGreaterThan(0);

      cleanup();
      vi.useRealTimers();
    });

    it('should return cleanup function that stops observation', async () => {
      vi.useFakeTimers();
      const callback = vi.fn();
      const cleanup = detector.watchForChanges(callback);
      cleanup();

      document.body.appendChild(document.createElement('button'));
      await vi.advanceTimersByTimeAsync(350);

      expect(callback).not.toHaveBeenCalled();
      vi.useRealTimers();
    });
  });

  describe('destroy', () => {
    it('should clear tracked elements', () => {
      document.body.innerHTML = '<button id="b1">B</button>';
      detector.detectAll();
      expect(detector.getByType('button').length).toBe(1);

      detector.destroy();
      expect(detector.getByType('button').length).toBe(0);
    });

    it('should disconnect observer', () => {
      const callback = vi.fn();
      detector.watchForChanges(callback);
      detector.destroy();
    });
  });
});
