import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 忽略 ESLint 語法警告 (例如變數沒用到)
  eslint: {
    ignoreDuringBuilds: true,
  },
  // 忽略 TypeScript 型別警告
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;