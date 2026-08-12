import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const accentPattern = /^#[0-9a-fA-F]{6}$/;
const statuses = new Set(["read", "reading", "queued"]);

export async function loadSourceData(root = process.cwd()) {
  const [books, authors, topics] = await Promise.all([
    readJson(resolve(root, "data/books.json")),
    readJson(resolve(root, "data/authors.json")),
    readJson(resolve(root, "data/topics.json"))
  ]);
  return { books, authors, topics };
}

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    throw new Error(`Could not read ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function validateSourceData(source) {
  const errors = [];
  const bookRoot = source.books;
  const authorRoot = source.authors;
  const topicRoot = source.topics;

  validateRoot(bookRoot, "books", errors);
  validateRoot(authorRoot, "authors", errors);
  validateRoot(topicRoot, "topics", errors);

  const books = Array.isArray(bookRoot?.books) ? bookRoot.books : [];
  const authors = Array.isArray(authorRoot?.authors) ? authorRoot.authors : [];
  const topics = Array.isArray(topicRoot?.topics) ? topicRoot.topics : [];
  const bookIds = validateIds(books, "books", errors);
  const authorIds = validateIds(authors, "authors", errors);
  const topicIds = validateIds(topics, "topics", errors);

  topics.forEach((topic, index) => {
    const path = `topics[${index}]`;
    validateString(topic?.name, `${path}.name`, errors);
    validateString(topic?.description, `${path}.description`, errors);
    if (!accentPattern.test(topic?.accent ?? "")) errors.push(`${path}.accent must be a six-digit hex colour.`);
  });

  authors.forEach((author, index) => {
    const path = `authors[${index}]`;
    validateString(author?.name, `${path}.name`, errors);
    validateString(author?.summary, `${path}.summary`, errors);
    validateStringArray(author?.topicIds, `${path}.topicIds`, errors, { minimum: 1 });
    validateStringArray(author?.tags, `${path}.tags`, errors);
    validateStringArray(author?.notes, `${path}.notes`, errors);
    validateLinks(author?.links, `${path}.links`, errors);
    validateRelationships(author?.relatedAuthors, `${path}.relatedAuthors`, authorIds, errors);
    for (const topicId of author?.topicIds ?? []) {
      if (!topicIds.has(topicId)) errors.push(`${path}.topicIds references unknown topic '${topicId}'.`);
    }
  });

  books.forEach((book, index) => {
    const path = `books[${index}]`;
    validateString(book?.title, `${path}.title`, errors);
    if (book?.subtitle !== undefined) validateString(book.subtitle, `${path}.subtitle`, errors);
    validateStringArray(book?.authorIds, `${path}.authorIds`, errors, { minimum: 1 });
    validateStringArray(book?.topicIds, `${path}.topicIds`, errors, { minimum: 1 });
    validateStringArray(book?.tags, `${path}.tags`, errors);
    validateString(book?.description, `${path}.description`, errors);
    validateStringArray(book?.notes, `${path}.notes`, errors);
    validateLinks(book?.links, `${path}.links`, errors);
    validateRelationships(book?.relatedBooks, `${path}.relatedBooks`, bookIds, errors);
    if (!Number.isInteger(book?.year) || book.year < 1000 || book.year > 2200) errors.push(`${path}.year must be a plausible integer year.`);
    if (!statuses.has(book?.status)) errors.push(`${path}.status must be read, reading, or queued.`);
    if (!accentPattern.test(book?.accent ?? "")) errors.push(`${path}.accent must be a six-digit hex colour.`);
    for (const authorId of book?.authorIds ?? []) {
      if (!authorIds.has(authorId)) errors.push(`${path}.authorIds references unknown author '${authorId}'.`);
    }
    for (const topicId of book?.topicIds ?? []) {
      if (!topicIds.has(topicId)) errors.push(`${path}.topicIds references unknown topic '${topicId}'.`);
    }
  });

  return errors;
}

function validateRoot(root, collection, errors) {
  if (!root || typeof root !== "object" || Array.isArray(root)) {
    errors.push(`${collection}.json must contain an object.`);
    return;
  }
  if (root.schemaVersion !== 1) errors.push(`${collection}.json schemaVersion must be 1.`);
  if (!Array.isArray(root[collection])) errors.push(`${collection}.json must contain a ${collection} array.`);
}

function validateIds(records, collection, errors) {
  const ids = new Set();
  records.forEach((record, index) => {
    const id = record?.id;
    if (typeof id !== "string" || !idPattern.test(id)) {
      errors.push(`${collection}[${index}].id must be a lowercase slug.`);
      return;
    }
    if (ids.has(id)) errors.push(`${collection} contains duplicate id '${id}'.`);
    ids.add(id);
  });
  return ids;
}

function validateString(value, path, errors) {
  if (typeof value !== "string" || !value.trim()) errors.push(`${path} must be a non-empty string.`);
}

function validateStringArray(value, path, errors, options = {}) {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array.`);
    return;
  }
  if (value.length < (options.minimum ?? 0)) errors.push(`${path} must contain at least ${options.minimum} item.`);
  const seen = new Set();
  value.forEach((item, index) => {
    if (typeof item !== "string" || !item.trim()) errors.push(`${path}[${index}] must be a non-empty string.`);
    if (seen.has(item)) errors.push(`${path} contains duplicate value '${item}'.`);
    seen.add(item);
  });
}

function validateLinks(value, path, errors) {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array.`);
    return;
  }
  value.forEach((link, index) => {
    const itemPath = `${path}[${index}]`;
    validateString(link?.label, `${itemPath}.label`, errors);
    validateString(link?.kind, `${itemPath}.kind`, errors);
    try {
      const url = new URL(link?.url);
      if (url.protocol !== "https:") errors.push(`${itemPath}.url must use HTTPS.`);
    } catch {
      errors.push(`${itemPath}.url must be a valid URL.`);
    }
  });
}

function validateRelationships(value, path, knownIds, errors) {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array.`);
    return;
  }
  const seen = new Set();
  value.forEach((relationship, index) => {
    const itemPath = `${path}[${index}]`;
    if (!knownIds.has(relationship?.id)) errors.push(`${itemPath}.id references unknown record '${relationship?.id}'.`);
    if (seen.has(relationship?.id)) errors.push(`${path} contains duplicate relationship '${relationship?.id}'.`);
    seen.add(relationship?.id);
    validateString(relationship?.reason, `${itemPath}.reason`, errors);
  });
}

export function buildCatalog(source) {
  const errors = validateSourceData(source);
  if (errors.length) throw new Error(`Invalid Reading Atlas data:\n- ${errors.join("\n- ")}`);

  const authors = source.authors.authors.map((author) => ({ ...author }));
  const books = source.books.books.map((book) => ({ ...book }));
  const topics = source.topics.topics.map((topic) => ({ ...topic }));
  const authorById = new Map(authors.map((author) => [author.id, author]));
  const bookById = new Map(books.map((book) => [book.id, book]));
  const topicById = new Map(topics.map((topic) => [topic.id, topic]));

  const relatedBooks = deriveRelated(books, "relatedBooks", topicById);
  const relatedAuthors = deriveRelated(authors, "relatedAuthors", topicById);

  const resolvedAuthors = authors.map((author) => {
    const authoredBooks = books.filter((book) => book.authorIds.includes(author.id)).map((book) => book.id);
    return {
      ...author,
      bookIds: authoredBooks,
      related: relatedAuthors.get(author.id) ?? [],
      searchText: normalizeSearch([author.name, author.summary, author.tags, author.notes, author.topicIds.map((id) => topicById.get(id)?.name ?? id)])
    };
  });

  const resolvedBooks = books.map((book) => ({
    ...book,
    authorNames: book.authorIds.map((id) => authorById.get(id)?.name ?? id),
    related: relatedBooks.get(book.id) ?? [],
    searchText: normalizeSearch([book.title, book.subtitle ?? "", book.description, book.tags, book.notes, book.authorIds.map((id) => authorById.get(id)?.name ?? id), book.topicIds.map((id) => topicById.get(id)?.name ?? id)])
  }));

  const resolvedTopics = topics.map((topic) => ({
    ...topic,
    bookIds: books.filter((book) => book.topicIds.includes(topic.id)).map((book) => book.id),
    authorIds: authors.filter((author) => author.topicIds.includes(topic.id)).map((author) => author.id),
    searchText: normalizeSearch([topic.name, topic.description])
  }));

  const edges = [];
  for (const book of books) {
    for (const authorId of book.authorIds) edges.push(edge(`author:${authorId}`, `book:${book.id}`, "wrote", "wrote"));
    for (const topicId of book.topicIds) edges.push(edge(`book:${book.id}`, `topic:${topicId}`, "explores", "explores"));
  }
  for (const author of authors) {
    if (!books.some((book) => book.authorIds.includes(author.id))) {
      for (const topicId of author.topicIds) edges.push(edge(`author:${author.id}`, `topic:${topicId}`, "explores", "works on"));
    }
    for (const relation of author.relatedAuthors) edges.push(edge(`author:${author.id}`, `author:${relation.id}`, "related", relation.reason));
  }
  for (const book of books) {
    for (const relation of book.relatedBooks) edges.push(edge(`book:${book.id}`, `book:${relation.id}`, "related", relation.reason));
  }

  return {
    schemaVersion: 1,
    counts: { books: books.length, authors: authors.length, topics: topics.length },
    books: resolvedBooks,
    authors: resolvedAuthors,
    topics: resolvedTopics,
    graph: {
      nodes: [
        ...resolvedAuthors.map((author) => ({ key: `author:${author.id}`, id: author.id, type: "author", label: author.name, accent: "#293f38" })),
        ...resolvedBooks.map((book) => ({ key: `book:${book.id}`, id: book.id, type: "book", label: book.title, accent: book.accent })),
        ...resolvedTopics.map((topic) => ({ key: `topic:${topic.id}`, id: topic.id, type: "topic", label: topic.name, accent: topic.accent }))
      ],
      edges: dedupeEdges(edges)
    }
  };
}

function deriveRelated(records, relationshipField, topicById) {
  const output = new Map();
  for (const record of records) {
    const relationships = [];
    for (const candidate of records) {
      if (candidate.id === record.id) continue;
      const direct = record[relationshipField].find((item) => item.id === candidate.id);
      const reverse = candidate[relationshipField].find((item) => item.id === record.id);
      const shared = record.topicIds.filter((topicId) => candidate.topicIds.includes(topicId));
      if (!direct && !reverse && shared.length === 0) continue;
      const reasons = [];
      if (direct?.reason) reasons.push(direct.reason);
      else if (reverse?.reason) reasons.push(reverse.reason);
      if (shared.length) reasons.push(`Shared ${shared.length === 1 ? "topic" : "topics"}: ${shared.map((id) => topicById.get(id)?.name ?? id).join(", ")}.`);
      relationships.push({ id: candidate.id, score: (direct || reverse ? 100 : 0) + shared.length * 10, reasons });
    }
    relationships.sort((left, right) => right.score - left.score || left.id.localeCompare(right.id));
    output.set(record.id, relationships.slice(0, 5));
  }
  return output;
}

function normalizeSearch(parts) {
  return parts.flat(Infinity).filter(Boolean).join(" ").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function edge(from, to, kind, reason) {
  return { from, to, kind, reason };
}

function dedupeEdges(edges) {
  const seen = new Set();
  return edges.filter((item) => {
    const pair = [item.from, item.to].sort().join("|");
    const key = `${item.kind}|${pair}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
