import { readdir } from "fs/promises";
import path from "path";
import { BASE_PATH } from "@/lib/site";

export type LocalPhoto = {
  src: string;
  caption: string;
  date: string;
  folder: string;
};

const IMG_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);

function isImage(name: string) {
  return IMG_EXT.has(path.extname(name).toLowerCase());
}

function dateFromName(name: string): string {
  const m = name.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : "";
}

function humanizeName(name: string) {
  return name
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/^\d{4}-\d{2}-\d{2}-?/, "")
    .replace(/[-_]+/g, " ")
    .trim();
}

async function walk(dir: string, base = dir): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...(await walk(full, base)));
    } else if (e.isFile() && isImage(e.name)) {
      out.push(path.relative(base, full).split(path.sep).join("/"));
    }
  }
  return out;
}

// drop a file into public/gallery/ (any subfolder) and it shows up after the next deploy / revalidate.
// no more hand-editing devlog-gallery.ts
export async function getLocalPhotos(): Promise<{
  devlog: LocalPhoto[];
  hardware: LocalPhoto[];
  other: LocalPhoto[];
}> {
  const root = path.join(process.cwd(), "public", "gallery");
  const files = await walk(root);

  const photos: LocalPhoto[] = files.map((rel) => {
    const folder = rel.includes("/") ? rel.split("/")[0] : "misc";
    const name = path.posix.basename(rel);
    return {
      src: `${BASE_PATH}/gallery/${rel}`,
      caption: humanizeName(name) || name,
      date: dateFromName(name),
      folder,
    };
  });

  // newest dated first, then name
  photos.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.src.localeCompare(a.src);
  });

  const hardwareFolders = new Set(["hardware", "boards", "schematics"]);
  const devlog: LocalPhoto[] = [];
  const hardware: LocalPhoto[] = [];
  const other: LocalPhoto[] = [];

  for (const p of photos) {
    // skip brand / models / downloads assets that aren't gallery shots
    if (p.folder === "brand" || p.folder === "models") continue;
    if (hardwareFolders.has(p.folder) || p.folder === "misc") {
      // named hardware-ish files live in the hardware section
      if (
        /thumbstick|pinout|schematic|board|nicenano|controller|hmd|pcb/i.test(p.caption) ||
        hardwareFolders.has(p.folder)
      ) {
        hardware.push(p);
        continue;
      }
    }
    if (p.folder === "devlog" || p.date) {
      devlog.push(p);
      continue;
    }
    other.push(p);
  }

  return { devlog, hardware, other };
}
