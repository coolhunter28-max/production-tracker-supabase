import assert from "node:assert/strict";
import test from "node:test";
import type { CurrentUserAccess } from "../../src/lib/ownership";
import {
  evaluateQcCustomerAccess,
  normalizeQcCustomer,
} from "../../src/lib/qc-access-policy";

function access(
  overrides: Partial<CurrentUserAccess> = {}
): CurrentUserAccess {
  return {
    userId: "user-1",
    email: "user@example.test",
    role: "OPERATOR",
    isActive: true,
    canAdmin: false,
    canSeeAllCustomers: false,
    customers: ["Acme Europe"],
    ...overrides,
  };
}

test("normalizes only case and whitespace", () => {
  assert.equal(normalizeQcCustomer("  acme   Europe  "), "ACME EUROPE");
  assert.notEqual(normalizeQcCustomer("Acme-Europe"), "ACME EUROPE");
  assert.notEqual(normalizeQcCustomer("Acme Europe Ltd"), "ACME EUROPE");
});

test("allows ADMIN and MANAGER for legacy inspections without a PO customer", () => {
  for (const role of ["ADMIN", "MANAGER"] as const) {
    assert.deepEqual(
      evaluateQcCustomerAccess(access({ role }), null, "Legacy Customer"),
      { allowed: true }
    );
  }
});

test("allows an OPERATOR assigned to the canonical PO customer", () => {
  assert.deepEqual(
    evaluateQcCustomerAccess(access(), "  ACME   EUROPE ", "acme europe"),
    { allowed: true }
  );
});

test("denies an OPERATOR outside the canonical PO customer", () => {
  assert.deepEqual(
    evaluateQcCustomerAccess(access(), "Other Customer", "Other Customer"),
    { allowed: false, status: 403, error: "Forbidden" }
  );
});

test("denies an OPERATOR when the canonical PO customer is absent", () => {
  assert.deepEqual(evaluateQcCustomerAccess(access(), null, "Acme Europe"), {
    allowed: false,
    status: 403,
    error: "Forbidden",
  });
});

test("denies an OPERATOR when inspection and PO customers disagree", () => {
  assert.deepEqual(
    evaluateQcCustomerAccess(access(), "Acme Europe", "Acme Europe Ltd"),
    { allowed: false, status: 403, error: "Forbidden" }
  );
});

test("denies VIEWER even when assigned to the customer", () => {
  assert.deepEqual(
    evaluateQcCustomerAccess(access({ role: "VIEWER" }), "Acme Europe"),
    { allowed: false, status: 403, error: "Forbidden" }
  );
});
