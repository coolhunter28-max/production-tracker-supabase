import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const routes = [
  "src/app/api/modelos/[id]/imagenes/[imageId]/route.ts",
  "src/app/api/variantes/[varianteId]/imagenes/[imageId]/route.ts",
  "src/app/api/qc/defects/photos/[id]/route.ts",
];

for (const route of routes) {
  test(`${route} authorizes before privileged reads or R2 operations`, () => {
    const source = readFileSync(route, "utf8");
    const authorization = source.indexOf("await requireApiAccess");
    const privilegedOperations = [
      source.indexOf('.from("'),
      source.indexOf("getR2Client()", source.indexOf("export async function DELETE")),
      source.indexOf("deleteFromR2("),
      source.indexOf("assertEnv();"),
    ].filter((index) => index >= 0);

    assert.ok(authorization >= 0, "missing shared authorization guard");
    assert.ok(
      privilegedOperations.every((index) => authorization < index),
      "authorization must run before every privileged operation"
    );
    assert.match(source, /roles:\s*\["ADMIN",\s*"MANAGER"\]/);
  });
}
