import PropTypes from "prop-types";

function Breadcrumb({ currentPage }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <s-link href="/app">Home</s-link>
      <span style={{ margin: "0 8px", color: "#6b7280" }}>/</span>
      <span style={{ color: "#111827", fontWeight: 600 }}>{currentPage}</span>
    </div>
  );
}

Breadcrumb.propTypes = {
  currentPage: PropTypes.string.isRequired,
};

export default Breadcrumb;
