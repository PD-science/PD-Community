import { env } from "cloudflare:workers";

type PostRow = {
  id: number;
  role: string;
  channel: string;
  title: string;
  body: string;
  author: string;
  created_at: string;
};

const seedPosts = [
  ["患者", "患者互助", "起床后僵硬明显，大家会怎么记录变化？", "想把症状和用药时间整理给医生看，欢迎分享你们觉得有效的记录方式。", "晨间记录者"],
  ["医生", "医生答疑", "就诊前建议带上哪些资料？", "近期症状视频、药物清单、开关期时间、睡眠和便秘等非运动症状记录，都能帮助医生更快判断。", "神经内科医生"],
  ["科研人员", "科研讨论", "想开一个 alpha-syn SAA 定义争议共读帖", "欢迎从临床终点、疾病分期和试验入组标准三个角度补充论文。", "文献共读"],
];

async function ensurePostsTable() {
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
    env.DB.prepare("CREATE INDEX IF NOT EXISTS posts_created_at_idx ON posts (created_at DESC)"),
  ]);

  const count = await env.DB.prepare("SELECT COUNT(*) AS count FROM posts").first<{ count: number }>();
  if ((count?.count ?? 0) === 0) {
    await env.DB.batch(
      seedPosts.map((post) =>
        env.DB.prepare("INSERT INTO posts (role, channel, title, body, author) VALUES (?, ?, ?, ?, ?)").bind(...post),
      ),
    );
  }
}

function serialize(row: PostRow) {
  const date = new Date(row.created_at);
  return {
    id: row.id,
    role: row.role,
    channel: row.channel,
    title: row.title,
    body: row.body,
    author: row.author,
    createdAt: Number.isNaN(date.valueOf()) ? row.created_at : date.toLocaleDateString("zh-CN"),
  };
}

export async function GET() {
  await ensurePostsTable();
  const result = await env.DB.prepare("SELECT * FROM posts ORDER BY created_at DESC, id DESC LIMIT 40").all<PostRow>();
  return Response.json({ posts: result.results.map(serialize) });
}

export async function POST(request: Request) {
  await ensurePostsTable();
  const payload = await request.json().catch(() => ({}));
  const title = String(payload.title ?? "").trim().slice(0, 80);
  const body = String(payload.body ?? "").trim().slice(0, 420);
  const role = String(payload.role ?? "患者").trim().slice(0, 20);
  const channel = String(payload.channel ?? "患者互助").trim().slice(0, 20);

  if (!title || !body) {
    return Response.json({ error: "标题和内容不能为空" }, { status: 400 });
  }

  const result = await env.DB.prepare(
    "INSERT INTO posts (role, channel, title, body, author) VALUES (?, ?, ?, ?, ?) RETURNING *",
  )
    .bind(role, channel, title, body, role)
    .first<PostRow>();

  return Response.json({ post: serialize(result!) }, { status: 201 });
}
