/** @type {import('next').NextConfig} */
const { execSync } = require('child_process')
const packageJson = require('./package.json')

// Get commit hash at build time
// Prefer Vercel's environment variable, fallback to git command for local dev
const getCommitHash = () => {
  // Check for Vercel's Git commit SHA (first 7 chars to match git short hash)
  if (process.env.VERCEL_GIT_COMMIT_SHA) {
    return process.env.VERCEL_GIT_COMMIT_SHA.substring(0, 7)
  }

  // Fallback to git command for local development
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
