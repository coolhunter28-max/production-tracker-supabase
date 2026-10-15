import assert from "node:assert/strict";
import test from "node:test";
import {
  QC_IMAGE_MAX_BYTES,
  hasValidQcImageSignature,
  qcImageExtension,
  validateQcImageMetadata,
} from "../../src/lib/qc-image-upload";

test("QC image metadata accepts the product's established formats and 15 MB ceiling", () => {
  for (const type of ["image/jpeg", "image/png", "image/webp"]) {
    const file = new File([new Uint8Array(1)], "photo", { type });
    assert.equal(validateQcImageMetadata(file), null);
  }

  const oversized = new File([new Uint8Array(QC_IMAGE_MAX_BYTES + 1)], "large.jpg", {
    type: "image/jpeg",
  });
  assert.match(validateQcImageMetadata(oversized) ?? "", /15 MB/);
  assert.match(
    validateQcImageMetadata(new File(["x"], "script.svg", { type: "image/svg+xml" })) ?? "",
    /Formato no permitido/
  );
});

test("QC image validation checks magic bytes instead of trusting MIME or filename", () => {
  assert.equal(hasValidQcImageSignature(Uint8Array.from([0xff, 0xd8, 0xff]), "image/jpeg"), true);
  assert.equal(
    hasValidQcImageSignature(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), "image/png"),
    true
  );
  assert.equal(
    hasValidQcImageSignature(Uint8Array.from([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80]), "image/webp"),
    true
  );
  assert.equal(hasValidQcImageSignature(new TextEncoder().encode("not an image"), "image/jpeg"), false);
  assert.equal(qcImageExtension("image/png"), "png");
});
