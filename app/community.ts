export const communityCategories = ["动物", "卡通", "人物", "植物", "食物", "风景", "文字", "其他"] as const;

export type CommunityCategory = (typeof communityCategories)[number];
export type CommunityReaction = "like" | "favorite";

export type CommunityPost = {
  id: string;
  projectId?: string;
  title: string;
  description: string;
  category: CommunityCategory;
  authorNickname: string;
  publishedAt: number;
  size: number;
  beadCount: number;
  colorCount: number;
  preview: string[];
  palette: string[];
  likeCount: number;
  favoriteCount: number;
  likedByViewer: boolean;
  favoritedByViewer: boolean;
  ownedByViewer: boolean;
  officialSample?: boolean;
};

export type PublishCommunityPostInput = Pick<CommunityPost,
  "projectId" | "title" | "description" | "category" | "size" | "beadCount" | "colorCount" | "preview" | "palette"
>;

const communityApiBase = (process.env.NEXT_PUBLIC_COMMUNITY_API_BASE ?? "").trim().replace(/\/$/, "");

export const communityBackendEnabled = Boolean(communityApiBase);
export const communityLocalStorageKey = "yilihua-community-v1";

function previewFromRows(rows: string[], colors: Record<string, string>) {
  return rows.flatMap((row) => [...row].map((cell) => colors[cell] ?? "transparent"));
}

const bearPreview = previewFromRows([
  "..........",
  ".aa....aa.",
  "abbbbbbbba",
  "bbbbbbbbbb",
  "bbcbbbbcbb",
  "bbbbbbbbbb",
  "bbbdeedbbb",
  ".bbbbbbbb.",
  "..bbbbbb..",
  "..........",
], { a: "#c78195", b: "#f5d9df", c: "#4f3d45", d: "#d68aa2", e: "#fff7f5" });

const strawberryPreview = previewFromRows([
  "....aa....",
  "...abba...",
  "..abbbba..",
  ".cccccccc.",
  "cccccccccc",
  "ccdccdccdc",
  ".cccccccc.",
  "..cccccc..",
  "...cccc...",
  "....cc....",
], { a: "#6d9f76", b: "#9fc58f", c: "#ef6f8f", d: "#ffd16f" });

const sunsetPreview = previewFromRows([
  "aaaaaaaaaa",
  "aaaaabbbbb",
  "aaaabbbbbb",
  "ccccddcccc",
  "ccddddddcc",
  "eeeeeeeeee",
  "eeffeeffee",
  "fffffffffg",
  "gggggggggg",
  "gggggggggg",
], { a: "#f2b9ce", b: "#d78aaa", c: "#f5c97b", d: "#fff1b5", e: "#93bfd0", f: "#4f819b", g: "#38566f" });

// 内测示例只用于让首次进入的用户理解社区结构，不冒充真实用户或真实互动数据。
export const communitySeedPosts: CommunityPost[] = [
  {
    id: "sample-bear",
    title: "海盐小熊",
    description: "10 × 10 的小尺寸练习，表情和轮廓都适合第一次照图制作。",
    category: "动物",
    authorNickname: "一粒画内测组",
    publishedAt: Date.UTC(2026, 7, 16, 8, 30),
    size: 10,
    beadCount: bearPreview.filter((color) => color !== "transparent").length,
    colorCount: 5,
    preview: bearPreview,
    palette: ["#c78195", "#f5d9df", "#4f3d45", "#d68aa2", "#fff7f5"],
    likeCount: 0,
    favoriteCount: 0,
    likedByViewer: false,
    favoritedByViewer: false,
    ownedByViewer: false,
    officialSample: true,
  },
  {
    id: "sample-strawberry",
    title: "草莓挂件",
    description: "保留叶片和籽点，用少量颜色也能看清主体。",
    category: "食物",
    authorNickname: "一粒画内测组",
    publishedAt: Date.UTC(2026, 7, 15, 11, 10),
    size: 10,
    beadCount: strawberryPreview.filter((color) => color !== "transparent").length,
    colorCount: 4,
    preview: strawberryPreview,
    palette: ["#6d9f76", "#9fc58f", "#ef6f8f", "#ffd16f"],
    likeCount: 0,
    favoriteCount: 0,
    likedByViewer: false,
    favoritedByViewer: false,
    ownedByViewer: false,
    officialSample: true,
  },
  {
    id: "sample-sunset",
    title: "窗外晚霞",
    description: "用横向色带表现天空层次，适合测试颜色偏转和店内限色。",
    category: "风景",
    authorNickname: "一粒画内测组",
    publishedAt: Date.UTC(2026, 7, 14, 6, 45),
    size: 10,
    beadCount: sunsetPreview.filter((color) => color !== "transparent").length,
    colorCount: 7,
    preview: sunsetPreview,
    palette: ["#f2b9ce", "#d78aaa", "#f5c97b", "#fff1b5", "#93bfd0", "#4f819b", "#38566f"],
    likeCount: 0,
    favoriteCount: 0,
    likedByViewer: false,
    favoritedByViewer: false,
    ownedByViewer: false,
    officialSample: true,
  },
];

export function isCommunityPost(value: unknown): value is CommunityPost {
  if (!value || typeof value !== "object") return false;
  const post = value as Partial<CommunityPost>;
  return typeof post.id === "string"
    && typeof post.title === "string"
    && typeof post.description === "string"
    && communityCategories.includes(post.category as CommunityCategory)
    && typeof post.authorNickname === "string"
    && typeof post.publishedAt === "number"
    && typeof post.size === "number"
    && typeof post.beadCount === "number"
    && typeof post.colorCount === "number"
    && Array.isArray(post.preview)
    && post.preview.length <= 13_456
    && post.preview.every((color) => color === "transparent" || (typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color)))
    && Array.isArray(post.palette)
    && post.palette.length <= 264
    && post.palette.every((color) => typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color))
    && typeof post.likeCount === "number"
    && typeof post.favoriteCount === "number"
    && typeof post.likedByViewer === "boolean"
    && typeof post.favoritedByViewer === "boolean"
    && typeof post.ownedByViewer === "boolean";
}

export function createLocalCommunityPost(input: PublishCommunityPostInput): CommunityPost {
  return {
    ...input,
    id: `community-${Date.now()}`,
    authorNickname: "我",
    publishedAt: Date.now(),
    likeCount: 0,
    favoriteCount: 0,
    likedByViewer: false,
    favoritedByViewer: false,
    ownedByViewer: true,
  };
}

async function communityRequest<T>(path: string, init?: RequestInit): Promise<T> {
  if (!communityApiBase) throw new Error("community-backend-not-configured");
  const response = await fetch(`${communityApiBase}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) throw new Error(`community-request-${response.status}`);
  return response.json() as Promise<T>;
}

export async function fetchCommunityPosts() {
  const payload = await communityRequest<{ posts: unknown[] }>("/v1/community/posts");
  return Array.isArray(payload.posts) ? payload.posts.filter(isCommunityPost) : [];
}

export async function publishCommunityPost(input: PublishCommunityPostInput) {
  const post = await communityRequest<unknown>("/v1/community/posts", { method: "POST", body: JSON.stringify(input) });
  if (!isCommunityPost(post)) throw new Error("community-invalid-post");
  return post;
}

export async function updateCommunityReaction(postId: string, reaction: CommunityReaction, active: boolean) {
  return communityRequest<{ ok: true }>(`/v1/community/posts/${encodeURIComponent(postId)}/reactions/${reaction}`, {
    method: "PUT",
    body: JSON.stringify({ active }),
  });
}

export async function deleteCommunityPost(postId: string) {
  return communityRequest<{ ok: true }>(`/v1/community/posts/${encodeURIComponent(postId)}`, { method: "DELETE" });
}
