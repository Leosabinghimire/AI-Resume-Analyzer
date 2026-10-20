import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const backendDir = path.resolve(__dirname, "../backend");
const python =
  process.env.E2E_PYTHON ??
  (process.platform === "win32" ? path.join(backendDir, ".venv", "Scripts", "python.exe") : path.join(backendDir, ".venv", "bin", "python"));

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: `"${python}" scripts/e2e_server.py`,
      cwd: backendDir,
      url: "http://127.0.0.1:8100/health",
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      // A production build avoids on-demand compilation delays and tests what actually ships.
      command: "npx next build && npx next start --port 3100 --hostname 127.0.0.1",
      url: "http://127.0.0.1:3100",
      env: { BACKEND_URL: "http://127.0.0.1:8100", NEXT_DIST_DIR: ".next-e2e" },
      reuseExistingServer: false,
      timeout: 300_000,
    },
  ],
});
