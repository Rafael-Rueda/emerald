/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@emerald/ui",
    "@emerald/contracts",
    "@emerald/data-access",
    "@emerald/mocks",
  ],
  // Lint is handled centrally by the root `pnpm lint` command which
  // already includes the @next/eslint-plugin-next rules for app files.
  // Skipping the redundant internal lint avoids false "plugin not detected"
  // warnings caused by flat-config detection limitations in `next build`.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
