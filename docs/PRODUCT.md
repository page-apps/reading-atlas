# Reading Atlas product brief

Status: MVP implementation

## Product promise

Reading Atlas turns a public bookshelf into a navigable map. It answers four questions quickly:

1. What is this book or author about?
2. What notes and useful links have I kept?
3. What is closely related, and why?
4. Where should I explore next?

## Name

**Reading Atlas** is the recommended product name and `reading-atlas` is the recommended repository slug. “Atlas” captures both the visual relationship map and the broader goal of navigating ideas. “Author Atlas” is too narrow, while “Bookshelf” undersells the connections.

Tagline: **Books, authors, and ideas—mapped.**

## MVP scope

- Public catalogue of books, authors, topics, descriptions, notes, and useful links.
- Fast local search over every meaningful text field.
- Filters for entity type, reading status, and topic.
- Explainable related-book and related-author suggestions.
- Interactive relationship map with an equivalent card/list route.
- Detail panel for book notes, author channels, related records, and bookshop/publisher links.
- Responsive mobile presentation and installable/offline-readable PWA.
- Static build, schema/reference validation, deterministic derived catalogue, and GitHub Pages deployment.

## Deliberate non-goals

- No account, social following, likes, public editing, or multi-user collaboration.
- No recommendation model, embeddings, chatbot, or runtime AI.
- No scraping inside the browser.
- No borrowed cover images; typographic covers keep the app fast and legally simple.
- No claim that generated similarities are objective. The UI explains shared topics and explicit curator links.

## Information model

Canonical data is split by context so a coding agent can work on one bounded file:

```text
data/
├── books.json       books, author references, topics, notes, links
├── authors.json     profiles, channels, topic references, explicit peers
└── topics.json      controlled idea vocabulary
```

The build creates:

- reverse links from author to books and topic to records;
- author-to-book and book-to-topic graph edges;
- explicit curator relationships;
- deterministic similarity scores based on shared topics;
- normalized search text.

Explicit relationships always carry a human-readable reason. Derived relationships list the shared topics that produced the score.

## Primary journeys

### Find something remembered

Open the app, focus search, type a fragment from the title, author, topic, or note, and open the matching detail panel.

### Explore from an author

Open an author, review their books and official channels, then follow a similar author. The relationship text states whether the connection is curated or based on shared topics.

### Explore an idea

Select a topic such as “systems” and switch to Map. Books and authors remain reachable as cards for accessibility and mobile use.

### Maintain the atlas

Edit canonical JSON locally or through a coding-agent pull request. CI rejects broken references, unsafe links, duplicate IDs, and invalid records before Pages can deploy.

## Public-data safety

Everything under `data/` is published into the site. Personal notes must be intentionally public. Private highlights, reading logs, and draft opinions belong in a separate private system and are outside this app.
