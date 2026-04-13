/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config, { isServer }) {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // Prevent WASM modules from being bundled on the server
    if (isServer) {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        "@cartridge/connector",
        "@cartridge/controller",
        "@cartridge/controller-wasm",
      ];
    }

    return config;
  },
};

export default nextConfig;
