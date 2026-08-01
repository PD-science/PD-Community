"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Post = {
  id: number;
  role: string;
  channel: string;
  title: string;
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
  },
  {
    id: 2,
    role: "医生",
    channel: "医生答疑",
    title: "就诊前建议带上哪些资料？",
    body: "近期症状视频、药物清单、开关期时间、睡眠和便秘等非运动症状记录，都能帮助医生更快判断。",
    author: "神经内科医生",
    createdAt: "置顶",
  },
  {
    id: 3,
    role: "科研人员",
    channel: "科研讨论",
    title: "想开一个 alpha-syn SAA 定义争议共读帖",
    body: "欢迎从临床终点、疾病分期和试验入组标准三个角度补充论文。",
    author: "文献共读",
    createdAt: "今日",
  },
];

const channels = ["全部", "患者互助", "医生答疑", "科研讨论", "招募与访谈"];

export function CommunityBoard() {
  const [posts, setPosts] = useState<Post[]>(fallbackPosts);
  const [activeChannel, setActiveChannel] = useState("全部");
  const [status, setStatus] = useState("欢迎发起一个具体问题");

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
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const body = String(form.get("body") ?? "").trim();
    const role = String(form.get("role") ?? "患者");
    const channel = String(form.get("channel") ?? "患者互助");

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
    };
    setPosts((current) => [optimisticPost, ...current]);
    event.currentTarget.reset();

    try {
      const response = await fetch("/api/posts", {
        method: "POST",
        body: JSON.stringify({ title, body, role, channel }),
        headers: { "content-type": "application/json" },
      });
      if (!response.ok) throw new Error("Post failed");
      const data = await response.json();
      setPosts((current) => [data.post, ...current.filter((post) => post.id !== optimisticPost.id)]);
      setStatus("已发布到社区");
    } catch {
      setStatus("已先显示在本页，网络恢复后可再次发布");
    }
  }

  return (
    <section className="community-section" id="community">
      <div className="composer">
        <p className="eyebrow">Community board</p>
        <h2>发帖提问</h2>
        <form onSubmit={submitPost}>
          <div className="field-row">
            <label>
              身份
              <select name="role" defaultValue="患者">
                <option>患者</option>
                <option>家属</option>
                <option>医生</option>
                <option>科研人员</option>
              </select>
            </label>
            <label>
              板块
              <select name="channel" defaultValue="患者互助">
                <option>患者互助</option>
                <option>医生答疑</option>
                <option>科研讨论</option>
                <option>招募与访谈</option>
              </select>
            </label>
          </div>
          <label>
            标题
            <input name="title" placeholder="例如：左旋多巴加量前应记录哪些症状？" maxLength={80} />
          </label>
          <label>
            内容
            <textarea name="body" placeholder="写下你的问题、背景、已有检查或想邀请谁来回答。" rows={5} maxLength={420} />
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
                <button type="button">留言</button>
                <button type="button">邀请医生</button>
                <button type="button">收藏文献线索</button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
