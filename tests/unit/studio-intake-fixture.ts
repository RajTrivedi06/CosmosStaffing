// Canonical synthetic fixture from Studio c456d95.
import type { WebsiteIntake } from "@/lib/studio-intake-contract";

/** Synthetic contract example: never copied from a customer. */
export const websiteIntakeFixture: WebsiteIntake = {
  version: 1,
  submission_id: "00000000-0000-4000-8000-000000000101",
  identity: { status: "pending" },
  answers: {
    service: "regular",
    property: "house",
    bedrooms: "5+",
    bathrooms: "4+",
    frequency: "unsure",
    condition: "some",
    zip: "78701",
    timing: "flexible",
    extras: ["pets", "oven"],
    notes: "Synthetic request: please confirm scope before quoting.",
    name: "Alex Example",
    email: "alex@example.com",
    phone: "512-555-0100",
  },
};
