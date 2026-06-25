import PropTypes from "prop-types";

export default function Summary({ totalRows = 0, failedResults = [] }) {
  if (!totalRows) return null;

  const failedCount = failedResults.length;
  const successCount = totalRows - failedCount;

  const handleDownloadFailedCsv = () => {
    if (failedResults.length === 0) return;

    const headers = Object.keys(failedResults[0]);
    const csvRows = [
      headers.join(","),
      ...failedResults.map((row) =>
        headers
          .map((header) => {
            const value = row[header] ?? "";
            const stringValue = String(value).replace(/"/g, '""');
            return `"${stringValue}"`;
          })
          .join(","),
      ),
    ];

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "failed-seo-updates.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <s-section heading="Import summary">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: "16px",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            padding: "16px",
            background: "#fff",
          }}
        >
          <div
            style={{ fontSize: "14px", color: "#6b7280", marginBottom: "8px" }}
          >
            Total rows
          </div>
          <div style={{ fontSize: "24px", fontWeight: 700 }}>{totalRows}</div>
        </div>

        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            padding: "16px",
            background: "#fff",
          }}
        >
          <div
            style={{ fontSize: "14px", color: "#6b7280", marginBottom: "8px" }}
          >
            Updated successfully
          </div>
          <div style={{ fontSize: "24px", fontWeight: 700 }}>
            {successCount}
          </div>
        </div>

        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            padding: "16px",
            background: "#fff",
          }}
        >
          <div
            style={{ fontSize: "14px", color: "#6b7280", marginBottom: "8px" }}
          >
            Failed
          </div>
          <div style={{ fontSize: "24px", fontWeight: 700 }}>{failedCount}</div>
        </div>
      </div>

      {failedCount > 0 && (
        <>
          <div style={{ marginBottom: "16px" }}>
            <s-button onClick={handleDownloadFailedCsv}>
              Download failed rows CSV
            </s-button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                background: "#fff",
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "12px",
                      borderBottom: "1px solid #ddd",
                    }}
                  >
                    Handle
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "12px",
                      borderBottom: "1px solid #ddd",
                    }}
                  >
                    Error
                  </th>
                </tr>
              </thead>

              <tbody>
                {failedResults.map((row, index) => {
                  const handle =
                    row.handle ||
                    row.blog_handle ||
                    row.article_handle ||
                    row.page_handle ||
                    row.collection_handle ||
                    "-";

                  return (
                    <tr key={index}>
                      <td
                        style={{
                          padding: "12px",
                          borderBottom: "1px solid #eee",
                          color: "#111827",
                        }}
                      >
                        {handle}
                      </td>
                      <td
                        style={{
                          padding: "12px",
                          borderBottom: "1px solid #eee",
                          color: "#b42318",
                        }}
                      >
                        {row.message || "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </s-section>
  );
}

Summary.propTypes = {
  totalRows: PropTypes.number,
  failedResults: PropTypes.arrayOf(PropTypes.object),
};
