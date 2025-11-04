import type { ContextProvider, ContextData, ContextTrigger } from './ContextProvider';

/**
 * Form field information
 */
export interface FormField {
  name: string;
  type: string;
  value: string; // Sanitized for privacy
  valid: boolean;
  required: boolean;
  error?: string;
}

/**
 * Form state information
 */
export interface FormInfo {
  id: string;
  fields: FormField[];
  validation: {
    valid: boolean;
    errors: string[];
  };
  completion: number; // 0-100%
  focused: boolean;
}

/**
 * Form context data structure
 */
export interface FormStateContextInfo {
  forms: FormInfo[];
  activeForms: number;
  totalFields: number;
  completedFields: number;
}

/**
 * Form State Context Provider
 *
 * Tracks form state including field values (privacy-safe), validation state,
 * completion percentage, and error messages. This helps AI provide context-aware
 * form assistance while protecting user privacy.
 *
 * PRIVACY: Sensitive field values (passwords, SSN, credit cards) are REDACTED.
 */
export class FormStateContextProvider implements ContextProvider {
  name = 'form-state';
  enabled = true;

  /**
   * Sensitive field types that should have values redacted
   */
  private readonly SENSITIVE_TYPES = new Set([
    'password',
    'credit-card',
    'creditcard',
    'cc',
    'cvv',
    'cvc',
    'ssn',
    'social-security',
    'pin',
    'security-code',
  ]);

  /**
   * Sensitive field name patterns (regex)
   */
  private readonly SENSITIVE_PATTERNS = [
    /password/i,
    /passwd/i,
    /pwd/i,
    /secret/i,
    /ssn/i,
    /social[_-]?security/i,
    /credit[_-]?card/i,
    /card[_-]?number/i,
    /cvv/i,
    /cvc/i,
    /security[_-]?code/i,
    /pin/i,
  ];

  async gather(): Promise<ContextData> {
    const forms = this.detectForms();

    return {
      provider: 'form-state',
      timestamp: new Date(),
      data: {
        forms,
        activeForms: forms.filter((f) => f.focused).length,
        totalFields: forms.reduce((sum, f) => sum + f.fields.length, 0),
        completedFields: forms.reduce(
          (sum, f) => sum + f.fields.filter((field) => field.value).length,
          0
        ),
      } as FormStateContextInfo,
    };
  }

  shouldInclude(trigger: ContextTrigger): boolean {
    // Include form state for both triggers (forms are common assistance needs)
    return true;
  }

  /**
   * Detect and analyze all forms on the page
   */
  private detectForms(): FormInfo[] {
    const forms = document.querySelectorAll('form');
    const activeElement = document.activeElement;

    return Array.from(forms).map((form) => {
      const fields = this.extractFields(form);
      const validation = this.getFormValidation(form, fields);
      const completion = this.calculateCompletion(fields);
      const focused = this.isFormFocused(form, activeElement);

      return {
        id: this.getFormIdentifier(form),
        fields,
        validation,
        completion,
        focused,
      };
    });
  }

  /**
   * Get a unique identifier for the form
   */
  private getFormIdentifier(form: HTMLFormElement): string {
    if (form.id) return form.id;
    if (form.name) return `form-${form.name}`;

    // Generate identifier based on action or position
    const action = form.action || 'unknown';
    const index = Array.from(document.querySelectorAll('form')).indexOf(form);
    return `form-${action.split('/').pop() || 'unnamed'}-${index}`;
  }

  /**
   * Extract field information from form
   */
  private extractFields(form: HTMLFormElement): FormField[] {
    const elements = form.querySelectorAll<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >('input, select, textarea');

    return Array.from(elements)
      .filter((el) => {
        // Skip hidden fields, buttons, and submit inputs
        const type = el.getAttribute('type') || '';
        return (
          type !== 'hidden' &&
          type !== 'submit' &&
          type !== 'button' &&
          type !== 'reset' &&
          type !== 'image'
        );
      })
      .map((el) => this.analyzeField(el));
  }

  /**
   * Analyze a single form field
   */
  private analyzeField(
    element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  ): FormField {
    const type = this.getFieldType(element);
    const name = this.getFieldName(element);
    const value = this.sanitizeValue(element.value, type, name);
    const required = element.hasAttribute('required');
    const valid = element.validity?.valid ?? true;
    const error = valid ? undefined : this.getFieldError(element);

    return {
      name,
      type,
      value,
      valid,
      required,
      error,
    };
  }

  /**
   * Get field type
   */
  private getFieldType(
    element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  ): string {
    if (element instanceof HTMLSelectElement) {
      return 'select';
    }
    if (element instanceof HTMLTextAreaElement) {
      return 'textarea';
    }
    return element.type || 'text';
  }

  /**
   * Get field name or identifier
   */
  private getFieldName(
    element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  ): string {
    return (
      element.name ||
      element.id ||
      element.getAttribute('aria-label') ||
      element.placeholder ||
      'unnamed-field'
    );
  }

  /**
   * Sanitize field value for privacy
   */
  private sanitizeValue(value: string, type: string, name: string): string {
    // Check if field type is sensitive
    if (this.SENSITIVE_TYPES.has(type.toLowerCase())) {
      return value ? '[REDACTED]' : '';
    }

    // Check if field name matches sensitive patterns
    if (this.SENSITIVE_PATTERNS.some((pattern) => pattern.test(name))) {
      return value ? '[REDACTED]' : '';
    }

    // For non-sensitive fields, limit length and indicate if has value
    if (!value) return '';
    if (value.length > 50) {
      return `[${value.length} characters]`;
    }

    return value;
  }

  /**
   * Get field validation error message
   */
  private getFieldError(
    element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  ): string | undefined {
    if (element.validity?.valid) return undefined;

    const validity = element.validity;
    if (!validity) return 'Invalid';

    if (validity.valueMissing) return 'Required field';
    if (validity.typeMismatch) return 'Invalid format';
    if (validity.tooShort) return 'Too short';
    if (validity.tooLong) return 'Too long';
    if (validity.rangeUnderflow) return 'Value too low';
    if (validity.rangeOverflow) return 'Value too high';
    if (validity.patternMismatch) return 'Does not match pattern';
    if (validity.badInput) return 'Invalid input';

    return element.validationMessage || 'Invalid';
  }

  /**
   * Get form validation state
   */
  private getFormValidation(
    form: HTMLFormElement,
    fields: FormField[]
  ): FormInfo['validation'] {
    const errors = fields.filter((f) => !f.valid && f.error).map((f) => f.error!);

    return {
      valid: form.checkValidity(),
      errors,
    };
  }

  /**
   * Calculate form completion percentage
   */
  private calculateCompletion(fields: FormField[]): number {
    if (fields.length === 0) return 0;

    const requiredFields = fields.filter((f) => f.required);
    if (requiredFields.length === 0) {
      // If no required fields, base on all fields
      const filledFields = fields.filter((f) => f.value && f.value !== '[REDACTED]').length;
      return Math.round((filledFields / fields.length) * 100);
    }

    // Base on required fields
    const filledRequired = requiredFields.filter(
      (f) => f.value && f.value !== '[REDACTED]'
    ).length;
    return Math.round((filledRequired / requiredFields.length) * 100);
  }

  /**
   * Check if form is currently focused
   */
  private isFormFocused(form: HTMLFormElement, activeElement: Element | null): boolean {
    if (!activeElement) return false;

    // Check if active element is within this form
    return form.contains(activeElement);
  }
}
