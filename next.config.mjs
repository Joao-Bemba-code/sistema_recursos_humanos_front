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
};

export default nextConfig;
