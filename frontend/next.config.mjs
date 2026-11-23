/** @type {import('next').NextConfig} */
const isExport = process.env.OUTPUT_EXPORT === "true" || process.env.GITHUB_ACTIONS === "true" || process.env.BUILD_TARGET === "static";

// Resolve GitHub repository name for GitHub Pages subpath deployment (e.g. /NerdLume)
const repoName = process.env.GITHUB_REPOSITORY ? process.env.GITHUB_REPOSITORY.split("/")[1] : "";
const isUserPage = repoName && repoName.toLowerCase().endsWith(".github.io");
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || (process.env.GITHUB_ACTIONS && repoName && !isUserPage ? `/${repoName}` : "");

const nextConfig = {
  reactStrictMode: true,
  output: isExport ? "export" : undefined,
  trailingSlash: true,
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  images: {
    unoptimized: true,
    domains: ["images.unsplash.com", "img.youtube.com", "i.ytimg.com"],
  },
  ...(isExport
    ? {}
    : {
        async rewrites() {
          return [
            {
              source: "/api/proxy/:path*",
              destination: "http://localhost:5050/api/:path*",
            },
          ];
        },
      }),
};

export default nextConfig;
