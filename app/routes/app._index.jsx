import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

const seoResources = [
  {
    title: "Pages",
    description: "Bulk update SEO title and description for pages.",
    url: "/app/pages",
  },
  {
    title: "Blogs",
    description: "Bulk update SEO title and description for blogs.",
    url: "/app/blogs",
  },
  {
    title: "Articles",
    description: "Bulk update SEO title and description for articles.",
    url: "/app/articles",
  },
  {
    title: "Products",
    description: "Bulk update SEO title and description for products.",
    url: "/app/products",
  },
  {
    title: "Collections",
    description: "Bulk update SEO title and description for collections.",
    url: "/app/collections",
  },
];

export default function Index() {
  return (
    <s-page heading="Bulk SEO Updater">
      <s-section heading="Choose SEO resource">
        <s-paragraph>
          Select the resource type for which you want to bulk update SEO title
          and meta description.
        </s-paragraph>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "16px",
            marginTop: "20px",
          }}
        >
          {seoResources.map((resource) => (
            <div
              key={resource.title}
              style={{
                border: "1px solid #e1e3e5",
                borderRadius: "12px",
                padding: "20px",
                background: "#fff",
              }}
            >
              <div style={{ marginBottom: "12px" }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "18px",
                    fontWeight: 600,
                  }}
                >
                  {resource.title}
                </h3>
              </div>

              <p
                style={{
                  margin: "0 0 16px 0",
                  color: "#4a4a4a",
                  lineHeight: "1.5",
                }}
              >
                {resource.description}
              </p>

              <s-button href={resource.url}>Open {resource.title}</s-button>
            </div>
          ))}
        </div>
      </s-section>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
