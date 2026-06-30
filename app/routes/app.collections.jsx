import { boundary } from "@shopify/shopify-app-react-router/server";
import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { parseCsv } from "../utils/parseCsv";
import Summary from "../components/Summary";
import Breadcrumb from "../components/Breadcrumb";
export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const formData = await request.formData();
  const rows = JSON.parse(formData.get("rows") || "[]");

  const results = [];

  for (const row of rows) {
    try {
      const handle = row.handle?.trim();
      const seoTitle = row.seo_title?.trim() || "";
      const seoDescription = row.seo_description?.trim() || "";

      if (!handle) {
        results.push({
          handle: "",
          success: false,
          message: "Missing handle",
        });
        continue;
      }

      // 1) Find collection by handle
      const collectionSearchResponse = await admin.graphql(
        `#graphql
          query GetCollectionByHandle($query: String!) {
            collections(first: 1, query: $query) {
              edges {
                node {
                  id
                  handle
                  title
                }
              }
            }
          }
        `,
        {
          variables: {
            query: `handle:${handle}`,
          },
        },
      );

      const collectionSearchJson = await collectionSearchResponse.json();
      const collectionEdge =
        collectionSearchJson?.data?.collections?.edges?.[0];

      if (!collectionEdge) {
        results.push({
          handle,
          success: false,
          message: "Collection not found",
        });
        continue;
      }

      const collectionId = collectionEdge.node.id;

      // 2) Update collection SEO
      const updateResponse = await admin.graphql(
        `#graphql
          mutation UpdateCollectionSeo($input: CollectionInput!) {
            collectionUpdate(input: $input) {
              collection {
                id
                handle
                seo {
                  title
                  description
                }
              }
              userErrors {
                field
                message
              }
            }
          }
        `,
        {
          variables: {
            input: {
              id: collectionId,
              seo: {
                title: seoTitle,
                description: seoDescription,
              },
            },
          },
        },
      );

      const updateJson = await updateResponse.json();
      const userErrors = updateJson?.data?.collectionUpdate?.userErrors || [];

      if (userErrors.length > 0) {
        results.push({
          handle,
          success: false,
          message: userErrors.map((err) => err.message).join(", "),
        });
        continue;
      }

      results.push({
        handle,
        success: true,
        message: "SEO updated successfully",
      });
    } catch (error) {
      results.push({
        handle: row.handle || "",
        success: false,
        message: error.message || "Something went wrong",
      });
    }
  }

  const successCount = results.filter((item) => item.success).length;
  const failedResults = results.filter((item) => !item.success);

  return {
    success: failedResults.length === 0,
    message: `Collection SEO update completed. Success: ${successCount}, Failed: ${failedResults.length}`,
    failedResults,
    totalRows: rows.length,
  };
};

export default function CollectionsSeoPage() {
  const [fileName, setFileName] = useState("");
  const [csvRows, setCsvRows] = useState([]);
  const [progress, setProgress] = useState(0);

  const fetcher = useFetcher();
  const shopify = useAppBridge();

  const isUpdating =
    ["loading", "submitting"].includes(fetcher.state) &&
    fetcher.formMethod === "POST";

  useEffect(() => {
    let interval;

    if (isUpdating) {
      setProgress(10);

      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + 10;
        });
      }, 300);
    }

    if (!isUpdating && fetcher.data) {
      setProgress(100);
      shopify.toast.show(fetcher.data.message);

      setTimeout(() => {
        setProgress(0);
      }, 1200);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isUpdating, fetcher.data, shopify]);

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const text = await file.text();
    const rows = parseCsv(text);
    setCsvRows(rows);
  };

  const handleUpdateSeo = () => {
    const formData = new FormData();
    formData.append("rows", JSON.stringify(csvRows));
    fetcher.submit(formData, { method: "POST" });
  };

  const failedResults = fetcher.data?.failedResults || [];

  return (
    <s-page heading="Collection SEO Updater">
      <Breadcrumb currentPage="Collection" />
      <s-section heading="Upload Collection SEO CSV">
        <s-paragraph>
          Upload a CSV file with collection handle, SEO title, and SEO
          description.
        </s-paragraph>

        <div style={{ marginTop: "16px", marginBottom: "16px" }}>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="button-for-file-selection"
          />
        </div>

        {fileName ? (
          <s-paragraph>Selected file: {fileName}</s-paragraph>
        ) : (
          <s-paragraph>No file selected yet.</s-paragraph>
        )}

        <div style={{ marginTop: "16px" }}>
          <s-button
            onClick={handleUpdateSeo}
            disabled={csvRows.length === 0 || isUpdating}
            {...(isUpdating ? { loading: true } : {})}
          >
            Update Collection SEO
          </s-button>
        </div>

        {(isUpdating || progress > 0) && (
          <div style={{ marginTop: "20px" }}>
            <div
              style={{
                width: "100%",
                height: "14px",
                background: "#e5e7eb",
                borderRadius: "999px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: "100%",
                  background: "#0a66ff",
                  transition: "width 0.3s ease",
                }}
              />
            </div>

            <p style={{ marginTop: "8px", fontSize: "14px" }}>
              {progress === 100
                ? "Update completed"
                : `Updating SEO... ${progress}%`}
            </p>
          </div>
        )}
      </s-section>

      <s-section heading="CSV format">
        <s-box
          padding="base"
          borderWidth="base"
          borderRadius="base"
          background="subdued"
        >
          <pre style={{ margin: 0 }}>
            {`handle,seo_title,seo_description
          frontpage,New collection SEO title,New collection SEO description
          summer-sale,Best summer collection,Shop summer collection now`}
          </pre>
        </s-box>
      </s-section>

      <Summary
        totalRows={fetcher.data?.totalRows || 0}
        failedResults={failedResults}
      />
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
