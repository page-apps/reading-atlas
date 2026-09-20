# Reading Atlas

Books, authors, and ideas—mapped.

Reading Atlas is a public, mobile-friendly bookshelf and relationship explorer for GitHub Pages. It keeps ordinary JSON in the repository, validates and derives the catalogue in GitHub Actions, and publishes a static PWA. Visitors can search the library, follow topics, open author profiles, and move through explainable book and author connections without signing in.

## Recommended repository

- Application name: **Reading Atlas**
- Repository: **`page-apps/reading-atlas`**
- Pages URL: `https://page-apps.github.io/reading-atlas/`
- Visibility: public
- Pages source: GitHub Actions

The name is intentionally broader than “bookshelf”: the useful object is the map between books, authors, ideas, essays, talks, and ongoing work.

## Local development

Requires Node.js 24+ and pnpm 11.20.0.

```sh
pnpm install
pnpm run dev
```

Run the complete quality gate with:

```sh
pnpm run check
```

## Editing the catalogue

- Add or update books in `data/books.json`.
- Add author profiles and official channels in `data/authors.json`.
- Keep the controlled topic vocabulary in `data/topics.json`.
- Run `pnpm run validate:data` before committing.

The build generates `src/generated/catalog.json`. That file contains resolved edges, reverse references, search text, and related-item scores; it is not canonical and is not committed.

## Architecture

This app uses the App Framework public-data model:

```text
public repository commit
  -> validate canonical JSON and references
  -> derive search and relationship data
  -> build static Astro PWA
  -> deploy GitHub Pages
```

There is no PAT and no runtime GitHub API call. See [the product brief](docs/PRODUCT.md) and [the automation boundary](docs/AUTOMATION.md).

## Publishing

The canonical repository is `page-apps/reading-atlas`. To publish a fresh local checkout:

```sh
git init
git add .
git commit -m "Build Reading Atlas"
git branch -M main
git remote add origin git@github.com:page-apps/reading-atlas.git
git push -u origin main
```

Then open **Settings → Pages** and select **GitHub Actions** as the source if GitHub has not selected it automatically.
