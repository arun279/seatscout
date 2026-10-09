import {
  AndroidConfig,
  type ConfigPlugin,
  withAndroidManifest,
} from "expo/config-plugins";

const withoutGwpAsan: ConfigPlugin = (config) =>
  withAndroidManifest(config, (android) => {
    AndroidConfig.Manifest.getMainApplicationOrThrow(android.modResults).$[
      "android:gwpAsanMode"
    ] = "never";
    return android;
  });

export default withoutGwpAsan;
