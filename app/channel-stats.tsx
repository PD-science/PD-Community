"use client";

import { useCallback, useEffect, useState } from "react";

type Post = {
  channel: string;
  replies?: unknown[];
};

const channels = [
  { label: "患者互助", tone: "症状记录、用药体验、照护经验" },
  { label: "医生答疑", tone: "诊疗路径、DBS、康复建议" },
  { label: "科研讨论", tone: "靶点、临床试验、文献复盘" },
  { label: "招募与访谈", tone: "问卷、访谈、研究参与机会" },
];

export function ChannelStats() {
  const [counts, setCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(channels.map((channel) => [channel.label, 0])),
  );
  const [isLoading, setIsLoading] = useState(true);

  const refreshCounts = useCallback(async () => {
    try {
      const response = await fetch("/api/posts", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { posts?: Post[] };
      const nextCounts = Object.fromEntries(channels.map((channel) => [channel.label, 0]));
      for (const post of data.posts ?? []) {
        if (post.channel in nextCounts) {
          nextCounts[post.channel] += 1 + (post.replies?.length ?? 0);
        }
      }
      setCounts(nextCounts);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCounts();
    window.addEventListener("pd-science-posts-updated", refreshCounts);
    return () => window.removeEventListener("pd-science-posts-updated", refreshCounts);
  }, [refreshCounts]);

  return (
    <section className="channel-strip" aria-label="社区板块真实互动统计">
      {channels.map((item) => (
        <article key={item.label} className="channel-card">
          <div>
            <span>{item.label}</span>
            <strong aria-label={`${item.label}真实互动数量`}>
              {isLoading ? "..." : counts[item.label]}
            </strong>
          </div>
          <p>{item.tone}</p>
        </article>
      ))}
    </section>
  );
}
