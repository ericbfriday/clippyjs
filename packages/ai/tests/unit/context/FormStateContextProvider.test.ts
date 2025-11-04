import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FormStateContextProvider } from '../../../src/context/FormStateContextProvider';

describe('FormStateContextProvider', () => {
  let provider: FormStateContextProvider;

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';
    provider = new FormStateContextProvider();
  });

  describe('Basic Properties', () => {
    it('should have correct name and enabled state', () => {
      expect(provider.name).toBe('form-state');
      expect(provider.enabled).toBe(true);
    });

    it('should implement ContextProvider interface', () => {
      expect(provider.gather).toBeDefined();
      expect(typeof provider.gather).toBe('function');
      expect(provider.shouldInclude).toBeDefined();
      expect(typeof provider.shouldInclude).toBe('function');
    });
  });

  describe('Form Detection', () => {
    it('should detect forms on the page', async () => {
      document.body.innerHTML = `
        <form id="test-form">
          <input type="text" name="username" value="test" />
        </form>
      `;

      const context = await provider.gather();

      expect(context.provider).toBe('form-state');
      expect(context.data.forms).toHaveLength(1);
      expect(context.data.forms[0].id).toBe('test-form');
    });

    it('should handle multiple forms', async () => {
      document.body.innerHTML = `
        <form id="form1"></form>
        <form id="form2"></form>
        <form id="form3"></form>
      `;

      const context = await provider.gather();

      expect(context.data.forms).toHaveLength(3);
    });

    it('should handle no forms', async () => {
      const context = await provider.gather();

      expect(context.data.forms).toHaveLength(0);
      expect(context.data.totalFields).toBe(0);
    });

    it('should generate identifier for form without id', async () => {
      document.body.innerHTML = `
        <form action="/submit"></form>
      `;

      const context = await provider.gather();

      expect(context.data.forms[0].id).toContain('form-');
    });
  });

  describe('Field Extraction', () => {
    it('should extract input fields', async () => {
      document.body.innerHTML = `
        <form id="test">
          <input type="text" name="username" value="john" />
          <input type="email" name="email" value="john@example.com" />
          <input type="password" name="password" value="secret" />
        </form>
      `;

      const context = await provider.gather();

      expect(context.data.forms[0].fields).toHaveLength(3);
      expect(context.data.forms[0].fields[0].name).toBe('username');
      expect(context.data.forms[0].fields[1].name).toBe('email');
      expect(context.data.forms[0].fields[2].name).toBe('password');
    });

    it('should extract select fields', async () => {
      document.body.innerHTML = `
        <form>
          <select name="country">
            <option value="us">USA</option>
            <option value="uk" selected>UK</option>
          </select>
        </form>
      `;

      const context = await provider.gather();

      expect(context.data.forms[0].fields[0].type).toBe('select');
      expect(context.data.forms[0].fields[0].name).toBe('country');
    });

    it('should extract textarea fields', async () => {
      document.body.innerHTML = `
        <form>
          <textarea name="message">Hello</textarea>
        </form>
      `;

      const context = await provider.gather();

      expect(context.data.forms[0].fields[0].type).toBe('textarea');
    });

    it('should skip hidden and button inputs', async () => {
      document.body.innerHTML = `
        <form>
          <input type="hidden" name="csrf" value="token" />
          <input type="text" name="username" value="john" />
          <input type="submit" value="Submit" />
          <input type="button" value="Cancel" />
          <input type="reset" value="Reset" />
        </form>
      `;

      const context = await provider.gather();

      expect(context.data.forms[0].fields).toHaveLength(1);
      expect(context.data.forms[0].fields[0].name).toBe('username');
    });

    it('should use fallback field names', async () => {
      document.body.innerHTML = `
        <form>
          <input type="text" id="field1" />
          <input type="text" aria-label="Field 2" />
          <input type="text" placeholder="Field 3" />
          <input type="text" />
        </form>
      `;

      const context = await provider.gather();

      expect(context.data.forms[0].fields[0].name).toBe('field1');
      expect(context.data.forms[0].fields[1].name).toBe('Field 2');
      expect(context.data.forms[0].fields[2].name).toBe('Field 3');
      expect(context.data.forms[0].fields[3].name).toBe('unnamed-field');
    });
  });

  describe('Privacy Protection', () => {
    it('should redact password field values', async () => {
      document.body.innerHTML = `
        <form>
          <input type="password" name="password" value="secret123" />
        </form>
      `;

      const context = await provider.gather();

      expect(context.data.forms[0].fields[0].value).toBe('[REDACTED]');
    });

    it('should redact sensitive field names', async () => {
      document.body.innerHTML = `
        <form>
          <input type="text" name="password" value="secret" />
          <input type="text" name="ssn" value="123-45-6789" />
          <input type="text" name="credit_card" value="1234567890" />
          <input type="text" name="security_code" value="123" />
        </form>
      `;

      const context = await provider.gather();

      context.data.forms[0].fields.forEach((field) => {
        expect(field.value).toBe('[REDACTED]');
      });
    });

    it('should keep non-sensitive values', async () => {
      document.body.innerHTML = `
        <form>
          <input type="text" name="username" value="john" />
          <input type="email" name="email" value="john@example.com" />
        </form>
      `;

      const context = await provider.gather();

      expect(context.data.forms[0].fields[0].value).toBe('john');
      expect(context.data.forms[0].fields[1].value).toBe('john@example.com');
    });

    it('should indicate empty sensitive fields', async () => {
      document.body.innerHTML = `
        <form>
          <input type="password" name="password" value="" />
        </form>
      `;

      const context = await provider.gather();

      expect(context.data.forms[0].fields[0].value).toBe('');
    });

    it('should truncate long values', async () => {
      const longValue = 'a'.repeat(100);
      document.body.innerHTML = `
        <form>
          <input type="text" name="description" value="${longValue}" />
        </form>
      `;

      const context = await provider.gather();

      expect(context.data.forms[0].fields[0].value).toBe('[100 characters]');
    });
  });

  describe('Validation State', () => {
    it('should detect required fields', async () => {
      document.body.innerHTML = `
        <form>
          <input type="text" name="username" required />
        </form>
      `;

      const context = await provider.gather();

      expect(context.data.forms[0].fields[0].required).toBe(true);
    });

    it('should track field validity', async () => {
      document.body.innerHTML = `
        <form>
          <input type="email" name="email" value="invalid" required />
        </form>
      `;

      const form = document.querySelector('form')!;
      const input = form.querySelector('input')!;

      // Trigger validation
      form.checkValidity();

      const context = await provider.gather();

      expect(context.data.forms[0].fields[0].valid).toBe(input.validity.valid);
    });

    it('should extract validation errors', async () => {
      document.body.innerHTML = `
        <form>
          <input type="text" name="username" required value="" />
        </form>
      `;

      const form = document.querySelector('form')!;
      form.checkValidity();

      const context = await provider.gather();

      expect(context.data.forms[0].validation.valid).toBe(false);
    });

    it('should categorize validation errors', async () => {
      document.body.innerHTML = `
        <form>
          <input type="text" name="field1" required value="" />
          <input type="email" name="field2" value="invalid" />
          <input type="text" name="field3" minlength="5" value="abc" />
        </form>
      `;

      const form = document.querySelector('form')!;
      form.checkValidity();

      const context = await provider.gather();

      // Should have multiple validation errors
      expect(context.data.forms[0].validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Completion Tracking', () => {
    it('should calculate completion for required fields', async () => {
      document.body.innerHTML = `
        <form>
          <input type="text" name="field1" required value="filled" />
          <input type="text" name="field2" required value="" />
        </form>
      `;

      const context = await provider.gather();

      expect(context.data.forms[0].completion).toBe(50);
    });

    it('should calculate completion for all fields when no required', async () => {
      document.body.innerHTML = `
        <form>
          <input type="text" name="field1" value="filled" />
          <input type="text" name="field2" value="" />
          <input type="text" name="field3" value="filled" />
        </form>
      `;

      const context = await provider.gather();

      expect(context.data.forms[0].completion).toBe(67); // 2/3 = 66.67 rounded
    });

    it('should handle empty form', async () => {
      document.body.innerHTML = `<form></form>`;

      const context = await provider.gather();

      expect(context.data.forms[0].completion).toBe(0);
    });

    it('should not count redacted fields in completion', async () => {
      document.body.innerHTML = `
        <form>
          <input type="text" name="username" required value="john" />
          <input type="password" name="password" required value="secret" />
        </form>
      `;

      const context = await provider.gather();

      // Password is redacted, so only 1/2 fields count as filled
      expect(context.data.forms[0].completion).toBe(50);
    });
  });

  describe('Focus Detection', () => {
    it('should detect focused form', async () => {
      document.body.innerHTML = `
        <form id="form1">
          <input type="text" name="field1" />
        </form>
        <form id="form2">
          <input type="text" name="field2" />
        </form>
      `;

      const input = document.querySelector('#form1 input') as HTMLInputElement;
      input.focus();

      const context = await provider.gather();

      expect(context.data.forms[0].focused).toBe(true);
      expect(context.data.forms[1].focused).toBe(false);
    });

    it('should handle no focused element', async () => {
      document.body.innerHTML = `<form><input type="text" /></form>`;

      const context = await provider.gather();

      expect(context.data.forms[0].focused).toBe(false);
    });
  });

  describe('Aggregate Statistics', () => {
    it('should count active forms', async () => {
      document.body.innerHTML = `
        <form id="form1"><input type="text" /></form>
        <form id="form2"><input type="text" /></form>
      `;

      const input1 = document.querySelector('#form1 input') as HTMLInputElement;
      input1.focus();

      const context = await provider.gather();

      expect(context.data.activeForms).toBe(1);
    });

    it('should count total fields', async () => {
      document.body.innerHTML = `
        <form>
          <input type="text" name="field1" />
          <input type="text" name="field2" />
        </form>
        <form>
          <input type="text" name="field3" />
        </form>
      `;

      const context = await provider.gather();

      expect(context.data.totalFields).toBe(3);
    });

    it('should count completed fields', async () => {
      document.body.innerHTML = `
        <form>
          <input type="text" value="filled" />
          <input type="text" value="" />
          <input type="text" value="filled" />
        </form>
      `;

      const context = await provider.gather();

      expect(context.data.completedFields).toBe(2);
    });
  });

  describe('shouldInclude', () => {
    it('should include for both trigger types', () => {
      expect(provider.shouldInclude('proactive')).toBe(true);
      expect(provider.shouldInclude('user-prompt')).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should gather context quickly (<20ms)', async () => {
      document.body.innerHTML = `
        <form>
          <input type="text" name="field1" />
          <input type="text" name="field2" />
          <input type="text" name="field3" />
        </form>
      `;

      const start = performance.now();
      await provider.gather();
      const end = performance.now();

      expect(end - start).toBeLessThan(20);
    });

    it('should handle large forms efficiently', async () => {
      const fields = Array.from({ length: 50 }, (_, i) =>
        `<input type="text" name="field${i}" value="value${i}" />`
      ).join('');

      document.body.innerHTML = `<form>${fields}</form>`;

      const start = performance.now();
      await provider.gather();
      const end = performance.now();

      expect(end - start).toBeLessThan(20);
    });
  });
});
