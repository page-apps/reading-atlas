import { loadSourceData, validateSourceData } from "./catalog-core.mjs";

const source = await loadSourceData();
const errors = validateSourceData(source);

if (errors.length) {
  console.error(`Reading Atlas data failed validation:\n- ${errors.join("\n- ")}`);
  process.exitCode = 1;
} else {
  console.log(`Validated ${source.books.books.length} books, ${source.authors.authors.length} authors, and ${source.topics.topics.length} topics.`);
}
