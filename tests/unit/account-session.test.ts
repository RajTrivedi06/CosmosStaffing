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
    status: response.status,
    text: await response.text(),
    cache: response.headers.get("cache-control"),
  };
}

const owner = (text: string) => JSON.parse(text) as Record<string, unknown>;

describe("/account/session", () => {
  beforeEach(() => session.mockReset());

  it("names the signed-in client by the tag the pages carry, and nothing else", async () => {
    const { ownerTag } = await import("@/lib/account/owner");
    session.mockResolvedValue({ state: "signed_in", client: ALICE });
    const { status, text, cache } = await ask();
    expect(status).toBe(200);
    expect(owner(text)).toEqual({ owner: ownerTag(ALICE.id) });
    expect(text).not.toContain(ALICE.email);
    expect(cache).toBe("private, no-store");
  });

  it("tells two clients apart", async () => {
    session.mockResolvedValueOnce({ state: "signed_in", client: ALICE });
    session.mockResolvedValueOnce({ state: "signed_in", client: BOB });
    expect(owner((await ask()).text)).not.toEqual(owner((await ask()).text));
  });

  it("reports nobody only when there's no session at all", async () => {
    session.mockResolvedValue({ state: "signed_out" });
    const { status, text, cache } = await ask();
    expect(status).toBe(200);
    expect(owner(text)).toEqual({ owner: null });
    expect(cache).toBe("private, no-store");
  });

  // Neither proves nobody is signed in: an Auth outage reads as "expired" while
  // the session is still good, and an open tab must not take that as sign-out.
  it.each(["expired", "off"])(
    "says nothing about a session that is %s",
    async (state) => {
      session.mockResolvedValue({ state });
      const { status, text, cache } = await ask();
      expect(status).toBe(503);
      expect(text).toBe("");
      expect(cache).toBe("private, no-store");
    },
  );
});
