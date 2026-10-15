import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

type GuardedHandler = {
  route: string;
  method: "POST" | "PATCH" | "DELETE";
};

const handlers: GuardedHandler[] = [
  { route: "src/app/api/cotizaciones/route.ts", method: "POST" },
  { route: "src/app/api/cotizaciones/[cotizacionId]/route.ts", method: "PATCH" },
  { route: "src/app/api/cotizaciones/[cotizacionId]/duplicate/route.ts", method: "POST" },
  { route: "src/app/api/modelos/route.ts", method: "POST" },
  { route: "src/app/api/modelos/[id]/route.ts", method: "PATCH" },
  { route: "src/app/api/variantes/[varianteId]/route.ts", method: "PATCH" },
  { route: "src/app/api/variantes/[varianteId]/route.ts", method: "DELETE" },
  { route: "src/app/api/variantes/[varianteId]/componentes/route.ts", method: "POST" },
  {
    route: "src/app/api/variantes/[varianteId]/componentes/[compId]/route.ts",
    method: "PATCH",
  },
  {
    route: "src/app/api/variantes/[varianteId]/componentes/[compId]/route.ts",
    method: "DELETE",
  },
  { route: "src/app/api/modelos/[id]/imagenes/upload/route.ts", method: "POST" },
  {
    route: "src/app/api/variantes/[varianteId]/imagenes/upload/route.ts",
    method: "POST",
  },
];

function handlerSource(route: string, method: string) {
  const source = readFileSync(route, "utf8");
  const start = source.indexOf(`export async function ${method}`);
  assert.ok(start >= 0, `missing ${method} handler in ${route}`);

  const nextHandler = source.indexOf("export async function ", start + 1);
  return source.slice(start, nextHandler >= 0 ? nextHandler : undefined);
}

for (const { route, method } of handlers) {
  test(`${method} ${route} authorizes before parsing or privileged side effects`, () => {
    const source = handlerSource(route, method);
    const authorization = source.indexOf("await requireApiAccess");
    const privilegedOperations = [
      source.indexOf("req.formData()"),
      source.indexOf("req.json()"),
      source.indexOf('.from("'),
      source.indexOf("assertEnv()"),
      source.indexOf("getR2Client()"),
    ].filter((index) => index >= 0);

    assert.ok(authorization >= 0, "missing shared authorization guard");
    assert.ok(
      privilegedOperations.every((index) => authorization < index),
      "authorization must precede request parsing, service_role, and R2 operations"
    );
    assert.match(source, /roles:\s*\["ADMIN",\s*"MANAGER"\]/);
  });
}

test("quotation creation derives its author from the authenticated session", () => {
  const source = handlerSource("src/app/api/cotizaciones/route.ts", "POST");
  assert.match(source, /const created_by = authorization\.access\.email/);
  assert.doesNotMatch(source, /body\?\.created_by/);
});

test("quotation duplication derives its author from the authenticated session", () => {
  const source = handlerSource(
    "src/app/api/cotizaciones/[cotizacionId]/duplicate/route.ts",
    "POST"
  );
  assert.match(source, /const createdBy = authorization\.access\.email/);
  assert.doesNotMatch(source, /body\?\.created_by/);
});

test("quotation promotion does not authorize DESARROLLO or DEVELOPMENT", () => {
  const source = handlerSource(
    "src/app/api/cotizaciones/[cotizacionId]/route.ts",
    "PATCH"
  );
  assert.doesNotMatch(source, /DESARROLLO|DEVELOPMENT/);
});
