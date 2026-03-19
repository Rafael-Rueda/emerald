/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@emerald/ui",
    "@emerald/contracts",
    "@emerald/data-access",
  ],
};

export default nextConfig;
