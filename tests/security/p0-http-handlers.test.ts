import assert from "node:assert/strict";
import test, { before, mock } from "node:test";

type Authorization =
  | { ok: false; response: Response }
  | { ok: true; access: { id: string; email: string; role: string; customer: string | null } };

let authorization: Authorization;
let bodyReads = 0;
let privilegedCalls = 0;

const chain = new Proxy(
  {},
  {
    get(_target, property) {
      if (property === "then") {
        return (resolve: (value: unknown) => void) =>
          resolve({ data: null, error: { message: "mock stop" } });
      }
      return (..._args: unknown[]) => {
        privilegedCalls += 1;
        return chain;
      };
    },
  }
);

let routeModules: any;

before(async () => {
  Object.assign(process.env, {
    NEXT_PUBLIC_SUPABASE_URL: "https://supabase.invalid",
    SUPABASE_SERVICE_ROLE_KEY: "test-service-role",
    R2_ENDPOINT: "https://r2.invalid",
    R2_BUCKET_NAME: "test-bucket",
    R2_PUBLIC_URL: "https://cdn.invalid",
    R2_ACCESS_KEY_ID: "test-access-key",
    R2_SECRET_ACCESS_KEY: "test-secret-key",
  });

  await mock.module("server-only", { namedExports: {} });

  await mock.module("@/lib/api-access", {
    namedExports: {
      requireApiAccess: async () => authorization,
    },
  });

  await mock.module("@supabase/supabase-js", {
    namedExports: {
      createClient: () => ({
        from: (..._args: unknown[]) => {
          privilegedCalls += 1;
          return chain;
        },
      }),
    },
  });

  await mock.module("@/lib/r2", {
    namedExports: {
      uploadToR2: async () => {
        privilegedCalls += 1;
        return "https://r2.invalid/test";
      },
      deleteFromR2: async () => {
        privilegedCalls += 1;
      },
    },
  });

  await mock.module("@aws-sdk/client-s3", {
    namedExports: {
      S3Client: class {
        send() {
          privilegedCalls += 1;
          return Promise.resolve({});
        }
      },
      PutObjectCommand: class {},
      DeleteObjectCommand: class {},
    },
  });

  routeModules = {
    modelos: await import("../../src/app/api/modelos/route"),
    modelo: await import("../../src/app/api/modelos/[id]/route"),
    modeloImageUpload: await import("../../src/app/api/modelos/[id]/imagenes/upload/route"),
    modeloImage: await import("../../src/app/api/modelos/[id]/imagenes/[imageId]/route"),
    variante: await import("../../src/app/api/variantes/[varianteId]/route"),
    componente: await import("../../src/app/api/variantes/[varianteId]/componentes/[compId]/route"),
    componentes: await import("../../src/app/api/variantes/[varianteId]/componentes/route"),
    feeder: await import("../../src/app/api/variantes/feeder/route"),
    varianteImageUpload: await import("../../src/app/api/variantes/[varianteId]/imagenes/upload/route"),
    varianteImage: await import("../../src/app/api/variantes/[varianteId]/imagenes/[imageId]/route"),
    qcImport: await import("../../src/app/api/qc/import/route"),
    qcUpload: await import("../../src/app/api/qc/upload/route"),
    qcDefectUpload: await import("../../src/app/api/qc/defects/upload/route"),
    qcPhotoUpload: await import("../../src/app/api/qc/defects/photos/upload/route"),
    qcPhoto: await import("../../src/app/api/qc/defects/photos/[id]/route"),
    catalogImport: await import("../../src/app/api/catalogos/import-feeder/route"),
    importCsv: await import("../../src/app/api/import-csv/route"),
    importChina: await import("../../src/app/api/import-china/route"),
    quotations: await import("../../src/app/api/cotizaciones/route"),
    quotationDuplicate: await import("../../src/app/api/cotizaciones/[cotizacionId]/duplicate/route"),
    quotation: await import("../../src/app/api/cotizaciones/[cotizacionId]/route"),
  };
});

type Handler = (request: Request, context: any) => Promise<Response>;

const handlers: Array<[string, Handler, Record<string, string>]> = [
  ["POST /api/modelos", (r, c) => routeModules.modelos.POST(r, c), {}],
  ["PATCH /api/modelos/:id", (r, c) => routeModules.modelo.PATCH(r, c), { id: "model-1" }],
  ["POST /api/modelos/:id/imagenes/upload", (r, c) => routeModules.modeloImageUpload.POST(r, c), { id: "model-1" }],
  ["DELETE /api/modelos/:id/imagenes/:imageId", (r, c) => routeModules.modeloImage.DELETE(r, c), { id: "model-1", imageId: "image-1" }],
  ["PATCH /api/variantes/:id", (r, c) => routeModules.variante.PATCH(r, c), { varianteId: "variant-1" }],
  ["DELETE /api/variantes/:id", (r, c) => routeModules.variante.DELETE(r, c), { varianteId: "variant-1" }],
  ["POST /api/variantes/:id/componentes", (r, c) => routeModules.componentes.POST(r, c), { varianteId: "variant-1" }],
  ["PATCH /api/variantes/:id/componentes/:compId", (r, c) => routeModules.componente.PATCH(r, c), { varianteId: "variant-1", compId: "component-1" }],
  ["DELETE /api/variantes/:id/componentes/:compId", (r, c) => routeModules.componente.DELETE(r, c), { varianteId: "variant-1", compId: "component-1" }],
  ["POST /api/variantes/feeder", (r, c) => routeModules.feeder.POST(r, c), {}],
  ["POST /api/variantes/:id/imagenes/upload", (r, c) => routeModules.varianteImageUpload.POST(r, c), { varianteId: "variant-1" }],
  ["DELETE /api/variantes/:id/imagenes/:imageId", (r, c) => routeModules.varianteImage.DELETE(r, c), { varianteId: "variant-1", imageId: "image-1" }],
  ["POST /api/qc/import", (r, c) => routeModules.qcImport.POST(r, c), {}],
  ["POST /api/qc/upload", (r, c) => routeModules.qcUpload.POST(r, c), {}],
  ["POST /api/qc/defects/upload", (r, c) => routeModules.qcDefectUpload.POST(r, c), {}],
  ["POST /api/qc/defects/photos/upload", (r, c) => routeModules.qcPhotoUpload.POST(r, c), {}],
  ["DELETE /api/qc/defects/photos/:id", (r, c) => routeModules.qcPhoto.DELETE(r, c), { id: "photo-1" }],
  ["POST /api/catalogos/import-feeder", (r, c) => routeModules.catalogImport.POST(r, c), {}],
  ["POST /api/import-csv", (r, c) => routeModules.importCsv.POST(r, c), {}],
  ["POST /api/import-china", (r, c) => routeModules.importChina.POST(r, c), {}],
  ["POST /api/cotizaciones", (r, c) => routeModules.quotations.POST(r, c), {}],
  ["POST /api/cotizaciones/:id/duplicate", (r, c) => routeModules.quotationDuplicate.POST(r, c), { cotizacionId: "quote-1" }],
  ["PATCH /api/cotizaciones/:id", (r, c) => routeModules.quotation.PATCH(r, c), { cotizacionId: "quote-1" }],
];

function guardedRequest(): Request {
  return {
    json: async () => {
      bodyReads += 1;
      return {};
    },
    formData: async () => {
      bodyReads += 1;
      return new FormData();
    },
  } as Request;
}

for (const [name, handler, params] of handlers) {
  for (const rejected of [
    { label: "without a session", status: 401, error: "Unauthorized" },
    { label: "with an inactive user", status: 403, error: "User inactive" },
    { label: "with an insufficient role", status: 403, error: "Forbidden" },
  ]) {
    test(`${name} returns ${rejected.status} ${rejected.label} without side effects`, async () => {
      bodyReads = 0;
      privilegedCalls = 0;
      authorization = {
        ok: false,
        response: Response.json({ error: rejected.error }, { status: rejected.status }),
      };

      const response = await handler(guardedRequest(), { params });

      assert.equal(response.status, rejected.status);
      assert.deepEqual(await response.json(), { error: rejected.error });
      assert.equal(bodyReads, 0, "the rejected request body must not be parsed");
      assert.equal(privilegedCalls, 0, "Supabase and R2 must not be called");
    });
  }

  test(`${name} admits an active ADMIN past the authorization guard`, async () => {
    bodyReads = 0;
    privilegedCalls = 0;
    authorization = {
      ok: true,
      access: { id: "admin-1", email: "admin@example.test", role: "ADMIN", customer: null },
    };

    const response = await handler(guardedRequest(), { params });

    assert.notEqual(response.status, 401);
    assert.notEqual(response.status, 403);
    assert.ok(
      bodyReads > 0 || privilegedCalls > 0,
      "an authorized request must proceed to request parsing or a privileged dependency"
    );
  });
}
