"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Post = {
  id: number;
  role: string;
  channel: string;
  title: string;
  body: string;
  author: string;
  createdAt: string;
  replies?: Reply[];
};

type Reply = {
  id: number;
  postId: number;
  role: string;
  body: string;
  author: string;
  createdAt: string;
};

const fallbackPosts: Post[] = [
  {
    id: 1,
    role: "患者",
    channel: "患者互助",
    title: "起床后僵硬明显，大家会怎么记录变化？",
    body: "想把症状和用药时间整理给医生看，欢迎分享你们觉得有效的记录方式。",
    author: "晨间记录者",
    createdAt: "刚刚",
    replies: [],
  },
  {
    id: 2,
    role: "医生",
    channel: "医生答疑",
    title: "就诊前建议带上哪些资料？",
    body: "近期症状视频、药物清单、开关期时间、睡眠和便秘等非运动症状记录，都能帮助医生更快判断。",
    author: "神经内科医生",
    createdAt: "置顶",
    replies: [],
  },
  {
    id: 3,
    role: "科研人员",
    channel: "科研讨论",
    title: "想开一个 alpha-syn SAA 定义争议共读帖",
    body: "欢迎从临床终点、疾病分期和试验入组标准三个角度补充论文。",
    author: "文献共读",
    createdAt: "今日",
    replies: [],
  },
];

const channels = ["全部", "患者互助", "医生答疑", "科研讨论", "招募与访谈"];

export function CommunityBoard() {
  const [posts, setPosts] = useState<Post[]>(fallbackPosts);
  const [activeChannel, setActiveChannel] = useState("全部");
  const [status, setStatus] = useState("欢迎发起一个具体问题");
  const [draft, setDraft] = useState({
    role: "患者",
    channel: "患者互助",
    title: "",
    body: "",
  });
  const [activeReplyPostId, setActiveReplyPostId] = useState<number | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<number, { role: string; body: string }>>({});
  const [replyStatus, setReplyStatus] = useState<Record<number, string>>({});
  const composerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch("/api/posts")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data?.posts?.length) {
          setPosts(data.posts);
        }
      })
      .catch(() => {
        setStatus("当前显示示例帖，提交后会继续尝试保存");
      });
  }, []);

  const visiblePosts = useMemo(() => {
    if (activeChannel === "全部") return posts;
    return posts.filter((post) => post.channel === activeChannel);
  }, [activeChannel, posts]);

  async function submitPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = draft.title.trim();
    const body = draft.body.trim();
    const role = draft.role;
    const channel = draft.channel;

    if (!title || !body) {
      setStatus("标题和内容都需要填写");
      return;
    }

    setStatus("正在发布...");
    const optimisticPost: Post = {
      id: Date.now(),
      title,
      body,
      role,
      channel,
      author: role,
      createdAt: "刚刚",
      replies: [],
    };
    setPosts((current) => [optimisticPost, ...current]);
    setDraft({ role: "患者", channel: "患者互助", title: "", body: "" });

    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        body: JSON.stringify({ title, body, role, channel }),
        headers: { "content-type": "application/json" },
      });
      if (!response.ok) throw new Error("Post failed");
      const data = await response.json();
      setPosts((current) => [data.post, ...current.filter((post) => post.id !== optimisticPost.id)]);
      window.dispatchEvent(new Event("pd-science-posts-updated"));
      setStatus("已发布到社区");
    } catch {
      setStatus("已先显示在本页，网络恢复后可再次发布");
    }
  }

  function focusComposer(nextDraft: Partial<typeof draft>, nextStatus: string) {
    setDraft((current) => ({ ...current, ...nextDraft }));
    setStatus(nextStatus);
    composerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => bodyRef.current?.focus(), 260);
  }

  function replyToPost(post: Post) {
    setActiveReplyPostId((current) => (current === post.id ? null : post.id));
    setReplyDrafts((current) => ({
      ...current,
      [post.id]: current[post.id] ?? { role: draft.role, body: "" },
    }));
    setReplyStatus((current) => ({
      ...current,
      [post.id]: `正在回复「${post.title}」`,
    }));
  }

  function inviteDoctor(post: Post) {
    focusComposer(
      {
        channel: "医生答疑",
        title: `请医生看看：${post.title}`.slice(0, 80),
        body: `想邀请医生围绕这个问题给一些判断思路：${post.body}`,
      },
      "已切到医生答疑板块",
    );
  }

  function saveLiteratureLead(post: Post) {
    const saved = JSON.parse(window.localStorage.getItem("pd-science-saved-leads") ?? "[]") as string[];
    const nextSaved = Array.from(new Set([post.title, ...saved])).slice(0, 20);
    window.localStorage.setItem("pd-science-saved-leads", JSON.stringify(nextSaved));
    setStatus(`已收藏「${post.title}」`);
  }

  async function submitReply(post: Post) {
    const replyDraft = replyDrafts[post.id] ?? { role: draft.role, body: "" };
    const body = replyDraft.body.trim();
    const role = replyDraft.role;

    if (!body) {
      setReplyStatus((current) => ({ ...current, [post.id]: "回复内容不能为空" }));
      return;
    }

    const optimisticReply: Reply = {
      id: Date.now(),
      postId: post.id,
      role,
      body,
      author: role,
      createdAt: "刚刚",
    };
    setPosts((current) =>
      current.map((item) =>
        item.id === post.id ? { ...item, replies: [...(item.replies ?? []), optimisticReply] } : item,
      ),
    );
    setReplyDrafts((current) => ({ ...current, [post.id]: { role, body: "" } }));
    setReplyStatus((current) => ({ ...current, [post.id]: "正在保存回复..." }));

    try {
      const response = await fetch("/api/replies", {
        method: "POST",
        body: JSON.stringify({ postId: post.id, role, body }),
        headers: { "content-type": "application/json" },
      });
      if (!response.ok) throw new Error("Reply failed");
      const data = await response.json();
      setPosts((current) =>
        current.map((item) =>
          item.id === post.id
            ? {
                ...item,
                replies: (item.replies ?? []).map((reply) =>
                  reply.id === optimisticReply.id ? data.reply : reply,
                ),
              }
            : item,
        ),
      );
      setReplyStatus((current) => ({ ...current, [post.id]: "已回复在原帖下面" }));
      window.dispatchEvent(new Event("pd-science-posts-updated"));
    } catch {
      setReplyStatus((current) => ({ ...current, [post.id]: "已先显示在本页，网络恢复后可重试" }));
    }
  }

  return (
    <section className="community-section" id="community">
      <div className="composer" ref={composerRef}>
        <p className="eyebrow">Community board</p>
        <h2>发帖提问</h2>
        <form onSubmit={submitPost}>
          <div className="field-row">
            <label>
              身份
              <select
                name="role"
                value={draft.role}
                onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value }))}
              >
                <option>患者</option>
                <option>家属</option>
                <option>医生</option>
                <option>科研人员</option>
              </select>
            </label>
            <label>
              板块
              <select
                name="channel"
                value={draft.channel}
                onChange={(event) => setDraft((current) => ({ ...current, channel: event.target.value }))}
              >
                <option>患者互助</option>
                <option>医生答疑</option>
                <option>科研讨论</option>
                <option>招募与访谈</option>
              </select>
            </label>
          </div>
          <label>
            标题
            <input
              name="title"
              placeholder="例如：左旋多巴加量前应记录哪些症状？"
              maxLength={80}
              value={draft.title}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
            />
          </label>
          <label>
            内容
            <textarea
              ref={bodyRef}
              name="body"
              placeholder="写下你的问题、背景、已有检查或想邀请谁来回答。"
              rows={5}
              maxLength={420}
              value={draft.body}
              onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))}
            />
          </label>
          <div className="composer-footer">
            <span aria-live="polite">{status}</span>
            <button type="submit">发布</button>
          </div>
        </form>
      </div>

      <div className="feed">
        <div className="feed-header">
          <div>
            <p className="eyebrow">Latest questions</p>
            <h2>最新交流</h2>
          </div>
          <div className="tabs" role="tablist" aria-label="按板块筛选帖子">
            {channels.map((channel) => (
              <button
                key={channel}
                type="button"
                className={activeChannel === channel ? "active" : ""}
                onClick={() => setActiveChannel(channel)}
              >
                {channel}
              </button>
            ))}
          </div>
        </div>
        <div className="post-list">
          {visiblePosts.map((post) => (
            <article className="post-card" key={post.id}>
              <div className="post-meta">
                <span>{post.channel}</span>
                <span>{post.role}</span>
                <time>{post.createdAt}</time>
              </div>
              <h3>{post.title}</h3>
              <p>{post.body}</p>
              <div className="post-actions">
                <button type="button" onClick={() => replyToPost(post)} aria-label={`留言回复：${post.title}`}>
                  {activeReplyPostId === post.id ? "收起留言" : `留言${post.replies?.length ? ` ${post.replies.length}` : ""}`}
                </button>
                <button type="button" onClick={() => inviteDoctor(post)} aria-label={`邀请医生回答：${post.title}`}>
                  邀请医生
                </button>
                <button type="button" onClick={() => saveLiteratureLead(post)} aria-label={`收藏文献线索：${post.title}`}>
                  收藏文献线索
                </button>
              </div>
              {(post.replies?.length || activeReplyPostId === post.id) && (
                <div className="reply-thread" aria-label={`${post.title} 的回复`}>
                  {(post.replies ?? []).map((reply) => (
                    <article className="reply-card" key={reply.id}>
                      <div className="reply-meta">
                        <span>{reply.role}</span>
                        <time>{reply.createdAt}</time>
                      </div>
                      <p>{reply.body}</p>
                    </article>
                  ))}
                  {activeReplyPostId === post.id && (
                    <div className="reply-composer">
                      <div className="reply-composer-top">
                        <label>
                          身份
                          <select
                            value={replyDrafts[post.id]?.role ?? draft.role}
                            onChange={(event) =>
                              setReplyDrafts((current) => ({
                                ...current,
                                [post.id]: {
                                  role: event.target.value,
                                  body: current[post.id]?.body ?? "",
                                },
                              }))
                            }
                          >
                            <option>患者</option>
                            <option>家属</option>
                            <option>医生</option>
                            <option>科研人员</option>
                          </select>
                        </label>
                      </div>
                      <textarea
                        value={replyDrafts[post.id]?.body ?? ""}
                        onChange={(event) =>
                          setReplyDrafts((current) => ({
                            ...current,
                            [post.id]: {
                              role: current[post.id]?.role ?? draft.role,
                              body: event.target.value,
                            },
                          }))
                        }
                        placeholder="在这个问题下面回复，补充经验、建议或追问。"
                        rows={3}
                        maxLength={420}
                      />
                      <div className="reply-footer">
                        <span aria-live="polite">{replyStatus[post.id] ?? "回复会显示在这个问题下面"}</span>
                        <button type="button" onClick={() => submitReply(post)}>
                          回复
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
