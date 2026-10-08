// lapse.hackclub.com public api — server-side, no key needed for public profiles
const API = "https://api.lapse.hackclub.com/api";

// these handles are fixed. oxy, grand, joao.
export const LAPSE_HANDLES = ["oxy", "merekelene", "monizjoao982"] as const;

export type LapseUser = {
  id: string;
  handle: string;
  displayName: string;
  profilePictureUrl: string;
  bio: string;
};

export type LapseVideo = {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  duration: number;
  playbackUrl: string | null;
  thumbnailUrl: string | null;
  owner: {
    handle: string;
    displayName: string;
    profilePictureUrl: string;
  };
  profileUrl: string;
};

type ApiUser = {
  id: string;
  handle: string;
  displayName: string;
  profilePictureUrl: string;
  bio?: string;
};

type ApiTimelapse = {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  duration: number;
  playbackUrl: string | null;
  thumbnailUrl: string | null;
  visibility?: string;
  owner: ApiUser;
};

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API}${path}`, {
      next: { revalidate: 1800 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function getLapseUser(handle: string): Promise<LapseUser | null> {
  const j = await getJson<{ ok: boolean; data?: { user?: ApiUser | null } }>(
    `/user/query?handle=${encodeURIComponent(handle)}`
  );
  const u = j?.data?.user;
  if (!u) return null;
  return {
    id: u.id,
    handle: u.handle,
    displayName: u.displayName,
    profilePictureUrl: u.profilePictureUrl,
    bio: u.bio ?? "",
  };
}

export async function getTimelapsesByUser(userId: string): Promise<LapseVideo[]> {
  const j = await getJson<{ ok: boolean; data?: { timelapses?: ApiTimelapse[] } }>(
    `/timelapse/findByUser?user=${encodeURIComponent(userId)}`
  );
  const list = j?.data?.timelapses ?? [];
  return list
    .filter((t) => t.playbackUrl || t.thumbnailUrl)
    .map((t) => ({
      id: t.id,
      name: t.name || "(untitled)",
      description: t.description ?? "",
      createdAt: t.createdAt,
      duration: t.duration ?? 0,
      playbackUrl: t.playbackUrl,
      thumbnailUrl: t.thumbnailUrl,
      owner: {
        handle: t.owner?.handle ?? "",
        displayName: t.owner?.displayName ?? "",
        profilePictureUrl: t.owner?.profilePictureUrl ?? "",
      },
      profileUrl: `https://lapse.hackclub.com/user/@${t.owner?.handle ?? ""}`,
    }));
}

export type LapseFeed = {
  user: LapseUser;
  videos: LapseVideo[];
};

export async function getTeamLapseFeed(): Promise<LapseFeed[]> {
  const feeds = await Promise.all(
    LAPSE_HANDLES.map(async (handle) => {
      const user = await getLapseUser(handle);
      if (!user) return null;
      const videos = await getTimelapsesByUser(user.id);
      return { user, videos };
    })
  );
  return feeds.filter((f): f is LapseFeed => f !== null);
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatLapseDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
