import assert from "node:assert/strict";
import test from "node:test";
import type { CurrentUserAccess, UserRole } from "../../src/lib/ownership";
import { evaluateApiAccess } from "../../src/lib/api-access-policy";

function access(overrides: Partial<CurrentUserAccess> = {}): CurrentUserAccess {
  return {
    userId: "user-1",
    email: "user@example.test",
    role: "ADMIN",
    isActive: true,
    canAdmin: true,
    canSeeAllCustomers: true,
    customers: [],
    ...overrides,
  };
}

const destructiveRoles: readonly UserRole[] = ["ADMIN", "MANAGER"];

test("rejects a request without a session with 401", () => {
  assert.deepEqual(
    evaluateApiAccess(access({ userId: null, isActive: false }), destructiveRoles),
    { allowed: false, status: 401, error: "Unauthorized" }
  );
});

test("rejects an inactive user with 403", () => {
  assert.deepEqual(
    evaluateApiAccess(access({ isActive: false }), destructiveRoles),
    { allowed: false, status: 403, error: "Forbidden" }
  );
});

test("rejects an active user with an insufficient role", () => {
  assert.deepEqual(
    evaluateApiAccess(access({ role: "VIEWER" }), destructiveRoles),
    { allowed: false, status: 403, error: "Forbidden" }
  );
});

test("allows each explicitly authorized role", () => {
  for (const role of destructiveRoles) {
    const current = access({ role, canAdmin: role === "ADMIN" });
    assert.deepEqual(evaluateApiAccess(current, destructiveRoles), {
      allowed: true,
      access: current,
    });
  }
});

test("does not silently authorize DEVELOPMENT while the versioned DB constraint excludes it", () => {
  assert.deepEqual(
    evaluateApiAccess(access({ role: "DEVELOPMENT" }), destructiveRoles),
    { allowed: false, status: 403, error: "Forbidden" }
  );
});
