/**
 * Provider-agnostic form-submission boundary.
 *
 * This is a stub: the default handler accepts submissions and resolves OK
 * without persisting anything. Wire a real handler (API route, form service,
 * etc.) via `setFormHandler`.
 */
import type { CompanyKey } from '@/lib/companies/types';

export interface FormSubmission {
  /** Form identifier, e.g. "contact" or "newsletter". */
  form: string;
  data: Record<string, unknown>;
  company?: CompanyKey;
}

export interface FormResult {
  ok: boolean;
  error?: string;
}

export interface FormHandler {
  submit(submission: FormSubmission): Promise<FormResult>;
}

const noopHandler: FormHandler = {
  async submit() {
    return { ok: true };
  },
};

let handler: FormHandler = noopHandler;

export function setFormHandler(next: FormHandler): void {
  handler = next;
}

export function submitForm(submission: FormSubmission): Promise<FormResult> {
  return handler.submit(submission);
}
