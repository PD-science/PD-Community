const crypto = require("crypto");
const https = require("https");

const CHANNELS = ["全部", "患者互助", "医生答疑", "科研讨论", "招募与访谈"];
const ROLES = ["患者", "家属", "医生", "科研人员", "其他"];
const PAGE_SIZE = 3;
const REPO = process.env.GITHUB_REPO || "PD-science/PD-Community";
const BRANCH = process.env.GITHUB_BRANCH || "main";
const DATA_PATH = process.env.GITHUB_DATA_PATH || "data/posts.json";
const TOKEN = process.env.GITHUB_TOKEN || "";

function jsonResponse(statusCode, body) {
  return { statusCode, body };
}

function githubRequest(method, path, payload) {
  return new Promise((resolve, reject) => {
    if (!TOKEN) {
      reject(new Error("云函数缺少 GITHUB_TOKEN 环境变量"));
      return;
    }

    const data = payload ? JSON.stringify(payload) : "";
    const req = https.request(
      {
        hostname: "api.github.com",
        path,
        method,
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
          "User-Agent": "PD-Community-WeChat-MiniProgram",
          "X-GitHub-Api-Version": "2022-11-28",
          ...(data ? { "Content-Length": Buffer.byteLength(data) } : {})
        }
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => {
          raw += chunk;
        });
        res.on("end", () => {
          let parsed = {};
          if (raw) {
            try {
              parsed = JSON.parse(raw);
            } catch (error) {
              reject(new Error(`GitHub 返回内容无法解析：${raw.slice(0, 120)}`));
              return;
            }
          }
          if (res.statusCode >= 400) {
            reject(new Error(parsed.message || `GitHub API 错误：${res.statusCode}`));
            return;
          }
          resolve(parsed);
        });
      }
    );
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

function publicGithubJson() {
  return new Promise((resolve, reject) => {
    const encodedPath = DATA_PATH.split("/").map(encodeURIComponent).join("/");
    const path = `/${REPO}/${encodeURIComponent(BRANCH)}/${encodedPath}`;
    const req = https.request(
      {
        hostname: "raw.githubusercontent.com",
        path,
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": "PD-Community-WeChat-MiniProgram"
        }
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => {
          raw += chunk;
        });
        res.on("end", () => {
          if (res.statusCode >= 400) {
            reject(new Error(`公开 GitHub 数据读取失败：${res.statusCode}`));
            return;
          }
          try {
            resolve(JSON.parse(raw));
          } catch (error) {
            reject(new Error("公开 GitHub 数据无法解析"));
          }
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

function emptyData() {
  return { posts: [] };
}

async function readData(options = {}) {
  if (!TOKEN && options.publicRead) {
    return { data: await publicGithubJson(), sha: null };
  }

  const encodedPath = DATA_PATH.split("/").map(encodeURIComponent).join("/");
  const path = `/repos/${REPO}/contents/${encodedPath}?ref=${encodeURIComponent(BRANCH)}`;
  try {
    const payload = await githubRequest("GET", path);
    const raw = Buffer.from(payload.content, "base64").toString("utf8");
    return { data: JSON.parse(raw), sha: payload.sha };
  } catch (error) {
    if (String(error.message).includes("Not Found")) {
      return { data: emptyData(), sha: null };
    }
    throw error;
  }
}

async function writeData(data, sha) {
  const encodedPath = DATA_PATH.split("/").map(encodeURIComponent).join("/");
  const path = `/repos/${REPO}/contents/${encodedPath}`;
  const body = {
    message: "Update community posts",
    branch: BRANCH,
    content: Buffer.from(JSON.stringify(data, null, 2)).toString("base64")
  };
  if (sha) body.sha = sha;
  await githubRequest("PUT", path, body);
}

function nowIso() {
  return new Date().toISOString();
}

function shortDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "";
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

function safeText(value, fallback = "") {
  return String(value || fallback).trim();
}

function ensureChoice(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function id(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}`;
}

function anonymizeOpenid(openid) {
  if (!openid) return "";
  return crypto.createHash("sha256").update(openid).digest("hex").slice(0, 16);
}

function getOpenid(event) {
  return (
    event.openid ||
    event.OPENID ||
    (event.userInfo && (event.userInfo.openId || event.userInfo.openid)) ||
    (event.wxContext && event.wxContext.OPENID) ||
    ""
  );
}

function postMatchesQuery(post, query) {
  const keyword = safeText(query).toLowerCase();
  if (!keyword) return true;
  const fields = [
    post.channel,
    post.role,
    post.author,
    post.title,
    post.body,
    ...(post.replies || []).flatMap((reply) => [reply.role, reply.author, reply.body])
  ];
  return fields.join(" ").toLowerCase().includes(keyword);
}

function countForChannel(posts, channel) {
  const baseCount = posts
    .filter((post) => post.channel === channel)
    .reduce((total, post) => total + 1 + (post.replies || []).length, 0);
  if (channel !== "医生答疑") return baseCount;
  const doctorReplies = posts
    .filter((post) => post.channel !== "医生答疑")
    .reduce(
      (total, post) =>
        total + (post.replies || []).filter((reply) => reply.role === "医生").length,
      0
    );
  return baseCount + doctorReplies;
}

function listPosts(data, params) {
  const channel = ensureChoice(params.channel, CHANNELS, "全部");
  const query = safeText(params.query);
  const page = Math.max(parseInt(params.page || "1", 10) || 1, 1);
  let posts = data.posts || [];
  if (channel !== "全部") {
    posts = posts.filter((post) => post.channel === channel);
  }
  posts = posts.filter((post) => postMatchesQuery(post, query));
  const pageCount = Math.max(Math.ceil(posts.length / PAGE_SIZE), 1);
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * PAGE_SIZE;
  const counts = Object.fromEntries(
    CHANNELS.filter((item) => item !== "全部").map((item) => [item, countForChannel(data.posts || [], item)])
  );
  return {
    posts: posts.slice(start, start + PAGE_SIZE).map((post) => ({
      ...post,
      shortDate: shortDate(post.created_at),
      replies: (post.replies || []).map((reply) => ({
        ...reply,
        shortDate: shortDate(reply.created_at)
      }))
    })),
    page: currentPage,
    pageCount,
    total: posts.length,
    counts
  };
}

async function mutate(mutator) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const { data, sha } = await readData();
      const nextData = JSON.parse(JSON.stringify(data));
      const result = mutator(nextData);
      await writeData(nextData, sha);
      return result;
    } catch (error) {
      if (attempt === 2 || !String(error.message).includes("sha")) {
        throw error;
      }
    }
  }
  throw new Error("数据更新失败，请稍后再试");
}

exports.main = async (event) => {
  const action = event.action || "list";
  const openid = getOpenid(event);

  try {
    if (action === "list") {
      const { data } = await readData({ publicRead: true });
      return jsonResponse(200, listPosts(data, event));
    }

    if (action === "createPost") {
      const title = safeText(event.title);
      const body = safeText(event.body);
      if (!title || !body) throw new Error("标题和内容都需要填写");
      const role = ensureChoice(event.role, ROLES, "患者");
      const channel = ensureChoice(event.channel, CHANNELS.slice(1), "患者互助");
      const author = safeText(event.author, role);
      const post = await mutate((data) => {
        const nextPost = {
          id: id("wx-post"),
          role,
          channel,
          author,
          title,
          body,
          created_at: nowIso(),
          source: "wechat-miniprogram",
          openid_hash: anonymizeOpenid(openid),
          replies: []
        };
        data.posts = data.posts || [];
        data.posts.unshift(nextPost);
        return nextPost;
      });
      return jsonResponse(200, { post });
    }

    if (action === "createReply") {
      const postId = safeText(event.postId);
      const body = safeText(event.body);
      if (!postId || !body) throw new Error("请选择帖子并填写回复内容");
      const role = ensureChoice(event.role, ROLES, "患者");
      const author = safeText(event.author, role);
      const reply = await mutate((data) => {
        const post = (data.posts || []).find((item) => item.id === postId);
        if (!post) throw new Error("原帖不存在");
        const nextReply = {
          id: id("wx-reply"),
          role,
          author,
          body,
          created_at: nowIso(),
          source: "wechat-miniprogram",
          openid_hash: anonymizeOpenid(openid)
        };
        post.replies = post.replies || [];
        post.replies.push(nextReply);
        return nextReply;
      });
      return jsonResponse(200, { reply });
    }

    throw new Error("未知操作");
  } catch (error) {
    return jsonResponse(500, { message: error.message || "请求失败" });
  }
};
