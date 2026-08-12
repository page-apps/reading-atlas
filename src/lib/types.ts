export type EntityType = "book" | "author" | "topic";
export type ReadingStatus = "read" | "reading" | "queued";

export interface ExternalLink {
  label: string;
  url: string;
  kind: string;
}

export interface RelatedRecord {
  id: string;
  score: number;
  reasons: string[];
}

export interface BookRecord {
  id: string;
  title: string;
  subtitle?: string;
  authorIds: string[];
  authorNames: string[];
  year: number;
  status: ReadingStatus;
  accent: string;
  topicIds: string[];
  tags: string[];
  description: string;
  notes: string[];
  links: ExternalLink[];
  relatedBooks: Array<{ id: string; reason: string }>;
  related: RelatedRecord[];
  searchText: string;
}

export interface AuthorRecord {
  id: string;
  name: string;
  summary: string;
  topicIds: string[];
  tags: string[];
  notes: string[];
  links: ExternalLink[];
  relatedAuthors: Array<{ id: string; reason: string }>;
  bookIds: string[];
  related: RelatedRecord[];
  searchText: string;
}

export interface TopicRecord {
  id: string;
  name: string;
  description: string;
  accent: string;
  bookIds: string[];
  authorIds: string[];
  searchText: string;
}

export interface GraphNode {
  key: string;
  id: string;
  type: EntityType;
  label: string;
  accent: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  kind: "wrote" | "explores" | "related";
  reason: string;
}

export interface Catalog {
  schemaVersion: number;
  counts: {
    books: number;
    authors: number;
    topics: number;
  };
  books: BookRecord[];
  authors: AuthorRecord[];
  topics: TopicRecord[];
  graph: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
}
