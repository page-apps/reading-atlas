import { defineConfig } from "astro/config";

const [owner = "local", repository = "reading-atlas"] = (process.env.GITHUB_REPOSITORY ?? "local/reading-atlas").split("/");
const inActions = process.env.GITHUB_ACTIONS === "true";
const isOwnerSite = repository === `${owner}.github.io`;

export default defineConfig({
  output: "static",
  devToolbar: { enabled: false },
  site: inActions ? `https://${owner}.github.io` : "http://localhost:4321",
  base: inActions && !isOwnerSite ? `/${repository}` : "/",
  build: {
    assets: "assets"
  },
  vite: {
    build: {
      sourcemap: false
    }
  }
});
