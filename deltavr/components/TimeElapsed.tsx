"use client";

import { useEffect, useState } from "react";

export function formatTimeElapsed(from: string | Date): string {
  const diff = Math.max(0, Date.now() - new Date(from).getTime());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (days > 30) {
    const months = Math.floor(days / 30);
    return `${months}mo ${days % 30}d elapsed`;
  }
  if (days > 0) return `${days}d ${hours}h elapsed`;
  if (hours > 0) return `${hours}h ${mins}m elapsed`;
  return `${mins}m elapsed`;
}

export default function TimeElapsed({
  from,
  className = "elapsed",
}: {
  from: string | Date;
  className?: string;
}) {
  const [text, setText] = useState(() => formatTimeElapsed(from));

  useEffect(() => {
    const t = setInterval(() => setText(formatTimeElapsed(from)), 30000);
    return () => clearInterval(t);
  }, [from]);

  return <span className={className}>⏱ {text}</span>;
}
