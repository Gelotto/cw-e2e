import type { Config } from "@jest/types";

// Sync object
const config: Config.InitialOptions = {
  testTimeout: 60 * 1000,
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
};

export default config;
