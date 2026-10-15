import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const routes = [
  "src/app/api/import-csv/route.ts",
  "src/app/api/import-china/route.ts",
  "src/app/api/catalogos/import-feeder/route.ts",
  "src/app/api/variantes/feeder/route.ts",
  "src/app/api/qc/import/route.ts",
];

for (const route of routes) {
  test(`${route} authorizes before parsing input or privileged database access`, () => {
    const source = readFileSync(route, "utf8");
    const handler = source.indexOf("export async function POST");
    const authorization = source.indexOf("await requireApiAccess", handler);
    const privilegedOperations = [
      source.indexOf("req.formData()", handler),
      source.indexOf("req.json()", handler),
      source.indexOf('.from("', handler),
    ].filter((index) => index >= 0);

    assert.ok(handler >= 0, "missing POST handler");
    assert.ok(authorization > handler, "missing shared authorization guard");
    assert.ok(
      privilegedOperations.every((index) => authorization < index),
      "authorization must run before input parsing and privileged operations"
    );
    assert.match(source, /roles:\s*\["ADMIN",\s*"MANAGER"\]/);
  });
}
