/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: "http://localhost:8000/uploads/:path*",
      },
    ];
  },
};

export default nextConfig;
