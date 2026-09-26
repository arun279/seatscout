import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): Partial<ExpoConfig> =>
  process.env["SEATSCOUT_UPSTREAM"] === undefined
    ? config
    : { ...config, updates: { ...config.updates, enabled: false } };
