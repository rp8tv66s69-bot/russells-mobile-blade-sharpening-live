/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/book",
        destination: "/",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
