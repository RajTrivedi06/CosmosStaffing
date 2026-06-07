/**
 * Shape of an enquiry submitted through the site. Fields are intentionally
 * minimal for now — extend as the enquiry form is designed.
 */
export type EnquiryInput = {
  name: string;
  email: string;
  company?: string;
  message: string;
};

export type EnquiryValidationResult =
  | { success: true; data: EnquiryInput }
  | { success: false; errors: Record<string, string> };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate an unknown payload (e.g. a parsed JSON request body) into an
 * EnquiryInput. Pure and dependency-free so it can run on the server or be
 * reused client-side. Swap for a schema library (e.g. zod) if validation
 * needs grow.
 */
export function validateEnquiry(payload: unknown): EnquiryValidationResult {
  const errors: Record<string, string> = {};
  const body = (
    typeof payload === "object" && payload !== null ? payload : {}
  ) as Record<string, unknown>;

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const company = typeof body.company === "string" ? body.company.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!name) errors.name = "Name is required.";
  if (!email) errors.email = "Email is required.";
  else if (!EMAIL_RE.test(email)) errors.email = "Enter a valid email address.";
  if (!message) errors.message = "Message is required.";

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: { name, email, message, ...(company ? { company } : {}) },
  };
}
