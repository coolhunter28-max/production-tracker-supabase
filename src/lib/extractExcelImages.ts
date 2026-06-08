import ExcelJS from "exceljs";

export type ExtractedImage = {
  sheetName: string;
  imageId: number;
  buffer: Buffer;
  extension: "jpeg" | "png";
};

export async function extractExcelImages(
  workbook: ExcelJS.Workbook
): Promise<ExtractedImage[]> {
  const results: ExtractedImage[] = [];

  for (const sheet of workbook.worksheets) {
    const sheetName = sheet.name;

    const isDefectSheet = /^D([1-9]|10)$/.test(sheetName);
    const isPpsSheet = sheetName === "Style Views";

    if (!isDefectSheet && !isPpsSheet) continue;

    const images = sheet.getImages();

    for (const img of images) {
      const imageId = Number((img as any).imageId);
      const image = workbook.getImage(imageId);

      if (!image) continue;

      const rawBuffer = (image as any).buffer;
      if (!rawBuffer) continue;

      const buffer = Buffer.isBuffer(rawBuffer)
        ? rawBuffer
        : Buffer.from(rawBuffer);

      const extension: "jpeg" | "png" =
        (image as any).extension === "png" ? "png" : "jpeg";

      results.push({
        sheetName,
        imageId,
        buffer,
        extension,
      });
    }
  }

  return results;
}