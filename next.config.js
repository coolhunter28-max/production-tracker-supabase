/** @type {import('next').NextConfig} */

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },

  images: {
    domains: [
      "anthdkwzdpgtwaspekdn.supabase.co",
      "pub-55873e91b05b4961becab3dfcd87237b.r2.dev",
    ],
  },
};

module.exports = nextConfig;