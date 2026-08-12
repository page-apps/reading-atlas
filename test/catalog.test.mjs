import { describe, expect, it } from "vitest";
import { buildCatalog, loadSourceData, validateSourceData } from "../scripts/catalog-core.mjs";

describe("Reading Atlas catalogue", () => {
  it("validates the canonical fixture and builds deterministic graph data", async () => {
    const source = await loadSourceData();
    expect(validateSourceData(source)).toEqual([]);
    const first = buildCatalog(source);
    const second = buildCatalog(source);
    expect(first).toEqual(second);
    expect(first.counts).toEqual({ books: 5, authors: 6, topics: 6 });
    expect(first.graph.nodes).toHaveLength(17);
  });

  it("rejects unknown references", async () => {
    const source = structuredClone(await loadSourceData());
    source.books.books[0].authorIds = ["missing-author"];
    expect(validateSourceData(source)).toContain("books[0].authorIds references unknown author 'missing-author'.");
  });

  it("explains related items with curated and shared-topic reasons", async () => {
    const catalog = buildCatalog(await loadSourceData());
    const thinking = catalog.books.find((book) => book.id === "thinking-in-systems");
    const buildings = thinking.related.find((related) => related.id === "how-buildings-learn");
    expect(buildings.score).toBeGreaterThan(100);
    expect(buildings.reasons.some((reason) => reason.startsWith("Shared topics:"))).toBe(true);
    expect(buildings.reasons.some((reason) => reason.includes("structure and feedback"))).toBe(true);
  });
});
