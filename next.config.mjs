/** @type {import('next').NextConfig} */
var apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api-nexushr.onrender.com";

const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: apiUrl + "/uploads/:path*",
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
