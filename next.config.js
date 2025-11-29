/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone", // Enable standalone mode for Docker optimization
};

module.exports = nextConfig;
