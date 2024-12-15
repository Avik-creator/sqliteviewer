import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
    webpack: (config, ctx) => {
      const { isServer, dev } = ctx;
    config.output.webassemblyModuleFilename =
      isServer && !dev
        ? '../static/wasm/[modulehash].wasm'
        : 'static/wasm/[modulehash].wasm';

        
        config.module.rules.push({
          test: /\.wasm$/,
          type: 'asset/resource', // Ensures the .wasm file is served correctly
        });
        config.resolve.fallback = { fs: false, path: false };

        config.experiments = {
          ...config.experiments,
          asyncWebAssembly: true,
          syncWebAssembly: true,
        };
      
  
      return config;
    },
    
  };
  

export default nextConfig;
