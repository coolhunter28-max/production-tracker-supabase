import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const defectUploadRoutes = [
  "src/app/api/qc/defects/upload/route.ts",
  "src/app/api/qc/defects/photos/upload/route.ts",
];

for (const route of defectUploadRoutes) {
  test(`${route} authorizes before parsing and scopes before R2`, () => {
    const source = readFileSync(route, "utf8");
    const handler = source.indexOf("export async function POST");
    const roleAuthorization = source.indexOf("await requireApiAccess", handler);
    const parsing = source.indexOf("req.formData()", handler);
    const scopeAuthorization = source.indexOf(
      "await requireQcDefectAccess",
      handler
    );
    const r2Upload = source.indexOf("await uploadToR2", handler);
    const databaseInsert = source.indexOf('.from("qc_defect_photos")', handler);

    assert.ok(handler >= 0, "missing POST handler");
    assert.ok(roleAuthorization > handler, "missing shared role guard");
    assert.ok(roleAuthorization < parsing, "role guard must precede parsing");
    assert.ok(scopeAuthorization > parsing, "scope guard needs the defect id");
    assert.ok(scopeAuthorization < r2Upload, "scope guard must precede R2");
    assert.ok(scopeAuthorization < databaseInsert, "scope guard must precede DB insert");
    assert.match(source, /roles:\s*\["ADMIN",\s*"MANAGER",\s*"OPERATOR"\]/);
  });
}

test("QC workbook upload authorizes role before parsing and customer before mutation", () => {
  const source = readFileSync("src/app/api/qc/upload/route.ts", "utf8");
  const handler = source.indexOf("export async function POST");
  const roleAuthorization = source.indexOf("await requireApiAccess", handler);
  const parsing = source.indexOf("req.formData()", handler);
  const customerAuthorization = source.indexOf(
    "evaluateQcCustomerAccess(",
    handler
  );
  const scopedQuantityRead = source.indexOf("await getQtyPoFromDatabase", handler);
  const inspectionMutation = source.indexOf('.from("qc_inspections")', handler);
  const r2Upload = source.indexOf("await uploadToR2", handler);

  assert.ok(roleAuthorization > handler, "missing shared role guard");
  assert.ok(roleAuthorization < parsing, "role guard must precede parsing");
  assert.ok(customerAuthorization > parsing, "customer is read from the workbook");
  assert.ok(
    customerAuthorization < scopedQuantityRead,
    "scope must precede non-authorization service-role reads"
  );
  assert.ok(customerAuthorization < inspectionMutation, "scope must precede QC mutation");
  assert.ok(customerAuthorization < r2Upload, "scope must precede R2");
  assert.match(source, /roles:\s*\["ADMIN",\s*"MANAGER",\s*"OPERATOR"\]/);
});

test("defect scope resolves the canonical customer through the inspection PO", () => {
  const source = readFileSync("src/lib/qc-access.ts", "utf8");

  assert.match(source, /inspection:qc_inspections/);
  assert.match(source, /po:pos/);
  assert.match(source, /evaluateQcCustomerAccess\(\s*access,\s*po\?\.customer/);
  assert.match(source, /if \(!po\?\.id \|\| !result\.allowed\)/);
});
