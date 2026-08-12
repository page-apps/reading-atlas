export interface PublicRepoAppConfig {
  readonly id: string;
  readonly title: string;
  readonly repository: {
    readonly mode: "self";
    readonly branch: string;
    readonly dataRoot: string;
  };
  readonly access: {
    readonly mode: "public-read";
  };
  readonly build: {
    readonly pipeline: "pages-actions";
    readonly generatedRoot: string;
  };
}

export default {
  id: "reading-atlas",
  title: "Reading Atlas",
  repository: {
    mode: "self",
    branch: "main",
    dataRoot: "data"
  },
  access: {
    mode: "public-read"
  },
  build: {
    pipeline: "pages-actions",
    generatedRoot: "src/generated"
  }
} as const satisfies PublicRepoAppConfig;
