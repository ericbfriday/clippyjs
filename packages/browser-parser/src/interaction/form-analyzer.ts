import type {
  FormAnalysis,
  FormField,
  FormProgress,
  FieldValidation,
} from '@clippyjs/types';

/** Selector for form fields, excluding hidden/submit/button/reset inputs. */
const FIELD_SELECTOR = [
  'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"])',
  'select',
  'textarea',
].join(', ');

/**
 * Analyzes HTML forms for field structure, validation state, and completion progress.
 *
 * @example
 * ```ts
 * const analyzer = new FormAnalyzer();
 * const allForms = analyzer.analyzeAllForms();
 * const currentField = analyzer.detectCurrentField();
 * ```
 */
export class FormAnalyzer {
  /**
   * Perform a full analysis of a single form element.
   *
   * @param form - The `<form>` element to analyze
   * @returns Complete {@link FormAnalysis} with fields, validation, and progress
   */
  analyzeForm(form: HTMLFormElement): FormAnalysis {
    const fields = this.analyzeFields(form);

    const validation: Record<string, FieldValidation> = {};
    for (const field of fields) {
      validation[field.id] = field.validation;
    }

    return {
      id: form.id || this.generateId(),
      action: form.action,
      method: form.method || 'get',
      fields,
      validation,
      progress: this.calculateProgress(form),
      autoComplete: form.autocomplete !== 'off',
    };
  }

  /**
   * Analyze every `<form>` element in the current document.
   *
   * @returns Array of {@link FormAnalysis} for each form found
   */
  analyzeAllForms(): FormAnalysis[] {
    return Array.from(document.querySelectorAll<HTMLFormElement>('form')).map(
      (f) => this.analyzeForm(f),
    );
  }

  /**
   * Detect the form field that currently has focus.
   *
   * @returns A {@link FormField} descriptor if the active element is an
   *          input, select, or textarea; otherwise `null`
   */
  detectCurrentField(): FormField | null {
    const active = document.activeElement;
    if (!active) return null;

    const tag = active.tagName.toLowerCase();
    if (tag !== 'input' && tag !== 'select' && tag !== 'textarea') return null;

    return this.buildField(active as HTMLElement, 0);
  }

  /**
   * Validate a {@link FormField} against its declared validation rules.
   *
   * Checks `required`, `minLength`, `maxLength`, and `pattern` constraints.
   *
   * @param field - The form field to validate
   * @returns An object with `valid` status and array of error messages
   */
  validateField(field: FormField): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const { validation, value } = field;

    if (validation.required && !value.trim()) {
      errors.push(validation.errorMessage || 'This field is required');
    }

    if (
      validation.minLength !== undefined &&
      value.length > 0 &&
      value.length < validation.minLength
    ) {
      errors.push(`Minimum length is ${validation.minLength}`);
    }

    if (
      validation.maxLength !== undefined &&
      value.length > validation.maxLength
    ) {
      errors.push(`Maximum length is ${validation.maxLength}`);
    }

    if (validation.pattern && value.length > 0) {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(value)) {
        errors.push(validation.errorMessage || 'Value does not match the required pattern');
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Calculate completion progress for a form based on required fields.
   *
   * @param form - The form element to measure
   * @returns {@link FormProgress} with total, filled, valid counts and percentage
   */
  calculateProgress(form: HTMLFormElement): FormProgress {
    const fields = form.querySelectorAll<HTMLElement>(FIELD_SELECTOR);
    let total = 0;
    let filled = 0;
    let valid = 0;

    for (const el of fields) {
      const inputEl = el as HTMLInputElement;
      if (!inputEl.required) continue;

      total++;

      const value = inputEl.value ?? '';
      if (value.trim()) {
        filled++;
        if (inputEl.checkValidity()) {
          valid++;
        }
      }
    }

    return {
      total,
      filled,
      valid,
      percentage: total > 0 ? Math.round((filled / total) * 100) : 0,
    };
  }

  private analyzeFields(form: HTMLFormElement): FormField[] {
    const elements = form.querySelectorAll<HTMLElement>(FIELD_SELECTOR);
    return Array.from(elements).map((el, index) => this.buildField(el, index));
  }

  private buildField(el: HTMLElement, index: number): FormField {
    const inputEl = el as HTMLInputElement;

    const id = el.id || inputEl.name || `field-${index}`;
    const validation = this.extractValidation(inputEl);
    const value = inputEl.value ?? '';
    const fieldResult: FormField = {
      id,
      name: inputEl.name || '',
      type: inputEl.type || 'text',
      label: this.extractFieldLabel(el),
      placeholder: inputEl.placeholder || '',
      required: inputEl.required ?? false,
      validation,
      value,
      isValid: inputEl.checkValidity?.() ?? true,
      error: inputEl.validationMessage || undefined,
      helpText: this.extractHelpText(el),
    };
    return fieldResult;
  }

  private extractValidation(el: HTMLInputElement): FieldValidation {
    return {
      required: el.required ?? false,
      minLength: el.minLength > 0 ? el.minLength : undefined,
      maxLength: el.maxLength > 0 && el.maxLength < 524288 ? el.maxLength : undefined,
      pattern: el.pattern || undefined,
      errorMessage: el.title || undefined,
    };
  }

  /**
   * Find the label text for a form field.
   *
   * Priority: `<label for="id">` → closest `<label>` ancestor → `aria-label` → `placeholder`.
   */
  private extractFieldLabel(el: HTMLElement): string {
    if (el.id) {
      const labelEl = document.querySelector<HTMLLabelElement>(
        `label[for="${el.id}"]`,
      );
      if (labelEl) {
        const text = labelEl.textContent?.trim();
        if (text) return text;
      }
    }

    const closestLabel = el.closest('label');
    if (closestLabel) {
      const text = closestLabel.textContent?.trim();
      if (text) return text;
    }

    const ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;

    return (el as HTMLInputElement).placeholder || '';
  }

  private extractHelpText(el: HTMLElement): string | undefined {
    const describedById = el.getAttribute('aria-describedby');
    if (describedById) {
      const descEl = document.getElementById(describedById);
      if (descEl) {
        const text = descEl.textContent?.trim();
        if (text) return text;
      }
    }
    return undefined;
  }

  private generateId(): string {
    return 'form-' + Math.random().toString(36).slice(2, 9);
  }
}
