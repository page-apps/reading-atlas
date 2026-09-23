import { describe, expect, it } from "vitest";
import { buildCatalog, loadSourceData, validateSourceData } from "../scripts/catalog-core.mjs";

describe("Reading Atlas catalogue", () => {
  it("validates the canonical catalogue and builds deterministic graph data", async () => {
    const source = await loadSourceData();
    expect(validateSourceData(source)).toEqual([]);
    const first = buildCatalog(source);
    const second = buildCatalog(source);
    expect(first).toEqual(second);
    expect(first.counts).toEqual({
      books: source.books.books.length,
      authors: source.authors.authors.length,
      topics: source.topics.topics.length
    });
    expect(first.graph.nodes).toHaveLength(
      source.books.books.length + source.authors.authors.length + source.topics.topics.length
    );
    expect(first.books.some((book) => book.id === "the-let-them-theory")).toBe(true);
    expect(first.books.some((book) => book.id === "the-7-habits-of-highly-effective-people")).toBe(true);
  });

  it("rejects unknown references", async () => {
    const source = structuredClone(await loadSourceData());
    source.books.books[0].authorIds = ["missing-author"];
    expect(validateSourceData(source)).toContain("books[0].authorIds references unknown author 'missing-author'.");
  });

  it("explains curated and shared-topic book relationships", async () => {
    const source = structuredClone(await loadSourceData());
    const anxiousGeneration = source.books.books.find((book) => book.id === "the-anxious-generation");
    anxiousGeneration.relatedBooks = [
      { id: "stolen-focus", reason: "Both examine how modern technology affects attention and wellbeing." }
    ];

    const catalog = buildCatalog(source);
    const anxious = catalog.books.find((book) => book.id === "the-anxious-generation");
    const focus = anxious.related.find((related) => related.id === "stolen-focus");
    expect(focus.score).toBeGreaterThan(100);
    expect(focus.reasons.some((reason) => reason.startsWith("Shared topics:"))).toBe(true);
    expect(focus.reasons.some((reason) => reason.includes("Both examine how modern technology"))).toBe(true);
  });
});
