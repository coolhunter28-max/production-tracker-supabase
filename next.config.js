/** @type {import('next').NextConfig} */

const nextConfig = {
  images: {
    domains: [
      // Supabase storage
      'anthdkwzdpgtwaspekdn.supabase.co',

      // Cloudflare R2 (QC images)
      'pub-55873e91b05b4961becab3dfcd87237b.r2.dev',
    ],
  },
};

module.exports = nextConfig;
