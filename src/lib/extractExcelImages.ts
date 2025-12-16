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

    // Solo nos interesan estas hojas
    const isDefectSheet = /^D([1-9]|10)$/.test(sheetName);
    const isPpsSheet = sheetName === "Style Views";

    if (!isDefectSheet && !isPpsSheet) continue;

    const images = sheet.getImages();

    for (const img of images) {
      const image = workbook.getImage(img.imageId);
      if (!image) continue;

      const buffer = Buffer.from(image.buffer);
      const extension =
        image.extension === "jpeg" || image.extension === "png"
          ? image.extension
          : "jpeg";

      results.push({
        sheetName,
        imageId: img.imageId,
        buffer,
        extension,
      });
    }
  }

  return results;
}
