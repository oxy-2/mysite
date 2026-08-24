import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getAllUpdates, getUpdateBody } from "@/lib/updates";
import TimeElapsed from "@/components/TimeElapsed";

export function generateStaticParams() {
  return getAllUpdates().map((u) => ({ slug: u.slug }));
}

function fmtDate(d: string) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function UpdatePostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getUpdateBody(slug);
  if (!post) notFound();

  return (
    <section className="section">
      <div className="container container-narrow">
        <Link href="/updates" className="dim" style={{ textDecoration: "none", fontSize: 12 }}>
          ← all updates
        </Link>

        <article className="post-card">
          <div className="meta-row">
            {post.meta.source && <span className="badge">{post.meta.source}</span>}
            <span className="dim">{fmtDate(post.meta.date)}</span>
            {post.meta.date && <TimeElapsed from={post.meta.date} />}
          </div>
          <h1 className="post-heading">{post.meta.title}</h1>
          <div className="post-mdx">
            <MDXRemote source={post.body} />
          </div>
        </article>
      </div>
    </section>
  );
}
