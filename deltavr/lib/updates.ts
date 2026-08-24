import fs from "fs";
import path from "path";
import matter from "gray-matter";

const DIR = path.join(process.cwd(), "content", "updates");

export type UpdateMeta = {
  slug: string;
  title: string;
  date: string;
  source?: string;
};

export function getAllUpdates(): UpdateMeta[] {
  if (!fs.existsSync(DIR)) return [];
  return fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => {
      const raw = fs.readFileSync(path.join(DIR, f), "utf8");
      const { data } = matter(raw);
      return {
        slug: f.replace(/\.mdx$/, ""),
        title: (data.title as string) ?? f,
        date: (data.date as string) ?? "",
        source: data.source as string | undefined,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getUpdateBody(slug: string): { meta: UpdateMeta; body: string } | null {
  const safe = slug.replace(/[^a-zA-Z0-9-_]/g, "");
  const file = path.join(DIR, `${safe}.mdx`);
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, "utf8");
  const { data, content } = matter(raw);
  return {
    meta: {
      slug: safe,
      title: (data.title as string) ?? safe,
      date: (data.date as string) ?? "",
      source: data.source as string | undefined,
    },
    body: content,
  };
}
