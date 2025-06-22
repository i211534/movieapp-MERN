import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
      },
      {
        protocol: 'https',
        hostname: 'm.media-amazon.com',
      },
      {
        protocol: 'https',
        hostname: 'img.freepik.com',
      },
      // Fixed: Added both possible paths for uploads
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3001',
        pathname: '/uploads/**', // This is likely the correct path
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3001',
        pathname: '/api/uploads/**', // Keep this as backup
      },
      // Add for production environment
      {
        protocol: 'https',
        hostname: 'your-production-domain.com', // Replace with your actual domain
        pathname: '/uploads/**',
      },
    ],
    // Add fallback for failed images
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  /* other config options */
};

export default nextConfig;