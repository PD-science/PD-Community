import { env } from "cloudflare:workers";

type ReplyRow = {
  id: number;
  post_id: number;
  role: string;
  body: string;
  author: string;
  created_at: string;
};

async function ensureRepliesTable() {
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL,
      channel TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      author TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS replies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      body TEXT NOT NULL,
      author TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
    )`),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS replies_post_id_created_at_idx ON replies (post_id, created_at)"),
  ]);
}

function serialize(row: ReplyRow) {
  const date = new Date(row.created_at);
  return {
    id: row.id,
    postId: row.post_id,
    role: row.role,
    body: row.body,
    author: row.author,
    createdAt: Number.isNaN(date.valueOf()) ? row.created_at : date.toLocaleDateString("zh-CN"),
  };
}

export async function POST(request: Request) {
  await ensureRepliesTable();
  const payload = await request.json().catch(() => ({}));
  const postId = Number(payload.postId);
  const role = String(payload.role ?? "患者").trim().slice(0, 20);
  const body = String(payload.body ?? "").trim().slice(0, 420);

  if (!Number.isInteger(postId) || postId <= 0 || !body) {
    return Response.json({ error: "帖子和回复内容不能为空" }, { status: 400 });
  }

  const post = await env.DB.prepare("SELECT id FROM posts WHERE id = ?").bind(postId).first<{ id: number }>();
  if (!post) {
    return Response.json({ error: "原帖不存在" }, { status: 404 });
  }

  const result = await env.DB.prepare(
    "INSERT INTO replies (post_id, role, body, author) VALUES (?, ?, ?, ?) RETURNING *",
  )
    .bind(postId, role, body, role)
    .first<ReplyRow>();

  return Response.json({ reply: serialize(result!) }, { status: 201 });
}
