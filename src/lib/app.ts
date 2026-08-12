import type { AuthorRecord, BookRecord, Catalog, EntityType, GraphNode, ReadingStatus, TopicRecord } from "./types";

type FilterType = EntityType | "all";
type StatusFilter = ReadingStatus | "all";
type ViewName = "library" | "map";

type WrappedRecord =
  | { key: string; type: "book"; record: BookRecord }
  | { key: string; type: "author"; record: AuthorRecord }
  | { key: string; type: "topic"; record: TopicRecord };

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface AtlasState {
  query: string;
  type: FilterType;
  topic: string | null;
  status: StatusFilter;
  view: ViewName;
  selected: string | null;
}

export function startReadingAtlas(): void {
  const dataElement = requiredElement<HTMLScriptElement>("#reading-atlas-data");
  const catalog = JSON.parse(dataElement.textContent ?? "{}") as Catalog;
  const allRecords: WrappedRecord[] = [
    ...catalog.books.map((record) => ({ key: `book:${record.id}`, type: "book" as const, record })),
    ...catalog.authors.map((record) => ({ key: `author:${record.id}`, type: "author" as const, record })),
    ...catalog.topics.map((record) => ({ key: `topic:${record.id}`, type: "topic" as const, record }))
  ];
  const recordsByKey = new Map(allRecords.map((item) => [item.key, item]));
  const topicById = new Map(catalog.topics.map((topic) => [topic.id, topic]));
  const params = new URLSearchParams(window.location.search);
  const initialView = params.get("view") === "map" ? "map" : "library";
  const initialType = asFilterType(params.get("type") ?? undefined);
  const state: AtlasState = { query: "", type: initialType, topic: null, status: "all", view: initialView, selected: null };

  const searchInput = requiredElement<HTMLInputElement>("[data-search]");
  const recordsContainer = requiredElement<HTMLElement>("[data-records]");
  const emptyState = requiredElement<HTMLElement>("[data-empty]");
  const resultsCount = requiredElement<HTMLElement>("[data-results-count]");
  const resultsTitle = requiredElement<HTMLElement>("[data-results-title]");
  const resultsKicker = requiredElement<HTMLElement>("[data-results-kicker]");
  const activeFilter = requiredElement<HTMLElement>("[data-active-filter]");
  const topicFilters = requiredElement<HTMLElement>("[data-topic-filters]");
  const statusSelect = requiredElement<HTMLSelectElement>("[data-status]");
  const graph = requiredElement<SVGSVGElement>("[data-graph]");
  const mapVisible = requiredElement<HTMLElement>("[data-map-visible]");
  const detailRail = requiredElement<HTMLElement>("[data-detail-rail]");
  const detailEmpty = requiredElement<HTMLElement>("[data-detail-empty]");
  const detailContainer = requiredElement<HTMLElement>("[data-detail]");

  renderTopicFilters();
  bindEvents();
  render();
  restoreSelectionFromHash();
  initialisePwa();

  function renderTopicFilters(): void {
    topicFilters.innerHTML = catalog.topics.map((topic) => {
      const total = new Set([...topic.bookIds.map((id) => `book:${id}`), ...topic.authorIds.map((id) => `author:${id}`)]).size;
      return `<button data-filter-topic="${escapeHtml(topic.id)}" type="button"><span><i style="--topic:${escapeHtml(topic.accent)}"></i>${escapeHtml(topic.name)}</span><b>${total}</b></button>`;
    }).join("");
  }

  function bindEvents(): void {
    searchInput.addEventListener("input", () => {
      state.query = searchInput.value.trim();
      render();
    });

    searchInput.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && searchInput.value) {
        searchInput.value = "";
        state.query = "";
        render();
      }
    });

    window.addEventListener("keydown", (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInput.focus();
        searchInput.select();
      } else if (event.key === "Escape" && state.selected) {
        closeDetail();
      }
    });

    document.querySelectorAll<HTMLElement>("[data-view]").forEach((button) => {
      button.addEventListener("click", () => setView(button.dataset.view === "map" ? "map" : "library"));
    });
    document.querySelectorAll<HTMLElement>("[data-mobile-view]").forEach((button) => {
      button.addEventListener("click", () => setView(button.dataset.mobileView === "map" ? "map" : "library"));
    });
    document.querySelectorAll<HTMLElement>("[data-filter-type]").forEach((button) => {
      button.addEventListener("click", () => setType(asFilterType(button.dataset.filterType)));
    });
    document.querySelectorAll<HTMLElement>("[data-mobile-type]").forEach((button) => {
      button.addEventListener("click", () => setType(asFilterType(button.dataset.mobileType)));
    });
    document.querySelectorAll<HTMLElement>("[data-clear]").forEach((button) => button.addEventListener("click", clearFilters));

    topicFilters.addEventListener("click", (event) => {
      const button = (event.target as Element).closest<HTMLElement>("[data-filter-topic]");
      if (!button) return;
      const topicId = button.dataset.filterTopic ?? null;
      state.topic = state.topic === topicId ? null : topicId;
      render();
    });

    statusSelect.addEventListener("change", () => {
      state.status = asStatusFilter(statusSelect.value);
      if (state.status !== "all") state.type = "book";
      render();
    });

    document.addEventListener("click", (event) => {
      const opener = (event.target as Element).closest<HTMLElement>("[data-open-key]");
      if (opener?.dataset.openKey) openDetail(opener.dataset.openKey);
    });

    graph.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const node = (event.target as Element).closest<HTMLElement>("[data-open-key]");
      if (!node?.dataset.openKey) return;
      event.preventDefault();
      openDetail(node.dataset.openKey);
    });

    requiredElement<HTMLElement>("[data-detail-close]").addEventListener("click", closeDetail);
    requiredElement<HTMLElement>("[data-mobile-search]").addEventListener("click", () => {
      setView("library");
      window.scrollTo({ top: 0, behavior: "smooth" });
      searchInput.focus();
    });
    window.addEventListener("hashchange", restoreSelectionFromHash);
  }

  function setView(view: ViewName): void {
    state.view = view;
    const url = new URL(window.location.href);
    if (view === "map") url.searchParams.set("view", "map");
    else url.searchParams.delete("view");
    history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    renderView();
    if (view === "map") renderGraph(getVisibleRecords());
  }

  function setType(type: FilterType): void {
    state.type = type;
    if (type !== "book") {
      state.status = "all";
      statusSelect.value = "all";
    }
    const url = new URL(window.location.href);
    if (type === "all") url.searchParams.delete("type");
    else url.searchParams.set("type", type);
    history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    render();
  }

  function clearFilters(): void {
    state.query = "";
    state.type = "all";
    state.topic = null;
    state.status = "all";
    searchInput.value = "";
    statusSelect.value = "all";
    const url = new URL(window.location.href);
    url.searchParams.delete("type");
    history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    render();
  }

  function render(): void {
    const visible = getVisibleRecords();
    resultsCount.textContent = String(visible.length);
    recordsContainer.innerHTML = visible.map(renderCard).join("");
    recordsContainer.hidden = visible.length === 0;
    emptyState.hidden = visible.length !== 0;
    renderHeadings(visible.length);
    renderFilterState();
    renderView();
    renderGraph(visible);
  }

  function getVisibleRecords(): WrappedRecord[] {
    const query = normalize(state.query);
    return allRecords
      .map((item) => ({ item, score: searchScore(item, query) }))
      .filter(({ item, score }) => {
        if (state.type !== "all" && item.type !== state.type) return false;
        if (state.status !== "all" && (item.type !== "book" || item.record.status !== state.status)) return false;
        if (state.topic && !recordHasTopic(item, state.topic)) return false;
        if (query && score === 0) return false;
        return true;
      })
      .sort((left, right) => {
        if (query && left.score !== right.score) return right.score - left.score;
        const typeOrder = { book: 0, author: 1, topic: 2 } as const;
        return typeOrder[left.item.type] - typeOrder[right.item.type] || recordLabel(left.item).localeCompare(recordLabel(right.item));
      })
      .map(({ item }) => item);
  }

  function searchScore(item: WrappedRecord, query: string): number {
    if (!query) return 1;
    const terms = query.split(/\s+/).filter(Boolean);
    const label = normalize(recordLabel(item));
    const haystack = item.record.searchText;
    if (!terms.every((term) => haystack.includes(term))) return 0;
    return terms.reduce((score, term) => score + (label.startsWith(term) ? 12 : label.includes(term) ? 8 : 2), 0);
  }

  function renderHeadings(count: number): void {
    const topic = state.topic ? topicById.get(state.topic) : undefined;
    if (state.query) {
      resultsKicker.textContent = "Search results";
      resultsTitle.textContent = count ? `Matches for “${state.query}”` : "Nothing matched";
    } else if (topic) {
      resultsKicker.textContent = "Idea trail";
      resultsTitle.textContent = topic.name;
    } else if (state.status !== "all") {
      resultsKicker.textContent = "Reading shelf";
      resultsTitle.textContent = statusLabel(state.status);
    } else if (state.type !== "all") {
      resultsKicker.textContent = "Browse the atlas";
      resultsTitle.textContent = state.type === "book" ? "Books on the shelf" : state.type === "author" ? "Authors to follow" : "Connected ideas";
    } else {
      resultsKicker.textContent = "Curated shelf";
      resultsTitle.textContent = "Everything in the atlas";
    }
  }

  function renderFilterState(): void {
    document.querySelectorAll<HTMLElement>("[data-filter-type]").forEach((button) => button.classList.toggle("is-active", button.dataset.filterType === state.type));
    document.querySelectorAll<HTMLElement>("[data-mobile-type]").forEach((button) => button.classList.toggle("is-active", button.dataset.mobileType === state.type));
    topicFilters.querySelectorAll<HTMLElement>("[data-filter-topic]").forEach((button) => button.classList.toggle("is-active", button.dataset.filterTopic === state.topic));

    const labels = [];
    if (state.topic) labels.push(topicById.get(state.topic)?.name ?? state.topic);
    if (state.status !== "all") labels.push(statusLabel(state.status));
    if (state.query) labels.push(`“${state.query}”`);
    activeFilter.hidden = labels.length === 0;
    activeFilter.innerHTML = labels.length ? `<span>Showing</span>${labels.map((label) => `<b>${escapeHtml(label)}</b>`).join("")}<button data-clear type="button">Clear all ×</button>` : "";
    activeFilter.querySelector<HTMLElement>("[data-clear]")?.addEventListener("click", clearFilters);
  }

  function renderView(): void {
    document.querySelectorAll<HTMLElement>("[data-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.panel !== state.view;
    });
    document.querySelectorAll<HTMLElement>("[data-view]").forEach((button) => {
      const active = button.dataset.view === state.view;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    document.querySelectorAll<HTMLElement>("[data-mobile-view]").forEach((button) => button.classList.toggle("is-active", button.dataset.mobileView === state.view));
  }

  function renderCard(item: WrappedRecord): string {
    if (item.type === "book") {
      const book = item.record;
      return `<article class="record-card book-card">
        <button data-open-key="${item.key}" type="button" aria-label="Open ${escapeHtml(book.title)}">
          <span class="book-cover" style="--accent:${escapeHtml(book.accent)}"><i></i><small>${escapeHtml(book.authorNames[0] ?? "")}</small><strong>${escapeHtml(book.title)}</strong><b>${book.year}</b></span>
          <span class="record-copy"><span class="record-type"><i class="type-book"></i>Book · ${escapeHtml(statusLabel(book.status))}</span><strong>${escapeHtml(book.title)}</strong><small>${escapeHtml(book.authorNames.join(" & "))}</small><p>${escapeHtml(book.description)}</p>${renderTopicChips(book.topicIds, 2)}</span>
          <span class="card-arrow" aria-hidden="true">↗</span>
        </button>
      </article>`;
    }
    if (item.type === "author") {
      const author = item.record;
      return `<article class="record-card author-card">
        <button data-open-key="${item.key}" type="button" aria-label="Open ${escapeHtml(author.name)}">
          <span class="author-portrait"><i></i><b>${escapeHtml(initials(author.name))}</b><small>${author.bookIds.length} ${author.bookIds.length === 1 ? "book" : "books"}</small></span>
          <span class="record-copy"><span class="record-type"><i class="type-author"></i>Author</span><strong>${escapeHtml(author.name)}</strong><p>${escapeHtml(author.summary)}</p>${renderTopicChips(author.topicIds, 2)}</span>
          <span class="card-arrow" aria-hidden="true">↗</span>
        </button>
      </article>`;
    }
    const topic = item.record;
    return `<article class="record-card topic-card" style="--accent:${escapeHtml(topic.accent)}">
      <button data-open-key="${item.key}" type="button" aria-label="Open ${escapeHtml(topic.name)}">
        <span class="topic-orbit"><i></i><i></i><i></i><b>⌁</b></span>
        <span class="record-copy"><span class="record-type"><i class="type-topic"></i>Idea trail</span><strong>${escapeHtml(topic.name)}</strong><p>${escapeHtml(topic.description)}</p><span class="topic-count">${topic.bookIds.length} books · ${topic.authorIds.length} authors</span></span>
        <span class="card-arrow" aria-hidden="true">↗</span>
      </button>
    </article>`;
  }

  function renderGraph(visibleRecords: WrappedRecord[]): void {
    const visibleKeys = new Set(visibleRecords.map((item) => item.key));
    const positions = layoutGraph(catalog.graph.nodes);
    const edges = catalog.graph.edges.map((edge) => {
      const from = positions.get(edge.from);
      const to = positions.get(edge.to);
      if (!from || !to) return "";
      const muted = !visibleKeys.has(edge.from) || !visibleKeys.has(edge.to);
      const sameColumn = Math.abs(from.x - to.x) < 20;
      const path = sameColumn
        ? `M ${from.x} ${from.y} C ${from.x + 105} ${from.y}, ${to.x + 105} ${to.y}, ${to.x} ${to.y}`
        : `M ${from.x} ${from.y} C ${(from.x + to.x) / 2} ${from.y}, ${(from.x + to.x) / 2} ${to.y}, ${to.x} ${to.y}`;
      return `<path class="graph-edge edge-${edge.kind}${muted ? " is-muted" : ""}" d="${path}"><title>${escapeHtml(edge.reason)}</title></path>`;
    }).join("");
    const nodes = catalog.graph.nodes.map((node) => {
      const position = positions.get(node.key);
      if (!position) return "";
      const muted = !visibleKeys.has(node.key);
      const selected = state.selected === node.key;
      const width = node.type === "topic" ? 144 : 176;
      const x = position.x - width / 2;
      const y = position.y - 22;
      return `<g class="graph-node node-${node.type}${muted ? " is-muted" : ""}${selected ? " is-selected" : ""}" data-open-key="${escapeHtml(node.key)}" tabindex="0" role="button" aria-label="Open ${escapeHtml(node.label)}" transform="translate(${x} ${y})">
        <rect width="${width}" height="44" rx="12"></rect><circle cx="18" cy="22" r="6" style="fill:${escapeHtml(node.accent)}"></circle><text x="31" y="18">${escapeHtml(truncate(node.label, 22))}</text><text class="node-kind" x="31" y="31">${node.type}</text>
      </g>`;
    }).join("");
    graph.innerHTML = `<g class="graph-edges">${edges}</g><g class="graph-nodes">${nodes}</g>`;
    mapVisible.textContent = String(visibleKeys.size);
  }

  function openDetail(key: string, updateHash = true): void {
    const item = recordsByKey.get(key);
    if (!item) return;
    state.selected = key;
    detailEmpty.hidden = true;
    detailContainer.hidden = false;
    detailContainer.innerHTML = renderDetail(item);
    detailRail.classList.add("is-open");
    document.body.classList.add("detail-open");
    if (updateHash) history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${item.type}/${item.record.id}`);
    renderGraph(getVisibleRecords());
  }

  function closeDetail(): void {
    state.selected = null;
    detailEmpty.hidden = false;
    detailContainer.hidden = true;
    detailContainer.innerHTML = "";
    detailRail.classList.remove("is-open");
    document.body.classList.remove("detail-open");
    history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    renderGraph(getVisibleRecords());
  }

  function restoreSelectionFromHash(): void {
    const match = window.location.hash.match(/^#(book|author|topic)\/([a-z0-9-]+)$/);
    if (!match) return;
    openDetail(`${match[1]}:${match[2]}`, false);
  }

  function renderDetail(item: WrappedRecord): string {
    if (item.type === "book") return renderBookDetail(item.record);
    if (item.type === "author") return renderAuthorDetail(item.record);
    return renderTopicDetail(item.record);
  }

  function renderBookDetail(book: BookRecord): string {
    return `<div class="detail-hero detail-book">
      <span class="detail-cover" style="--accent:${escapeHtml(book.accent)}"><i></i><small>${escapeHtml(book.authorNames[0] ?? "")}</small><strong>${escapeHtml(book.title)}</strong><b>${book.year}</b></span>
      <div><p class="eyebrow">Book · ${escapeHtml(statusLabel(book.status))}</p><h2>${escapeHtml(book.title)}</h2>${book.subtitle ? `<p class="detail-subtitle">${escapeHtml(book.subtitle)}</p>` : ""}<div class="byline">by ${book.authorIds.map((id, index) => `<button data-open-key="author:${escapeHtml(id)}" type="button">${escapeHtml(book.authorNames[index] ?? id)}</button>`).join(" & ")}</div></div>
    </div>
    <p class="detail-summary">${escapeHtml(book.description)}</p>
    ${renderTopicChips(book.topicIds, 6, true)}
    ${renderNotes(book.notes)}
    ${renderLinks(book.links)}
    ${renderRelated("Keep exploring", book.related.map((related) => ({ key: `book:${related.id}`, reasons: related.reasons })))}
    <div class="detail-provenance"><span>◎</span><p>Related scores use curator links and shared topics. They are deterministic, not AI recommendations.</p></div>`;
  }

  function renderAuthorDetail(author: AuthorRecord): string {
    const authored = author.bookIds.map((id) => ({ key: `book:${id}`, reasons: ["Written by this author."] }));
    return `<div class="detail-hero detail-author">
      <span class="detail-monogram"><i></i><b>${escapeHtml(initials(author.name))}</b></span>
      <div><p class="eyebrow">Author profile</p><h2>${escapeHtml(author.name)}</h2><p class="detail-subtitle">${author.bookIds.length} ${author.bookIds.length === 1 ? "book" : "books"} in this atlas</p></div>
    </div>
    <p class="detail-summary">${escapeHtml(author.summary)}</p>
    ${renderTopicChips(author.topicIds, 6, true)}
    ${renderNotes(author.notes)}
    ${renderLinks(author.links)}
    ${renderRelated("Books in the atlas", authored)}
    ${renderRelated("Similar authors", author.related.map((related) => ({ key: `author:${related.id}`, reasons: related.reasons })))}`;
  }

  function renderTopicDetail(topic: TopicRecord): string {
    const related = [
      ...topic.bookIds.map((id) => ({ key: `book:${id}`, reasons: [`Explores ${topic.name}.`] })),
      ...topic.authorIds.map((id) => ({ key: `author:${id}`, reasons: [`Works with ${topic.name}.`] }))
    ];
    return `<div class="detail-hero detail-topic" style="--accent:${escapeHtml(topic.accent)}">
      <span class="detail-topic-orbit"><i></i><i></i><b>⌁</b></span>
      <div><p class="eyebrow">Idea trail</p><h2>${escapeHtml(topic.name)}</h2><p class="detail-subtitle">${topic.bookIds.length} books · ${topic.authorIds.length} authors</p></div>
    </div>
    <p class="detail-summary">${escapeHtml(topic.description)}</p>
    ${renderRelated("Along this trail", related)}`;
  }

  function renderNotes(notes: string[]): string {
    return `<section class="detail-section"><div class="detail-heading"><div><p class="eyebrow">Margin notes</p><h3>Why it stays</h3></div><span aria-hidden="true">✎</span></div>${notes.length ? `<div class="notes-list">${notes.map((note) => `<blockquote>${escapeHtml(note)}</blockquote>`).join("")}</div>` : `<p class="quiet-empty">No public notes yet.</p>`}</section>`;
  }

  function renderLinks(links: BookRecord["links"]): string {
    if (!links.length) return "";
    return `<section class="detail-section"><div class="detail-heading"><div><p class="eyebrow">Continue outside</p><h3>Useful links</h3></div><span aria-hidden="true">↗</span></div><div class="external-links">${links.map((link) => `<a href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer"><span><small>${escapeHtml(link.kind)}</small><strong>${escapeHtml(link.label)}</strong></span><b>↗</b></a>`).join("")}</div></section>`;
  }

  function renderRelated(title: string, relationships: Array<{ key: string; reasons: string[] }>): string {
    if (!relationships.length) return "";
    return `<section class="detail-section"><div class="detail-heading"><div><p class="eyebrow">Follow the connection</p><h3>${escapeHtml(title)}</h3></div><span aria-hidden="true">⌁</span></div><div class="related-list">${relationships.map(({ key, reasons }) => {
      const related = recordsByKey.get(key);
      if (!related) return "";
      return `<button data-open-key="${escapeHtml(key)}" type="button"><i class="related-dot related-${related.type}"></i><span><strong>${escapeHtml(recordLabel(related))}</strong><small>${escapeHtml(reasons[0] ?? "Connected in the atlas.")}</small></span><b>→</b></button>`;
    }).join("")}</div></section>`;
  }

  function renderTopicChips(topicIds: string[], limit: number, interactive = false): string {
    const chips = topicIds.slice(0, limit).map((id) => {
      const topic = topicById.get(id);
      if (!topic) return "";
      if (interactive) return `<button class="topic-chip" data-open-key="topic:${escapeHtml(id)}" type="button"><i style="--topic:${escapeHtml(topic.accent)}"></i>${escapeHtml(topic.name)}</button>`;
      return `<span class="topic-chip"><i style="--topic:${escapeHtml(topic.accent)}"></i>${escapeHtml(topic.name)}</span>`;
    }).join("");
    return `<span class="topic-chips">${chips}</span>`;
  }

  function initialisePwa(): void {
    const installButton = document.querySelector<HTMLButtonElement>("[data-install]");
    let installPrompt: InstallPromptEvent | null = null;
    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      installPrompt = event as InstallPromptEvent;
      if (installButton) installButton.hidden = false;
    });
    installButton?.addEventListener("click", async () => {
      if (!installPrompt) return;
      await installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
      installButton.hidden = true;
    });
    window.addEventListener("appinstalled", () => {
      installPrompt = null;
      if (installButton) installButton.hidden = true;
    });

    const offlineBanner = requiredElement<HTMLElement>("[data-offline]");
    const updateOnlineState = (): void => { offlineBanner.hidden = navigator.onLine; };
    window.addEventListener("online", updateOnlineState);
    window.addEventListener("offline", updateOnlineState);
    updateOnlineState();

    if ("serviceWorker" in navigator) {
      const baseUrl = document.body.dataset.baseUrl ?? "/";
      window.addEventListener("load", () => navigator.serviceWorker.register(`${baseUrl}service-worker.js`).catch(() => undefined));
    }
  }
}

function layoutGraph(nodes: GraphNode[]): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const groups: Array<{ type: EntityType; x: number }> = [{ type: "author", x: 130 }, { type: "book", x: 480 }, { type: "topic", x: 825 }];
  for (const group of groups) {
    const members = nodes.filter((node) => node.type === group.type);
    members.forEach((node, index) => {
      const gap = 520 / Math.max(members.length - 1, 1);
      const y = members.length === 1 ? 320 : 60 + index * gap;
      positions.set(node.key, { x: group.x, y });
    });
  }
  return positions;
}

function recordHasTopic(item: WrappedRecord, topicId: string): boolean {
  if (item.type === "topic") return item.record.id === topicId;
  return item.record.topicIds.includes(topicId);
}

function recordLabel(item: WrappedRecord): string {
  return item.type === "book" ? item.record.title : item.type === "author" ? item.record.name : item.record.name;
}

function statusLabel(status: ReadingStatus): string {
  return status === "read" ? "Read" : status === "reading" ? "Reading now" : "Want to read";
}

function asFilterType(value: string | undefined): FilterType {
  return value === "book" || value === "author" || value === "topic" ? value : "all";
}

function asStatusFilter(value: string): StatusFilter {
  return value === "read" || value === "reading" || value === "queued" ? value : "all";
}

function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase();
}

function normalize(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function truncate(value: string, maximum: number): string {
  return value.length <= maximum ? value : `${value.slice(0, maximum - 1)}…`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Reading Atlas is missing required element ${selector}.`);
  return element;
}
