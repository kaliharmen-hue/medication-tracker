import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  site: process.env.SITE_URL || "http://127.0.0.1:4321",
  base: process.env.BASE_PATH || "/"
});
