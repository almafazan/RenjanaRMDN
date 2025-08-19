const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Enhanced resolver configuration for @iabtcf/core
config.resolver.alias = {
  ...config.resolver.alias,
  "@iabtcf/core": path.resolve(
    __dirname,
    "node_modules/@iabtcf/core/lib/cjs/index.js",
  ),
};

// Add additional resolver configurations
config.resolver.resolverMainFields = ["react-native", "browser", "main"];
config.resolver.platforms = ["ios", "android", "native", "web"];

// Add node modules extensions
config.resolver.sourceExts = [...config.resolver.sourceExts, "cjs"];

// Ensure proper module resolution
config.resolver.unstable_enableSymlinks = false;
config.resolver.unstable_enablePackageExports = false;

// Add resolver to handle native-only modules for web
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Exclude react-native-google-mobile-ads from web builds
  if (
    platform === "web" &&
    moduleName.includes("react-native-google-mobile-ads")
  ) {
    return {
      type: "empty",
    };
  }

  // Exclude @iabtcf/core from all platforms to prevent resolution errors
  if (moduleName === "@iabtcf/core") {
    return {
      type: "empty",
    };
  }

  // Exclude native-only React Native modules from web builds
  if (
    platform === "web" &&
    moduleName.includes(
      "react-native/Libraries/Utilities/codegenNativeCommands",
    )
  ) {
    return {
      type: "empty",
    };
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
