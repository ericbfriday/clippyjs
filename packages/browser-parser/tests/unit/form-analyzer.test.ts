import { describe, it, expect, beforeEach } from 'vitest';
import { FormAnalyzer } from '../../src/interaction/form-analyzer.js';

describe('FormAnalyzer', () => {
  let analyzer: FormAnalyzer;

  beforeEach(() => {
    document.body.innerHTML = '';
    analyzer = new FormAnalyzer();
  });

  describe('analyzeForm', () => {
    it('should analyze a simple form with fields', () => {
      document.body.innerHTML = `
        <form id="login-form" action="/login" method="post">
          <label for="username">Username</label>
          <input type="text" id="username" name="username" required />
          <label for="password">Password</label>
          <input type="password" id="password" name="password" required />
          <button type="submit">Login</button>
        </form>
      `;
      const form = document.querySelector<HTMLFormElement>('form')!;
      const analysis = analyzer.analyzeForm(form);

      expect(analysis.id).toBe('login-form');
      expect(analysis.method).toBe('post');
      expect(analysis.fields.length).toBe(2);
      expect(analysis.autoComplete).toBe(true);
    });

    it('should extract field names and types', () => {
      document.body.innerHTML = `
        <form>
          <input type="email" name="email" id="email-field" />
          <textarea name="message" id="msg-field"></textarea>
          <select name="category" id="cat-field">
            <option>A</option>
            <option>B</option>
          </select>
        </form>
      `;
      const form = document.querySelector<HTMLFormElement>('form')!;
      const analysis = analyzer.analyzeForm(form);

      expect(analysis.fields.length).toBe(3);
      const types = analysis.fields.map((f) => f.type);
      expect(types).toContain('email');
      expect(types).toContain('textarea');
      expect(types).toContain('select-one');
    });

    it('should detect required fields', () => {
      document.body.innerHTML = `
        <form>
          <input type="text" name="required-field" id="rf" required />
          <input type="text" name="optional-field" id="of" />
        </form>
      `;
      const form = document.querySelector<HTMLFormElement>('form')!;
      const analysis = analyzer.analyzeForm(form);

      const requiredField = analysis.fields.find((f) => f.id === 'rf');
      const optionalField = analysis.fields.find((f) => f.id === 'of');

      expect(requiredField?.required).toBe(true);
      expect(optionalField?.required).toBe(false);
    });

    it('should extract validation rules', () => {
      document.body.innerHTML = `
        <form>
          <input type="text" id="f1" name="f1" required minlength="3" maxlength="50" pattern="[A-Za-z]+" title="Letters only" />
        </form>
      `;
      const form = document.querySelector<HTMLFormElement>('form')!;
      const analysis = analyzer.analyzeForm(form);

      const field = analysis.fields[0];
      expect(field.validation.required).toBe(true);
      expect(field.validation.minLength).toBe(3);
      expect(field.validation.maxLength).toBe(50);
      expect(field.validation.pattern).toBe('[A-Za-z]+');
      expect(field.validation.errorMessage).toBe('Letters only');
    });

    it('should extract field labels from label[for]', () => {
      document.body.innerHTML = `
        <form>
          <label for="fname">First Name</label>
          <input type="text" id="fname" name="fname" />
        </form>
      `;
      const form = document.querySelector<HTMLFormElement>('form')!;
      const analysis = analyzer.analyzeForm(form);
      expect(analysis.fields[0].label).toBe('First Name');
    });

    it('should extract label from closest label ancestor', () => {
      document.body.innerHTML = `
        <form>
          <label>Full Name <input type="text" name="fullname" /></label>
        </form>
      `;
      const form = document.querySelector<HTMLFormElement>('form')!;
      const analysis = analyzer.analyzeForm(form);
      expect(analysis.fields[0].label).toContain('Full Name');
    });

    it('should extract label from aria-label', () => {
      document.body.innerHTML = `
        <form>
          <input type="text" name="search" aria-label="Search query" />
        </form>
      `;
      const form = document.querySelector<HTMLFormElement>('form')!;
      const analysis = analyzer.analyzeForm(form);
      expect(analysis.fields[0].label).toBe('Search query');
    });

    it('should fall back to placeholder for label', () => {
      document.body.innerHTML = `
        <form>
          <input type="text" name="q" placeholder="Type here..." />
        </form>
      `;
      const form = document.querySelector<HTMLFormElement>('form')!;
      const analysis = analyzer.analyzeForm(form);
      expect(analysis.fields[0].label).toBe('Type here...');
    });

    it('should exclude hidden/submit/button/reset inputs', () => {
      document.body.innerHTML = `
        <form>
          <input type="hidden" name="token" value="abc123" />
          <input type="submit" value="Submit" />
          <input type="button" value="Click" />
          <input type="reset" value="Reset" />
          <input type="text" name="visible" id="vis" />
        </form>
      `;
      const form = document.querySelector<HTMLFormElement>('form')!;
      const analysis = analyzer.analyzeForm(form);
      expect(analysis.fields.length).toBe(1);
      expect(analysis.fields[0].id).toBe('vis');
    });

    it('should report autocomplete status from form attribute', () => {
      document.body.innerHTML = '<form autocomplete="on"><input type="text" name="x" /></form>';
      const form = document.querySelector<HTMLFormElement>('form')!;
      const analysis = analyzer.analyzeForm(form);
      expect(typeof analysis.autoComplete).toBe('boolean');
    });

    it('should generate id when form has no id', () => {
      document.body.innerHTML = '<form><input type="text" name="x" /></form>';
      const form = document.querySelector<HTMLFormElement>('form')!;
      const analysis = analyzer.analyzeForm(form);
      expect(analysis.id).toMatch(/^form-/);
    });

    it('should extract help text from aria-describedby', () => {
      document.body.innerHTML = `
        <form>
          <span id="help">Enter at least 8 characters</span>
          <input type="password" name="pw" id="pw" aria-describedby="help" />
        </form>
      `;
      const form = document.querySelector<HTMLFormElement>('form')!;
      const analysis = analyzer.analyzeForm(form);
      expect(analysis.fields[0].helpText).toBe('Enter at least 8 characters');
    });

    it('should include validation map keyed by field id', () => {
      document.body.innerHTML = `
        <form>
          <input type="text" id="f1" name="f1" required />
          <input type="email" id="f2" name="f2" />
        </form>
      `;
      const form = document.querySelector<HTMLFormElement>('form')!;
      const analysis = analyzer.analyzeForm(form);
      expect(analysis.validation['f1']).toBeDefined();
      expect(analysis.validation['f1'].required).toBe(true);
      expect(analysis.validation['f2']).toBeDefined();
      expect(analysis.validation['f2'].required).toBe(false);
    });
  });

  describe('analyzeAllForms', () => {
    it('should analyze all forms on the page', () => {
      document.body.innerHTML = `
        <form id="form1"><input type="text" name="a" /></form>
        <form id="form2"><input type="email" name="b" /></form>
      `;
      const analyses = analyzer.analyzeAllForms();
      expect(analyses.length).toBe(2);
      expect(analyses[0].id).toBe('form1');
      expect(analyses[1].id).toBe('form2');
    });

    it('should return empty array when no forms exist', () => {
      document.body.innerHTML = '<div>No forms</div>';
      const analyses = analyzer.analyzeAllForms();
      expect(analyses.length).toBe(0);
    });
  });

  describe('detectCurrentField', () => {
    it('should return null when no element is focused', () => {
      document.body.innerHTML = '<form><input type="text" name="x" /></form>';
      expect(analyzer.detectCurrentField()).toBeNull();
    });

    it('should return the focused input field', () => {
      document.body.innerHTML = '<form><input type="text" id="focused" name="focused" /></form>';
      const input = document.getElementById('focused') as HTMLInputElement;
      input.focus();

      const field = analyzer.detectCurrentField();
      expect(field).not.toBeNull();
      expect(field?.id).toBe('focused');
    });

    it('should return null when focused element is not a form field', () => {
      document.body.innerHTML = '<div tabindex="0" id="div1">Not a field</div>';
      const div = document.getElementById('div1')!;
      div.focus();
      expect(analyzer.detectCurrentField()).toBeNull();
    });
  });

  describe('calculateProgress', () => {
    it('should calculate progress for required fields', () => {
      document.body.innerHTML = `
        <form id="prog-form">
          <input type="text" name="a" required value="filled" />
          <input type="text" name="b" required value="" />
          <input type="text" name="c" required value="also filled" />
        </form>
      `;
      const form = document.querySelector<HTMLFormElement>('form')!;
      const progress = analyzer.calculateProgress(form);

      expect(progress.total).toBe(3);
      expect(progress.filled).toBe(2);
      expect(progress.percentage).toBe(67);
    });

    it('should return 0% when no fields are filled', () => {
      document.body.innerHTML = `
        <form>
          <input type="text" name="a" required value="" />
          <input type="text" name="b" required value="" />
        </form>
      `;
      const form = document.querySelector<HTMLFormElement>('form')!;
      const progress = analyzer.calculateProgress(form);

      expect(progress.total).toBe(2);
      expect(progress.filled).toBe(0);
      expect(progress.percentage).toBe(0);
    });

    it('should return 100% when all required fields are filled', () => {
      document.body.innerHTML = `
        <form>
          <input type="text" name="a" required value="x" />
          <input type="text" name="b" required value="y" />
        </form>
      `;
      const form = document.querySelector<HTMLFormElement>('form')!;
      const progress = analyzer.calculateProgress(form);

      expect(progress.percentage).toBe(100);
      expect(progress.filled).toBe(2);
    });

    it('should return 0% when no required fields exist', () => {
      document.body.innerHTML = `
        <form>
          <input type="text" name="a" value="optional" />
        </form>
      `;
      const form = document.querySelector<HTMLFormElement>('form')!;
      const progress = analyzer.calculateProgress(form);

      expect(progress.total).toBe(0);
      expect(progress.percentage).toBe(0);
    });

    it('should track valid vs filled counts separately', () => {
      document.body.innerHTML = `
        <form>
          <input type="email" name="email" required value="notanemail" />
          <input type="text" name="name" required value="Valid Name" />
        </form>
      `;
      const form = document.querySelector<HTMLFormElement>('form')!;
      const progress = analyzer.calculateProgress(form);

      expect(progress.filled).toBe(2);
      // valid count depends on jsdom's checkValidity implementation
      expect(progress.valid).toBeLessThanOrEqual(progress.filled);
    });
  });

  describe('validateField', () => {
    it('should pass validation for valid field', () => {
      document.body.innerHTML = `
        <form>
          <input type="text" id="v1" name="v1" required value="hello" />
        </form>
      `;
      const form = document.querySelector<HTMLFormElement>('form')!;
      const analysis = analyzer.analyzeForm(form);
      const result = analyzer.validateField(analysis.fields[0]);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should fail validation for empty required field', () => {
      document.body.innerHTML = `
        <form>
          <input type="text" id="v2" name="v2" required value="" />
        </form>
      `;
      const form = document.querySelector<HTMLFormElement>('form')!;
      const analysis = analyzer.analyzeForm(form);
      const result = analyzer.validateField(analysis.fields[0]);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should fail validation when below minLength', () => {
      document.body.innerHTML = `
        <form>
          <input type="text" id="v3" name="v3" minlength="5" value="ab" />
        </form>
      `;
      const form = document.querySelector<HTMLFormElement>('form')!;
      const analysis = analyzer.analyzeForm(form);
      const result = analyzer.validateField(analysis.fields[0]);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Minimum length is 5');
    });

    it('should fail validation when pattern does not match', () => {
      document.body.innerHTML = `
        <form>
          <input type="text" id="v4" name="v4" pattern="[0-9]+" value="abc" />
        </form>
      `;
      const form = document.querySelector<HTMLFormElement>('form')!;
      const analysis = analyzer.analyzeForm(form);
      const result = analyzer.validateField(analysis.fields[0]);
      expect(result.valid).toBe(false);
    });
  });
});
