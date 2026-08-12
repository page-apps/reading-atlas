import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { buildCatalog, loadSourceData } from "./catalog-core.mjs";

const destination = resolve("src/generated/catalog.json");
const catalog = buildCatalog(await loadSourceData());
await mkdir(dirname(destination), { recursive: true });
await writeFile(destination, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
console.log(`Generated ${catalog.graph.nodes.length} nodes and ${catalog.graph.edges.length} edges.`);
