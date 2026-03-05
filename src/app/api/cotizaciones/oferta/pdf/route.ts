// src/app/api/cotizaciones/oferta/pdf/route.ts
import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

type OfferRow = {
  style?: string;
  reference?: string;
  color?: string;
  season?: string;
  size_range?: string;
  currency?: string; // lo ignoramos en el PDF (ya va con $)
  sell_price?: number;
  picture_url?: string; // idealmente ya es la de VARIANTE (tu page ya lo arregló)
  comps?: {
    upper?: string;
    lining?: string;
    insole?: string;
    outsole?: string;
    shoelace?: string;
    packaging?: string;
  } | null;
};

function moneyUSD(n: any) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "$0.00";
  return `$${v.toFixed(2)}`;
}

function safeStr(v: any) {
  return String(v ?? "").trim();
}

// wrapper simple por ancho (aprox) usando medida del font
function wrapText(
  text: string,
  font: any,
  fontSize: number,
  maxWidth: number
): string[] {
  const t = safeStr(text);
  if (!t) return [];
  const words = t.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";

  for (const w of words) {
    const candidate = cur ? `${cur} ${w}` : w;
    const width = font.widthOfTextAtSize(candidate, fontSize);
    if (width <= maxWidth) {
      cur = candidate;
    } else {
      if (cur) lines.push(cur);
      // si una palabra sola es más larga que max, la partimos brutalmente
      if (font.widthOfTextAtSize(w, fontSize) > maxWidth) {
        let chunk = "";
        for (const ch of w) {
          const c2 = chunk + ch;
          if (font.widthOfTextAtSize(c2, fontSize) <= maxWidth) chunk = c2;
          else {
            if (chunk) lines.push(chunk);
            chunk = ch;
          }
        }
        cur = chunk;
      } else {
        cur = w;
      }
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

async function fetchBytes(url: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    return new Uint8Array(ab);
  } catch {
    return null;
  }
}

async function embedImageSmart(pdfDoc: PDFDocument, bytes: Uint8Array) {
  // intentamos PNG primero, si falla JPG
  try {
    return await pdfDoc.embedPng(bytes);
  } catch {
    return await pdfDoc.embedJpg(bytes);
  }
}

function drawKeyVal(
  page: any,
  fontBold: any,
  font: any,
  x: number,
  y: number,
  key: string,
  value: string,
  size = 9,
  valueGap = 8
) {
  page.drawText(`${key}:`, { x, y, size, font: fontBold });
  page.drawText(value || "-", { x: x + 90 + valueGap, y, size, font });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const customer = safeStr(body.customer);
    const season = safeStr(body.season);
    const date = safeStr(body.date); // YYYY-MM-DD (del input)
    const incoterm = safeStr(body.incoterm);
    const moq = safeStr(body.moq);

    const includeComps = Boolean(body.include_comps);
    const includePhotos = Boolean(body.include_photos);

    const rows: OfferRow[] = Array.isArray(body.rows) ? body.rows : [];
    if (!customer || !season || !date) {
      return NextResponse.json(
        { error: "Faltan campos: customer/season/date" },
        { status: 400 }
      );
    }
    if (rows.length === 0) {
      return NextResponse.json({ error: "No hay filas para el PDF" }, { status: 400 });
    }

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // A4 portrait
    const PAGE_W = 595.28;
    const PAGE_H = 841.89;

    // Margins
    const M = 48;
    const TOP = PAGE_H - 48;
    const BOTTOM = 48;

    // Layout header
    const LOGO_MAX_W = 120;
    const LOGO_MAX_H = 80;
    const TITLE_SIZE = 20;
    const TITLE_GAP_FROM_LOGO = 10;
    const HEADER_GAP_AFTER_META = 16;

    // Item layout
    const ITEM_PHOTO = 78; // un poco más grande
    const ITEM_GAP = 14; // separación entre items
    const ITEM_PAD_Y = 8;
    const LINE_THIN = 0.6;

    const TEXT_SIZE = 9;
    const SMALL_SIZE = 8;
    const PRICE_SIZE = 12;

    // ========= Logo =========
    let logoImg: any = null;
    let logoDrawW = 0;
    let logoDrawH = 0;

    try {
      const logoPath = path.join(process.cwd(), "public", "logo-bsg.png");
      const logoBytes = fs.readFileSync(logoPath);
      logoImg = await pdfDoc.embedPng(logoBytes);

      const iw = logoImg.width;
      const ih = logoImg.height;
      const scale = Math.min(LOGO_MAX_W / iw, LOGO_MAX_H / ih);

      logoDrawW = iw * scale;
      logoDrawH = ih * scale;
    } catch {
      // si no existe, seguimos sin logo
      logoImg = null;
    }

    function newPage() {
      return pdfDoc.addPage([PAGE_W, PAGE_H]);
    }

    // ========= Dibuja cabecera en una página =========
    function drawHeader(page: any) {
      let y = TOP;

      // logo
      if (logoImg) {
        page.drawImage(logoImg, {
          x: M,
          y: y - logoDrawH,
          width: logoDrawW,
          height: logoDrawH,
        });
      }

      // Title debajo del logo (pero con respiro)
      const usedLogoH = logoImg ? logoDrawH : 0;
      const titleY = y - usedLogoH - TITLE_GAP_FROM_LOGO - TITLE_SIZE;

      page.drawText("Price List", {
        x: M,
        y: titleY,
        size: TITLE_SIZE,
        font: fontBold,
      });

      // Meta justo debajo del título (armonioso, sin huecos raros)
      let metaY = titleY - 20;

      drawKeyVal(page, fontBold, font, M, metaY, "CUSTOMER", customer, TEXT_SIZE);
      metaY -= 14;
      drawKeyVal(page, fontBold, font, M, metaY, "SEASON", season, TEXT_SIZE);
      metaY -= 14;
      drawKeyVal(page, fontBold, font, M, metaY, "DATE", date, TEXT_SIZE);
      metaY -= 14;
      drawKeyVal(page, fontBold, font, M, metaY, "INCOTERM", incoterm || "-", TEXT_SIZE);
      metaY -= 14;
      drawKeyVal(page, fontBold, font, M, metaY, "MOQ", moq || "-", TEXT_SIZE);

      // línea separadora
      const lineY = metaY - HEADER_GAP_AFTER_META;
      page.drawLine({
        start: { x: M, y: lineY },
        end: { x: PAGE_W - M, y: lineY },
        thickness: LINE_THIN,
        color: rgb(0.75, 0.75, 0.75),
      });

      return lineY - 18; // y inicial para items
    }

    // ========= Dibuja footer page X/Y =========
    function drawFooter(page: any, pageIndex1: number, total: number) {
      const txt = `Page ${pageIndex1} / ${total}`;
      const size = 8;
      const w = font.widthOfTextAtSize(txt, size);
      page.drawText(txt, {
        x: PAGE_W - M - w,
        y: 20,
        size,
        font,
        color: rgb(0.45, 0.45, 0.45),
      });
    }

    // ========= Render item =========
    async function drawItem(page: any, yTop: number, r: OfferRow) {
      // Calcula alto del bloque según contenido (comps + wraps)
      const x0 = M;
      const xPhoto = x0;
      const xText = x0 + ITEM_PHOTO + 18;
      const xRight = PAGE_W - M;

      const title = `${safeStr(r.style) || "-"}${r.reference ? ` · ${safeStr(r.reference)}` : ""}`.trim();
      const color = safeStr(r.color);
      const sizeRange = safeStr(r.size_range);
      const rowSeason = safeStr(r.season);
      const price = moneyUSD(r.sell_price);

      const metaLine = `Color: ${color || "-"} · Size: ${sizeRange || "-"} · Season: ${rowSeason || "-"}`;

      const maxTextW = (xRight - 90) - xText; // reserva derecha para precio
      const titleLines = wrapText(title, fontBold, TEXT_SIZE + 1, maxTextW);
      const metaLines = wrapText(metaLine, font, SMALL_SIZE, maxTextW);

      const comps: string[] = [];
      if (includeComps && r.comps) {
        const add = (k: string, v: any) => {
          const vv = safeStr(v);
          if (vv) comps.push(`${k}: ${vv}`);
        };
        add("UPPER", r.comps.upper);
        add("LINING", r.comps.lining);
        add("INSOLE", r.comps.insole);
        add("OUTSOLE", r.comps.outsole);
        add("SHOELACE", r.comps.shoelace);
        add("PACKAGING", r.comps.packaging);
      }

      const compTitleH = (includeComps && comps.length) ? 12 : 0;
      const compsH = (includeComps && comps.length) ? (comps.length * 11) : 0;

      const titleH = Math.max(1, titleLines.length) * 12;
      const metaH = Math.max(1, metaLines.length) * 11;

      // bloque mínimo para que foto quepa
      const contentH = Math.max(ITEM_PHOTO, titleH + metaH + compTitleH + compsH + ITEM_PAD_Y * 2);
      const yBottom = yTop - contentH;

      // separador superior del bloque (muy sutil)
      page.drawLine({
        start: { x: M, y: yTop },
        end: { x: PAGE_W - M, y: yTop },
        thickness: LINE_THIN,
        color: rgb(0.85, 0.85, 0.85),
      });

      // Foto
      if (includePhotos) {
        const url = safeStr(r.picture_url);
        if (url) {
          const bytes = await fetchBytes(url);
          if (bytes) {
            try {
              const img = await embedImageSmart(pdfDoc, bytes);

              const iw = img.width;
              const ih = img.height;
              const scale = Math.min(ITEM_PHOTO / iw, ITEM_PHOTO / ih);
              const w = iw * scale;
              const h = ih * scale;

              const px = xPhoto + (ITEM_PHOTO - w) / 2;
              const py = yTop - ITEM_PAD_Y - h;

              // marco
              page.drawRectangle({
                x: xPhoto,
                y: yTop - ITEM_PAD_Y - ITEM_PHOTO,
                width: ITEM_PHOTO,
                height: ITEM_PHOTO,
                borderColor: rgb(0.85, 0.85, 0.85),
                borderWidth: 0.7,
                color: rgb(0.98, 0.98, 0.98),
              });

              page.drawImage(img, { x: px, y: py, width: w, height: h });
            } catch {
              // placeholder
              page.drawRectangle({
                x: xPhoto,
                y: yTop - ITEM_PAD_Y - ITEM_PHOTO,
                width: ITEM_PHOTO,
                height: ITEM_PHOTO,
                borderColor: rgb(0.85, 0.85, 0.85),
                borderWidth: 0.7,
                color: rgb(0.97, 0.97, 0.97),
              });
            }
          } else {
            page.drawRectangle({
              x: xPhoto,
              y: yTop - ITEM_PAD_Y - ITEM_PHOTO,
              width: ITEM_PHOTO,
              height: ITEM_PHOTO,
              borderColor: rgb(0.85, 0.85, 0.85),
              borderWidth: 0.7,
              color: rgb(0.97, 0.97, 0.97),
            });
          }
        } else {
          page.drawRectangle({
            x: xPhoto,
            y: yTop - ITEM_PAD_Y - ITEM_PHOTO,
            width: ITEM_PHOTO,
            height: ITEM_PHOTO,
            borderColor: rgb(0.85, 0.85, 0.85),
            borderWidth: 0.7,
            color: rgb(0.97, 0.97, 0.97),
          });
        }
      }

      // Precio a la derecha
      page.drawText(price, {
        x: xRight - fontBold.widthOfTextAtSize(price, PRICE_SIZE),
        y: yTop - ITEM_PAD_Y - 2,
        size: PRICE_SIZE,
        font: fontBold,
      });

      // Texto
      let ty = yTop - ITEM_PAD_Y;

      // título
      for (const line of (titleLines.length ? titleLines : [title || "-"])) {
        page.drawText(line, { x: xText, y: ty - 11, size: TEXT_SIZE + 1, font: fontBold });
        ty -= 12;
      }

      // meta
      for (const line of (metaLines.length ? metaLines : [metaLine])) {
        page.drawText(line, { x: xText, y: ty - 10, size: SMALL_SIZE, font });
        ty -= 11;
      }

      // composiciones
      if (includeComps && comps.length) {
        ty -= 3;
        page.drawText("Composition", { x: xText, y: ty - 10, size: SMALL_SIZE, font: fontBold });
        ty -= 12;

        for (const c of comps) {
          // "UPPER:" en bold + resto normal (simple)
          const idx = c.indexOf(":");
          const key = idx >= 0 ? c.slice(0, idx + 1) : c;
          const val = idx >= 0 ? c.slice(idx + 1).trim() : "";

          page.drawText(key, { x: xText, y: ty - 10, size: SMALL_SIZE, font: fontBold });
          page.drawText(val, {
            x: xText + fontBold.widthOfTextAtSize(key, SMALL_SIZE) + 4,
            y: ty - 10,
            size: SMALL_SIZE,
            font,
          });
          ty -= 11;
        }
      }

      // separador inferior
      page.drawLine({
        start: { x: M, y: yBottom },
        end: { x: PAGE_W - M, y: yBottom },
        thickness: LINE_THIN,
        color: rgb(0.88, 0.88, 0.88),
      });

      return yBottom - ITEM_GAP;
    }

    // ========= Render multipage =========
    const pages: any[] = [];
    let page = newPage();
    pages.push(page);

    let y = drawHeader(page);

    for (const r of rows) {
      // estimación rápida de “si cabe”: usamos un mínimo fijo + comps aprox
      const compsCount =
        includeComps && r?.comps
          ? Object.values(r.comps).filter((x) => safeStr(x)).length
          : 0;

      const estimatedH = Math.max(
        ITEM_PHOTO,
        28 + (includeComps && compsCount ? (14 + compsCount * 11) : 0)
      ) + ITEM_GAP + 6;

      if (y - estimatedH < BOTTOM) {
        page = newPage();
        pages.push(page);
        y = drawHeader(page);
      }

      y = await drawItem(page, y, r);

      if (y < BOTTOM + 10) {
        page = newPage();
        pages.push(page);
        y = drawHeader(page);
      }
    }

    // footer page numbers
    const total = pages.length;
    for (let i = 0; i < total; i++) {
      drawFooter(pages[i], i + 1, total);
    }

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=offer_${customer}_${season}_${date}.pdf`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}