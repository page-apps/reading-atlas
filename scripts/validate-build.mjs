import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const required = ["dist/index.html", "dist/manifest.webmanifest", "dist/service-worker.js", "dist/icons/icon-192.png", "dist/icons/icon-512.png"];
await Promise.all(required.map((path) => access(resolve(path))));

const html = await readFile(resolve("dist/index.html"), "utf8");
if (!html.includes("Reading Atlas")) throw new Error("The built page is missing the Reading Atlas title.");
if (html.includes("github_pat_") || html.includes("REPO_APPS_GITHUB_CLIENT_ID")) throw new Error("The public build contains a credential marker.");
if (!html.includes("reading-atlas-data")) throw new Error("The built page is missing the generated catalogue payload.");
console.log("Validated the static Pages artifact and PWA files.");
