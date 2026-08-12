# Automation boundary

Reading Atlas uses automation to maintain public data, not to add AI to the product.

## Implemented now

GitHub Actions runs the same `pnpm run check` gate used locally:

1. validate canonical files, URLs, IDs, and cross-file references;
2. generate deterministic reverse links, graph edges, related scores, and search text;
3. run unit tests and Astro diagnostics;
4. build and inspect the static artifact;
5. deploy the successful artifact to GitHub Pages on `main`.

This makes Actions useful even though the data is in the same public repository: every content commit is both a data revision and a proposed site release.

## Good next automations

- A scheduled link checker that opens an issue rather than rewriting URLs automatically.
- ISBN duplicate detection and optional metadata checks against a trusted public source.
- A pull-request summary showing books, authors, topics, and edges added or removed.
- A local script that scaffolds an empty author or book record from a supplied URL, leaving descriptions and personal notes for human review.

## Optional coding-agent workflow

A coding agent or GitHub Copilot can later receive a narrow issue such as “add this author and these two official links.” It should edit canonical JSON, cite first-party sources in the pull request, run the quality gate, and leave the final content decision to review. The deployed PWA remains deterministic and contains no model call, API key, or generated-on-load content.

The existing `AGENTS.md` is already the main repository instruction boundary. GitHub also supports repository-wide `.github/copilot-instructions.md`, path-specific instructions, and repository custom agents; add those only after the manual catalogue workflow is stable:

- [Repository custom instructions](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions)
- [Custom agents for Copilot cloud agent](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/create-custom-agents)
- [Custom workflows for GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

## Guardrails

- Agents must not invent the owner's reading status or personal notes.
- Factual enrichment should prefer author, publisher, project, or other first-party pages.
- Never commit credentials or introduce a PAT: the canonical data is public and read-only in the browser.
- Do not let an automated job push directly to `main`; use a reviewed pull request.
- Generated files are replaceable and never override canonical content.
