# Reading Atlas agent guide

## Repository boundary

Reading Atlas is one public, static catalogue application. Its source, canonical books and authors, relationship metadata, validation, generated indexes, and GitHub Pages deployment belong in this repository.

The deployed application is read-only. Do not add GitHub authentication, PAT storage, anonymous writes, a database, analytics, or runtime AI features. Content changes happen through reviewed repository commits and are published by GitHub Actions.

## Canonical and derived paths

- `data/books.json`, `data/authors.json`, and `data/topics.json` are canonical public data.
- `schemas/catalog.schema.json` documents the portable data contract.
- `scripts/catalog-core.mjs` validates references and creates deterministic derived relationships.
- `src/generated/catalog.json` is generated and ignored. Never hand-edit it.
- `src/lib/app.ts` owns client-side search, filters, details, and graph interaction.
- `public/manifest.webmanifest`, `public/service-worker.js`, and `public/icons/` make the site installable and offline-readable.
- `dist/` and `.astro/` are derived.

## Product invariants

- A visitor can search across books, authors, topics, descriptions, notes, and tags without signing in.
- Every displayed relationship is explainable through explicit metadata or shared topics.
- Book and author detail views expose the trail outward: related records, personal notes, and maintained source links.
- The relationship map must have an accessible list/card equivalent; the graph is never the only navigation path.
- Mobile layouts are first-class. Controls require usable tap targets and details behave as a bottom sheet on narrow screens.
- Canonical data remains readable JSON and does not depend on a proprietary service.
- Do not generate or copy book-cover artwork. The UI uses code-defined typographic covers.

## Content rules

- IDs are stable lowercase slugs. Rename an ID only when all references are updated in one change.
- Descriptions are short, original summaries. Do not paste publisher copy or long quotations.
- `notes` are the owner's public reading notes. An automated agent may format them but must not invent opinions or claim the owner read something.
- External facts and links should point to first-party author, publisher, project, or book pages when available.
- Adding a relationship requires a short `reason`; shared-topic relationships are derived automatically.
- Never add private notes, credentials, email addresses, reading history, or unpublished personal information.

## Checks

Run from the repository root:

```sh
pnpm run validate:data
pnpm run test
pnpm run typecheck
pnpm run build
pnpm run test:e2e
```
