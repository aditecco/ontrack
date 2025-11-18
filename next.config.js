/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  // Note: Security headers are configured in netlify.toml for static export
}

module.exports = nextConfig
