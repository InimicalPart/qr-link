require('next-ws/server').verifyPatch();
module.exports = {
  reactStrictMode: false,
  distDir: "build",
  experimental: {
    serverActions: {
      allowedOrigins: ["qrlink.newseed.se"],
    },
    instrumentationHook: true,
  },
  poweredByHeader: false,
  logging: {
    fetches: {
      fullUrl: true,
    },
  }
};
