/** @type {import('next').NextConfig} */
const { execSync } = require('child_process')
const packageJson = require('./package.json')

// Get commit hash at build time
const getCommitHash = () => {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch (error) {
    return 'unknown'
  }
}

const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  // Note: Security headers are configured in netlify.toml for static export
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
    NEXT_PUBLIC_COMMIT_HASH: getCommitHash(),
  },
}

module.exports = nextConfig
