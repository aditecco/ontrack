/** @type {import('next').NextConfig} */
const packageJson = require('./package.json')

const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  // Note: Security headers are configured in netlify.toml for static export
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
    NEXT_PUBLIC_COMMIT_HASH: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || 'dev',
  },
}

module.exports = nextConfig
