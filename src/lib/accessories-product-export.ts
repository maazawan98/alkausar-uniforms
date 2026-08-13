import ExcelJS from "exceljs";
import type { AccExportPayload, AccExportProductRow } from "./accessories-product-export.functions";

const EMPTY = "—";

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}
function fmtMoney(n: number): string {
  return `Rs. ${n.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
}
function yn(v: boolean): string {
  return v ? "Yes" : "No";
}
function joinOrDash(arr: string[], sep = ", "): string {
  return arr.length ? arr.join(sep) : EMPTY;
}
function safeFilename(s: string): string {
  return s.replace(/[^\p{L}\p{N}\-_]+/gu, "_").replace(/^_+|_+$/g, "") || "Accessories";
}

function mapRow(r: AccExportProductRow): (string | number)[] {
  const sizes = r.sizes.length ? r.sizes.map((s) => s.size).join(", ") : EMPTY;
  const prices = r.sizes.length
    ? r.sizes.map((s) => `${s.size} = ${fmtMoney(s.price)}`).join("\n")
    : EMPTY;
  const sales = r.sizes.some((s) => s.sale_price != null)
    ? r.sizes
        .filter((s) => s.sale_price != null)
        .map((s) => `${s.size} = ${fmtMoney(s.sale_price as number)}`)
        .join("\n")
    : EMPTY;
  return [
    r.customer_name,
    r.product_name || EMPTY,
    r.company_name || EMPTY,
    yn(r.is_active),
    yn(r.is_featured),
    yn(r.is_deal),
    yn(r.is_out_of_stock),
    r.rating != null ? r.rating.toFixed(1) : EMPTY,
    joinOrDash(r.genders),
    sizes,
    prices,
    sales,
    joinOrDash(r.quality_tags),
    r.colours.length ? r.colours.map((c) => c.hex.toUpperCase()).join("\n") : EMPTY,
    r.description || EMPTY,
    r.primary_image_filename || EMPTY,
    fmtDate(r.created_at),
    fmtDate(r.updated_at),
  ];
}

const HEADERS = [
  "Customer Sees",
  "Product Name",
  "Company Name",
  "Active",
  "Featured",
  "Deals",
  "Out Of Stock",
  "Rating",
  "Genders",
  "Sizes",
  "Prices",
  "Sale Prices",
  "Quality Tags",
  "Colours (HEX)",
  "Description",
  "Primary Image",
  "Created At",
  "Updated At",
];
const COL_WIDTHS = [34, 24, 24, 10, 10, 10, 12, 9, 20, 22, 26, 26, 24, 20, 50, 28, 14, 14];

export async function downloadAccessoriesProductsExport(payload: AccExportPayload): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Alkausar Uniforms";
  wb.created = new Date();
  const ws = wb.addWorksheet(payload.category_name.slice(0, 28) || "Accessories");

  const titleRow = ws.addRow([`Alkausar Uniforms — ${payload.category_name} Accessories`]);
  ws.mergeCells(titleRow.number, 1, titleRow.number, HEADERS.length);
  titleRow.getCell(1).font = {
    name: "Calibri",
    size: 16,
    bold: true,
    color: { argb: "FF111111" },
  };
  titleRow.getCell(1).alignment = { vertical: "middle", horizontal: "left" };
  titleRow.height = 26;

  const meta: [string, string][] = [
    ["Module", "Accessories"],
    ["Category", payload.category_name],
    ["Export Date", fmtDate(payload.generated_at)],
    ["Total Products", String(payload.rows.length)],
  ];
  for (const [k, v] of meta) {
    const r = ws.addRow([k, v]);
    r.getCell(1).font = { bold: true, color: { argb: "FF6B7280" } };
    r.getCell(2).font = { color: { argb: "FF111111" } };
  }
  ws.addRow([]);

  const headerRow = ws.addRow(HEADERS);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, name: "Calibri" };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF111111" } };
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: "FF111111" } },
      bottom: { style: "thin", color: { argb: "FF111111" } },
      left: { style: "thin", color: { argb: "FFE5E7EB" } },
      right: { style: "thin", color: { argb: "FFE5E7EB" } },
    };
  });
  headerRow.height = 22;
  ws.views = [{ state: "frozen", ySplit: headerRow.number }];
  ws.autoFilter = {
    from: { row: headerRow.number, column: 1 },
    to: { row: headerRow.number, column: HEADERS.length },
  };

  const descIdx = HEADERS.indexOf("Description") + 1;
  for (const row of payload.rows) {
    const excelRow = ws.addRow(mapRow(row));
    excelRow.alignment = { vertical: "top", wrapText: true };
    excelRow.eachCell((cell, col) => {
      cell.border = {
        top: { style: "hair", color: { argb: "FFF1F2F4" } },
        bottom: { style: "hair", color: { argb: "FFF1F2F4" } },
        left: { style: "hair", color: { argb: "FFF1F2F4" } },
        right: { style: "hair", color: { argb: "FFF1F2F4" } },
      };
      if (col === descIdx) cell.alignment = { vertical: "top", wrapText: true };
    });
  }

  COL_WIDTHS.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeFilename(payload.category_name)}_Accessories.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
