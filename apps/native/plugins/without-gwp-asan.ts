import { type ConfigPlugin, withAndroidManifest } from "expo/config-plugins";

const withoutGwpAsan: ConfigPlugin = (config) =>
  withAndroidManifest(config, (android) => {
    for (const application of android.modResults.manifest.application ?? [])
      application.$["android:gwpAsanMode"] = "never";
    return android;
  });

export default withoutGwpAsan;
