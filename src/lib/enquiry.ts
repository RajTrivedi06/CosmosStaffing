import { z } from "zod";

/** Options for the "What you need" select on the Request Talent form. */
export const NEED_OPTIONS = [
  { value: "staffing", label: "Staffing & Recruiting" },
  { value: "professional-search", label: "Professional Search" },
  { value: "hr-payroll", label: "HR & Payroll" },
  { value: "bookkeeping", label: "Bookkeeping" },
  { value: "not-sure", label: "Not sure yet" },
] as const;

const NEED_VALUES = NEED_OPTIONS.map((o) => o.value);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validation schema for an enquiry / Request Talent submission. Shared between
 * the client form (react-hook-form via zodResolver) and the API route.
 */
export const enquirySchema = z.object({
  name: z.string().trim().min(1, "Please enter your name."),
  company: z.string().trim().min(1, "Please enter your company."),
  email: z
    .string()
    .trim()
    .min(1, "Please enter your email.")
    .refine((v) => EMAIL_RE.test(v), "Enter a valid email address."),
  phone: z.string().trim().optional(),
  need: z
    .string()
    .min(1, "Please choose what you need.")
    .refine(
      (v) => (NEED_VALUES as readonly string[]).includes(v),
      "Please choose what you need.",
    ),
  details: z.string().trim().optional(),
  location: z.string().trim().optional(),
  timeline: z.string().trim().optional(),
});

export type EnquiryInput = z.infer<typeof enquirySchema>;
