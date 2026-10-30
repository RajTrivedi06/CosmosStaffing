import { existsSync } from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";
import { websiteIntakeFixture } from "./studio-intake-fixture";
import { createQuoteAttempt, toStudioIntake } from "@/lib/quote-attempt";
import { websiteIntakeSchema } from "@/lib/studio-intake-contract";
import { homeQuote, officeQuote } from "./fixtures";

// Optional source conformance check, not an HTTP/database integration test.
const root =
  process.env.STUDIO_IMPLEMENTATION_ROOT ||
  path.resolve(process.cwd(), "../wt-integration-implementation");
const feature = `${root}/apps/operations-studio/src/features/website-intake`;
it.skipIf(!existsSync(`${feature}/schema.ts`))(
  "matches the actual implementation-worktree fixture and schema",
  async () => {
    const canonical = await import(/* @vite-ignore */ `${feature}/schema.ts`);
    const fixtures = await import(/* @vite-ignore */ `${feature}/fixtures.ts`);
    expect(websiteIntakeFixture).toEqual(fixtures.websiteIntakeFixture);
    const examples = [
      websiteIntakeFixture,
      toStudioIntake(createQuoteAttempt(homeQuote)),
      toStudioIntake(createQuoteAttempt(officeQuote)),
      ...["deep", "move", "other"].map((service) =>
        toStudioIntake(
          createQuoteAttempt({
            ...homeQuote,
            service: service as "deep" | "move" | "other",
            condition: service === "move" ? "empty" : "kept",
          }),
        ),
      ),
      { ...websiteIntakeFixture, identity: { status: "verified" } },
      {
        ...websiteIntakeFixture,
        answers: { ...websiteIntakeFixture.answers, customer_id: "forged" },
      },
      {
        ...websiteIntakeFixture,
        answers: { ...websiteIntakeFixture.answers, bedrooms: "6" },
      },
      {
        ...websiteIntakeFixture,
        answers: {
          ...websiteIntakeFixture.answers,
          timing: "date",
          date: "2026-02-30",
        },
      },
    ];
    for (const example of examples) {
      const ours = websiteIntakeSchema.safeParse(example);
      const theirs = canonical.websiteIntakeSchema.safeParse(example);
      expect(ours.success).toBe(theirs.success);
      if (ours.success) expect(ours.data).toEqual(theirs.data);
    }
  },
);
