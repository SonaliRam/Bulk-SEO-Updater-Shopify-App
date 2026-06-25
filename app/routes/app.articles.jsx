import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import { authenticate } from "../shopify.server";
import Summary from "../components/Summary";
import Breadcrumb from "../components/Breadcrumb";
export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const formData = await request.formData();
  const rows = JSON.parse(formData.get("rows") || "[]");

  const results = [];

  for (const row of rows) {
    try {
      const blogHandle = row.blog_handle?.trim();
      const articleHandle = row.article_handle?.trim();
      const seoTitle = row.seo_title?.trim() || "";
      const seoDescription = row.seo_description?.trim() || "";

      if (!blogHandle || !articleHandle) {
        results.push({
          blog_handle: blogHandle || "",
          article_handle: articleHandle || "",
          success: false,
          message: "Missing blog_handle or article_handle",
        });
        continue;
      }

      // 1) Find article by handle
      const articleSearchResponse = await admin.graphql(
        `#graphql
          query GetArticleByHandle($query: String!) {
            articles(first: 20, query: $query) {
              edges {
                node {
                  id
                  handle
                  title
                  blog {
                    id
                    handle
                    title
                  }
                }
              }
            }
          }
        `,
        {
          variables: {
            query: `handle:${articleHandle}`,
          },
        },
      );

      const articleSearchJson = await articleSearchResponse.json();
      const articleEdges = articleSearchJson?.data?.articles?.edges || [];

      const matchedArticle = articleEdges.find(
        (edge) => edge.node.blog?.handle === blogHandle,
      );

      if (!matchedArticle) {
        results.push({
          blog_handle: blogHandle,
          article_handle: articleHandle,
          success: false,
          message: "Article not found in this blog",
        });
        continue;
      }

      const articleId = matchedArticle.node.id;

      // 2) Update article SEO using metafields
      const updateResponse = await admin.graphql(
        `#graphql
          mutation UpdateArticleSeo($id: ID!, $article: ArticleUpdateInput!) {
            articleUpdate(id: $id, article: $article) {
              article {
                id
                handle
                title
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
            id: articleId,
            article: {
              metafields: [
                {
                  namespace: "global",
                  key: "title_tag",
                  type: "single_line_text_field",
                  value: seoTitle,
                },
                {
                  namespace: "global",
                  key: "description_tag",
                  type: "single_line_text_field",
                  value: seoDescription,
                },
              ],
            },
          },
        },
      );

      const updateJson = await updateResponse.json();
      const userErrors = updateJson?.data?.articleUpdate?.userErrors || [];

      if (userErrors.length > 0) {
        results.push({
          blog_handle: blogHandle,
          article_handle: articleHandle,
          success: false,
          message: userErrors.map((err) => err.message).join(", "),
        });
        continue;
      }

      results.push({
        blog_handle: blogHandle,
        article_handle: articleHandle,
        success: true,
        message: "SEO updated successfully",
      });
    } catch (error) {
      results.push({
        blog_handle: row.blog_handle || "",
        article_handle: row.article_handle || "",
        success: false,
        message: error.message || "Something went wrong",
      });
    }
  }

  const successCount = results.filter((item) => item.success).length;
  const failedResults = results.filter((item) => !item.success);

  return {
    success: failedResults.length === 0,
    message: `Article SEO update completed. Success: ${successCount}, Failed: ${failedResults.length}`,
    failedResults,
    totalRows: rows.length,
  };
};

export default function ArticlesSeoPage() {
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

  const parseCsv = (csvText) => {
    const lines = csvText.split(/\r?\n/).filter((line) => line.trim() !== "");

    if (lines.length < 2) return [];

    const headers = parseCsvLine(lines[0]).map((item) =>
      item.trim().replace(/^\uFEFF/, ""),
    );

    return lines.slice(1).map((line) => {
      const values = parseCsvLine(line);

      return {
        blog_handle: values[headers.indexOf("blog_handle")] || "",
        article_handle: values[headers.indexOf("article_handle")] || "",
        seo_title: values[headers.indexOf("seo_title")] || "",
        seo_description: values[headers.indexOf("seo_description")] || "",
      };
    });
  };

  const handleUpdateSeo = () => {
    const formData = new FormData();
    formData.append("rows", JSON.stringify(csvRows));
    fetcher.submit(formData, { method: "POST" });
  };

  const failedResults = fetcher.data?.failedResults || [];

  return (
    <s-page heading="Article SEO Updater">
      <Breadcrumb currentPage="Articles" />
      <s-section heading="Upload Article SEO CSV">
        <s-paragraph>
          Upload a CSV file with blog handle, article handle, SEO title, and SEO
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
            Update Article SEO
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
            {`blog_handle,article_handle,seo_title,seo_description
news,new-blog,the new blog title,the new blog meta desc`}
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
