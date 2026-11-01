import { beforeEach, describe, expect, it, vi } from "vitest";

/** /account/session with the session mocked: the owner check an open tab asks. */
const session = vi.fn();
vi.mock("@/lib/account/server", () => ({
  clientSession: () => session(),
}));

const ALICE = {
  id: "00000000-0000-4000-8000-0000000000a1",
  email: "alice@example.test",
};
const BOB = {
  id: "00000000-0000-4000-8000-0000000000b2",
  email: "bob@example.test",
};

async function ask() {
  const { GET } = await import("@/app/account/session/route");
  const response = await GET();
  return {
    body: (await response.json()) as Record<string, unknown>,
    cache: response.headers.get("cache-control"),
  };
}

describe("/account/session", () => {
  beforeEach(() => session.mockReset());

  it("names the signed-in client by the tag the pages carry, and nothing else", async () => {
    const { ownerTag } = await import("@/lib/account/owner");
    session.mockResolvedValue({ state: "signed_in", client: ALICE });
    const { body, cache } = await ask();
    expect(body).toEqual({ owner: ownerTag(ALICE.id) });
    expect(JSON.stringify(body)).not.toContain(ALICE.email);
    expect(cache).toBe("private, no-store");
  });

  it("tells two clients apart", async () => {
    session.mockResolvedValueOnce({ state: "signed_in", client: ALICE });
    session.mockResolvedValueOnce({ state: "signed_in", client: BOB });
    expect((await ask()).body.owner).not.toBe((await ask()).body.owner);
  });

  it.each(["signed_out", "expired", "off"])(
    "reports nobody for a session that is %s",
    async (state) => {
      session.mockResolvedValue({ state });
      const { body, cache } = await ask();
      expect(body).toEqual({ owner: null });
      expect(cache).toBe("private, no-store");
    },
  );
});
