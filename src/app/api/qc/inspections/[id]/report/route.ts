import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/* -------------------------------------------------
 * Helpers
 * ------------------------------------------------- */
function safeStr(v: any) {
  return (v ?? "").toString().trim();
}

function fmtDate(d: any) {
  if (!d) return "";
  return safeStr(d);
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function fetchAsDataUri(url: string): Promise<string | null> {
  try {
    if (!url) return null;
    const res = await fetch(url);
    if (!res.ok) return null;

    const ct = res.headers.get("content-type") || "image/jpeg";
    const arr = await res.arrayBuffer();
    const b64 = Buffer.from(arr).toString("base64");
    return `data:${ct};base64,${b64}`;
  } catch {
    return null;
  }
}

/* -------------------------------------------------
 * PDF Styles (A4 Landscape - tipo slide)
 * ------------------------------------------------- */
const styles = StyleSheet.create({
  page: {
    padding: 26,
    fontSize: 12,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
  },

  headerRow: { flexDirection: "row", justifyContent: "space-between" },

  title: { fontSize: 26, fontWeight: 700, marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#333", marginBottom: 14 },
  meta: { fontSize: 12, color: "#333", marginBottom: 4 },

  sectionTitle: { fontSize: 14, fontWeight: 700, marginBottom: 8 },
  defectTitle: { fontSize: 16, fontWeight: 700, marginBottom: 10 },

  box: {
    border: "1px solid #e5e5e5",
    borderRadius: 6,
    padding: 10,
    backgroundColor: "#fff",
  },

  small: { fontSize: 11, color: "#444" },

  badgeFail: {
    alignSelf: "flex-start",
    backgroundColor: "#fee2e2",
    color: "#991b1b",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 10,
  },
  badgePass: {
    alignSelf: "flex-start",
    backgroundColor: "#dcfce7",
    color: "#166534",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 10,
  },

  /* ---------------- IMAGES (1 grande + 2 pequeñas) ---------------- */

  photosSection: {
    marginTop: 12,
    border: "1px solid #e5e5e5",
    borderRadius: 6,
    padding: 10,
    backgroundColor: "#fff",
    height: 350, // bloque de fotos más “alto”
  },

  bigWrap: {
    width: "100%",
    paddingBottom: 8,
  },

  twoRow: {
    flexDirection: "row",
    width: "100%",
  },

  smallWrap: {
    width: "50%",
    paddingRight: 8,
  },
  smallWrapLast: {
    width: "50%",
    paddingRight: 0,
  },

  imgCardBig: {
    border: "1px solid #eee",
    borderRadius: 6,
    padding: 6,
    backgroundColor: "#ffffff",
    height: 220, // FOTO GRANDE
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },

  imgCardSmall: {
    border: "1px solid #eee",
    borderRadius: 6,
    padding: 6,
    backgroundColor: "#ffffff",
    height: 105, // FOTOS PEQUEÑAS
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },

  // sin recorte
  img: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },

  /* ---------------- COVER PPS ---------------- */
  coverRight: { width: 360 },
  coverPpsCard: {
    border: "1px solid #eee",
    borderRadius: 6,
    padding: 6,
    height: 240,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  coverPpsImg: { width: "100%", height: "100%", objectFit: "contain" },
});

/* -------------------------------------------------
 * UI helper: render 1 big + 2 small (max 3 fotos)
 * ------------------------------------------------- */
function PhotosHeroLayout(h: any, photos: string[]) {
  const hero = photos[0];
  const small1 = photos[1];
  const small2 = photos[2];

  return h(
    View,
    { style: styles.photosSection },
    h(Text, { style: styles.sectionTitle }, "Defect Photos"),

    // HERO
    hero
      ? h(
          View,
          { style: styles.bigWrap },
          h(
            View,
            { style: styles.imgCardBig },
            h(Image, { style: styles.img, src: hero })
          )
        )
      : null,

    // 2 SMALL
    h(
      View,
      { style: styles.twoRow },
      small1
        ? h(
            View,
            { style: styles.smallWrap },
            h(
              View,
              { style: styles.imgCardSmall },
              h(Image, { style: styles.img, src: small1 })
            )
          )
        : h(View, { style: styles.smallWrap }),

      small2
        ? h(
            View,
            { style: styles.smallWrapLast },
            h(
              View,
              { style: styles.imgCardSmall },
              h(Image, { style: styles.img, src: small2 })
            )
          )
        : h(View, { style: styles.smallWrapLast })
    )
  );
}

/* -------------------------------------------------
 * PDF Builder (NO JSX)
 * ------------------------------------------------- */
function QCReportPDF(args: {
  inspection: any;
  ppsPhotoDataUri: string | null;
  defectsWithPhotos: any[];
}) {
  const { inspection, ppsPhotoDataUri, defectsWithPhotos } = args;
  const h = React.createElement;

  const aql = safeStr(inspection.aql_result).toUpperCase();
  const isFail = aql.includes("FAIL") || aql.includes("NOT CONFORM");

  const coverTitle = `${safeStr(inspection.customer) || "QC"} Final Inspection`;
  const coverSub = `Ref. ${safeStr(inspection.reference)}  |  PO ${safeStr(
    inspection.po_number
  )}  |  Style ${safeStr(inspection.style)}  |  Color ${safeStr(
    inspection.color
  )}`;

  const coverRight = ppsPhotoDataUri
    ? h(
        View,
        { style: styles.coverRight },
        h(
          Text,
          { style: [styles.sectionTitle, { marginBottom: 6 }] },
          "PPS / Style View"
        ),
        h(
          View,
          { style: styles.coverPpsCard },
          h(Image, { style: styles.coverPpsImg, src: ppsPhotoDataUri })
        )
      )
    : h(View, { style: styles.coverRight });

  const coverPage = h(
    Page,
    { size: "A4", orientation: "landscape", style: styles.page },
    h(
      View,
      { style: styles.headerRow },
      h(
        View,
        null,
        h(Text, { style: styles.title }, coverTitle),
        h(Text, { style: styles.subtitle }, coverSub),
        h(Text, { style: styles.meta }, `Factory: ${safeStr(inspection.factory)}`),
        h(Text, { style: styles.meta }, `Date: ${fmtDate(inspection.inspection_date)}`),
        h(Text, { style: styles.meta }, `Inspector: ${safeStr(inspection.inspector) || "—"}`),
        h(
          Text,
          { style: styles.meta },
          `Qty Inspected: ${inspection.qty_inspected ?? 0} / PO Qty: ${inspection.qty_po ?? 0}`
        )
      ),
      coverRight
    ),
    h(
      View,
      { style: { marginTop: 18 } },
      h(Text, { style: styles.sectionTitle }, "Summary"),
      h(
        View,
        { style: styles.box },
        h(
          Text,
          { style: styles.small },
          `AQL Level: ${safeStr(inspection.aql_level) || "—"} | Result: ${
            safeStr(inspection.aql_result) || "—"
          }`
        ),
        h(
          Text,
          { style: styles.small },
          `Critical Found/Allowed: ${inspection.critical_found ?? 0}/${inspection.critical_allowed ?? 0} | ` +
            `Major Found/Allowed: ${inspection.major_found ?? 0}/${inspection.major_allowed ?? 0} | ` +
            `Minor Found/Allowed: ${inspection.minor_found ?? 0}/${inspection.minor_allowed ?? 0}`
        )
      )
    )
  );

  const defectPages: any[] = [];

  for (const d of defectsWithPhotos) {
    const title =
      (safeStr(d.defect_id) ? `${safeStr(d.defect_id)} - ` : "") +
      (safeStr(d.defect_description) || safeStr(d.defect_type) || "Defect");

    const photos: string[] = d._photoDataUris || [];
    const photoChunks = chunk(photos, 3); // ✅ 1 grande + 2 pequeñas por página

    const hasAction =
      safeStr(d.action_plan) || safeStr(d.action_owner) || safeStr(d.action_due_date);

    const actionBlock = hasAction
      ? h(
          View,
          { style: { marginTop: 10 }, wrap: false as any },
          h(Text, { style: styles.sectionTitle }, "Action Plan"),
          h(
            View,
            { style: styles.box },
            h(Text, { style: styles.small }, `Plan: ${safeStr(d.action_plan) || "—"}`),
            h(Text, { style: styles.small }, `Owner: ${safeStr(d.action_owner) || "—"}`),
            h(Text, { style: styles.small }, `Due: ${safeStr(d.action_due_date) || "—"}`),
            h(Text, { style: styles.small }, `Status: ${safeStr(d.action_status) || "open"}`)
          )
        )
      : null;

    // si no hay fotos, al menos 1 página
    const chunksToRender = photoChunks.length ? photoChunks : [[]];

    chunksToRender.forEach((chunkPhotos, idx) => {
      const isLast = idx === chunksToRender.length - 1;

      const photosBlock =
        chunkPhotos.length > 0
          ? PhotosHeroLayout(h, chunkPhotos)
          : h(
              View,
              {
                style: [
                  styles.photosSection,
                  { justifyContent: "center", alignItems: "center" },
                ],
              },
              h(Text, { style: styles.small }, "No photos for this defect.")
            );

      defectPages.push(
        h(
          Page,
          {
            key: `${d.id}-${idx}`,
            size: "A4",
            orientation: "landscape",
            style: styles.page,
          },
          h(
            Text,
            { style: styles.defectTitle },
            idx === 0 ? title : `${title} (cont.)`
          ),

          h(
            View,
            { style: styles.box },
            h(
              Text,
              { style: styles.meta },
              `Style Ref/Color: ${safeStr(inspection.style)}/${safeStr(inspection.color)}`
            ),
            h(Text, { style: styles.meta }, `Factory: ${safeStr(inspection.factory)}`),
            h(Text, { style: styles.meta }, `Date: ${fmtDate(inspection.inspection_date)}`),
            h(Text, { style: styles.meta }, `Qty: ${d.defect_quantity ?? 0}`)
          ),

          photosBlock,

          // ✅ Action plan solo en la última página del defecto
          isLast ? actionBlock : null
        )
      );
    });
  }

  const conclusionsNotes = safeStr((inspection as any).conclusions) || "—";
  const conclusionsPage = h(
    Page,
    { size: "A4", orientation: "landscape", style: styles.page },
    h(
      Text,
      { style: styles.defectTitle },
      `Style Ref/Color: ${safeStr(inspection.style)} / ${safeStr(inspection.color)}`
    ),
    h(Text, { style: styles.meta }, `Factory: ${safeStr(inspection.factory)}`),
    h(Text, { style: styles.meta }, `Date: ${fmtDate(inspection.inspection_date)}`),

    h(
      View,
      { style: { marginTop: 14 } },
      h(
        Text,
        { style: isFail ? styles.badgeFail : styles.badgePass },
        `Conclusions final inspection: ${aql || "—"}`
      ),
      h(
        View,
        { style: styles.box },
        h(Text, { style: styles.small }, `Notes: ${conclusionsNotes}`),
        h(
          Text,
          { style: [styles.small, { marginTop: 10 }] },
          "Next step: Factory should review pairs and follow the action plans above."
        )
      )
    )
  );

  return h(Document, null, coverPage, ...defectPages, conclusionsPage);
}

/* -------------------------------------------------
 * GET /api/qc/inspections/[id]/report
 * ------------------------------------------------- */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const inspectionId = params.id;

    // 1) Load inspection + defects + photos
    const { data: inspection, error } = await supabase
      .from("qc_inspections")
      .select(
        `
        *,
        qc_defects (
          *,
          qc_defect_photos (*)
        )
      `
      )
      .eq("id", inspectionId)
      .single();

    if (error || !inspection) {
      return NextResponse.json({ error: "Inspection not found" }, { status: 404 });
    }

    // 2) PPS photo (first by order)
    const { data: ppsPhotos } = await supabase
      .from("qc_pps_photos")
      .select("*")
      .eq("po_id", inspection.po_id)
      .order("photo_order", { ascending: true })
      .limit(1);

    const ppsUrl = ppsPhotos?.[0]?.photo_url ? safeStr(ppsPhotos[0].photo_url) : "";
    const ppsDataUri = ppsUrl ? await fetchAsDataUri(ppsUrl) : null;

    // 3) Sort defects by D1..D10
    const defects = (inspection.qc_defects ?? []) as any[];

    const sortedDefects = [...defects].sort((a, b) => {
      const ai = parseInt(String(a.defect_id || "").replace(/[^\d]/g, ""), 10);
      const bi = parseInt(String(b.defect_id || "").replace(/[^\d]/g, ""), 10);
      const aNum = Number.isFinite(ai) ? ai : 999;
      const bNum = Number.isFinite(bi) ? bi : 999;
      if (aNum !== bNum) return aNum - bNum;
      return String(a.id).localeCompare(String(b.id));
    });

    // 4) Fetch defect photos as data URIs (max 9 -> 3 páginas como mucho)
    const defectsWithPhotos: any[] = [];
    for (const d of sortedDefects) {
      const photos = (d.qc_defect_photos ?? []) as any[];
      const ordered = [...photos].sort(
        (x, y) => (x.photo_order ?? 0) - (y.photo_order ?? 0)
      );
      const limited = ordered.slice(0, 9);

      const dataUris: string[] = [];
      for (const p of limited) {
        const u = safeStr(p.photo_url);
        const du = u ? await fetchAsDataUri(u) : null;
        if (du) dataUris.push(du);
      }

      defectsWithPhotos.push({
        ...d,
        _photoDataUris: dataUris,
      });
    }

    // 5) Build PDF buffer
    const doc = QCReportPDF({
      inspection,
      ppsPhotoDataUri: ppsDataUri,
      defectsWithPhotos,
    });

    const buffer = await pdf(doc).toBuffer();

    // 6) Response as downloadable PDF
    const fileName = `QC_Report_${safeStr(inspection.po_number) || inspectionId}.pdf`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    console.error("QC report pdf error:", e);
    return NextResponse.json(
      { error: e?.message || "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
