export type RunSummary = {
  platform: 'instagram' | 'twitter';
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  postsVisited?: number; // IG specific
  tweetsProcessed?: number; // X specific
  likes: number;
  comments?: number; // IG specific
  replies?: number; // X specific
  skippedSponsored?: number; // IG specific
  errors: number;
};

let igRunSummary: RunSummary | null = null;
let xRunSummary: RunSummary | null = null;

export const setRunSummary = (summary: RunSummary) => {
  if (summary.platform === 'instagram') {
    igRunSummary = summary;
  } else {
    xRunSummary = summary;
  }
};

export const getRunSummary = (platform: 'instagram' | 'twitter') => {
  return platform === 'instagram' ? igRunSummary : xRunSummary;
};
