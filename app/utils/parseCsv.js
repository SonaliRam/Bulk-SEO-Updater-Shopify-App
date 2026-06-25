import Papa from "papaparse";

export function parseCsv(csvText) {
  const result = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().replace(/^\uFEFF/, ""),
  });

  return result.data.map((row) => {
    const cleanedRow = {};

    Object.keys(row).forEach((key) => {
      const cleanKey = key.trim();
      const value = row[key];

      cleanedRow[cleanKey] =
        typeof value === "string" ? value.trim() : value || "";
    });

    return cleanedRow;
  });
}
