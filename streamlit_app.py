from __future__ import annotations

import base64
import html
import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests
import streamlit as st


REPO = st.secrets.get("GITHUB_REPO", "PD-science/PD-Community")
BRANCH = st.secrets.get("GITHUB_BRANCH", "main")
DATA_PATH = st.secrets.get("GITHUB_DATA_PATH", "data/posts.json")
GITHUB_TOKEN = st.secrets.get("GITHUB_TOKEN", os.environ.get("GITHUB_TOKEN", ""))
LOCAL_DATA = Path(DATA_PATH)

CHANNELS = ["全部", "患者互助", "医生答疑", "科研讨论", "招募与访谈"]
ROLES = ["患者", "家属", "医生", "科研人员", "其他"]


st.set_page_config(
    page_title="PD科学社区",
    page_icon="PD",
    layout="wide",
    initial_sidebar_state="collapsed",
)


st.markdown(
    """
    <style>
    :root {
        --background: #f6f7f2;
        --foreground: #16211d;
        --ink-soft: #4f5f58;
        --line: #dbe0d4;
        --paper: #ffffff;
        --mint: #d9efe4;
        --teal: #106b63;
        --teal-dark: #083f3b;
        --coral: #de7356;
        --sun: #f1c95d;
        --violet: #6e6aa8;
    }
    .stApp {
        background:
            linear-gradient(180deg, rgba(217, 239, 228, 0.82), rgba(246, 247, 242, 0) 440px),
            var(--background);
        color: var(--foreground);
    }
    div[data-testid="stToolbar"], footer { visibility: hidden; height: 0; }
    .block-container {
        max-width: 1180px;
        padding-top: 1.1rem;
        padding-bottom: 3rem;
    }
    .topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 18px;
    }
    .brand {
        display: flex;
        align-items: center;
        gap: 10px;
        color: var(--teal-dark);
        font-size: 1.15rem;
        font-weight: 900;
    }
    .brand img {
        width: 58px;
        height: 58px;
        object-fit: contain;
    }
    .nav {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 8px;
    }
    .nav a, .pill-link {
        border: 1px solid rgba(16, 107, 99, 0.18);
        border-radius: 999px;
        padding: 8px 13px;
        color: var(--teal-dark) !important;
        background: rgba(255, 255, 255, 0.68);
        text-decoration: none;
        font-weight: 800;
    }
    .hero {
        position: relative;
        overflow: hidden;
        display: flex;
        min-height: 420px;
        flex-direction: column;
        justify-content: center;
        padding: 48px;
        border: 1px solid rgba(16, 107, 99, 0.16);
        border-radius: 8px;
        background:
            linear-gradient(90deg, rgba(255, 255, 255, 0.94) 0%, rgba(255, 255, 255, 0.76) 44%, rgba(255, 255, 255, 0.16) 100%),
            url("data:image/png;base64,HEROBG");
        background-position: center;
        background-size: cover;
    }
    .eyebrow {
        color: var(--coral);
        font-size: 0.78rem;
        font-weight: 900;
        letter-spacing: 0;
        text-transform: uppercase;
    }
    .hero h1 {
        margin: 0;
        color: var(--teal-dark);
        font-size: clamp(3.4rem, 8vw, 7.4rem);
        line-height: 0.96;
        letter-spacing: 0;
    }
    .hero p {
        max-width: 760px;
        color: #2f4640;
        font-size: 1.16rem;
        line-height: 1.85;
    }
    .action-row {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-top: 16px;
    }
    .action {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 46px;
        border-radius: 8px;
        padding: 0 18px;
        font-weight: 900;
        text-decoration: none !important;
    }
    .action.primary {
        color: #fff !important;
        background: var(--teal);
    }
    .action.secondary {
        border: 1px solid var(--teal);
        color: var(--teal-dark) !important;
        background: #fff;
    }
    .panel {
        border: 1px solid var(--line);
        border-radius: 8px;
        padding: 22px;
        background: var(--paper);
    }
    .panel h2, .panel h3 {
        color: var(--teal-dark);
        letter-spacing: 0;
    }
    .section-title {
        margin: 0 0 18px;
        color: var(--teal-dark);
        font-size: 2.2rem;
        letter-spacing: 0;
    }
    .stat-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
        margin: 24px 0 0;
    }
    .stat-card {
        border: 1px solid var(--line);
        border-radius: 8px;
        padding: 18px;
        background: var(--paper);
        min-height: 122px;
    }
    .stat-card strong {
        color: var(--violet);
        float: right;
        font-size: 1.8rem;
    }
    .stat-card h3 {
        margin: 0 0 12px;
        color: var(--teal-dark);
        font-size: 1.05rem;
    }
    .stat-card p, .muted {
        color: var(--ink-soft);
        line-height: 1.75;
    }
    .feed-scroll {
        max-height: 700px;
        overflow-y: auto;
        padding-right: 8px;
    }
    .st-key-post_filter {
        margin-top: 1.6rem;
    }
    .post-card {
        border: 1px solid #e5e8df;
        border-radius: 8px;
        padding: 18px;
        margin-bottom: 12px;
        background: #fbfcf8;
    }
    .meta {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 12px;
    }
    .meta span {
        border-radius: 999px;
        padding: 5px 9px;
        color: var(--teal-dark);
        background: var(--mint);
        font-size: 0.78rem;
        font-weight: 800;
    }
    .reply {
        border-left: 3px solid var(--mint);
        margin: 12px 0 0 8px;
        padding: 10px 0 0 12px;
    }
    .reply-card {
        border: 1px solid #e5e8df;
        border-radius: 8px;
        padding: 12px 14px;
        margin-top: 10px;
        background: #fff;
    }
    .assistant-card {
        display: flex;
        min-height: 420px;
        flex-direction: column;
        justify-content: space-between;
        gap: 20px;
        border: 1px solid var(--line);
        border-radius: 8px;
        padding: 24px;
        background: var(--paper);
    }
    .assistant-card h2 {
        margin: 8px 0;
        color: var(--teal-dark);
        font-size: 1.8rem;
        letter-spacing: 0;
    }
    .assistant-card p {
        color: var(--ink-soft);
        line-height: 1.75;
    }
    .assistant-img, .wechat-img {
        width: 100%;
        border-radius: 8px;
        background: #fff;
    }
    .assistant-img {
        aspect-ratio: 16 / 9;
        object-fit: cover;
    }
    .literature-grid {
        display: grid;
        grid-template-columns: minmax(240px, 0.62fr) repeat(3, minmax(0, 1fr));
        gap: 12px;
        margin-top: 22px;
    }
    .literature-card {
        border: 1px solid var(--line);
        border-radius: 8px;
        padding: 20px;
        background: var(--paper);
    }
    .literature-card span {
        color: var(--violet);
        font-weight: 900;
    }
    .literature-card h3 {
        margin: 14px 0 8px;
        color: var(--teal-dark);
        font-size: 1.05rem;
    }
    .resource-panel {
        border: 1px solid var(--line);
        border-radius: 8px;
        padding: 22px;
        background: var(--paper);
    }
    .recruit-list {
        display: grid;
        gap: 10px;
        margin-top: 18px;
    }
    .recruit-list div {
        border-left: 4px solid var(--sun);
        padding: 10px 12px;
        color: #2f4640;
        background: #fbfcf8;
    }
    div.stButton > button {
        border-radius: 8px;
        border: 1px solid var(--teal);
        background: #fff;
        color: var(--teal-dark);
        font-weight: 900;
    }
    div.stButton > button[kind="primary"] {
        border: 0;
        background: var(--teal);
        color: #fff;
    }
    @media (max-width: 900px) {
        .stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .hero { min-height: auto; padding: 28px 20px; }
        .assistant-card { min-height: auto; }
        .literature-grid { grid-template-columns: 1fr; }
    }
    </style>
    """.replace("HEROBG", base64.b64encode(Path("public/hero-community.png").read_bytes()).decode("utf-8")),
    unsafe_allow_html=True,
)


def image_data_uri(path: str) -> str:
    suffix = Path(path).suffix.lower().replace(".", "")
    mime = "jpeg" if suffix in {"jpg", "jpeg"} else "png"
    data = base64.b64encode(Path(path).read_bytes()).decode("utf-8")
    return f"data:image/{mime};base64,{data}"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def short_date(value: str) -> str:
    try:
        date = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return value
    return f"{date.year}/{date.month}/{date.day}"


def clean(value: Any) -> str:
    return html.escape(str(value or ""), quote=True)


def empty_data() -> dict[str, Any]:
    return {
        "posts": [
            {
                "id": "sample-1",
                "role": "患者",
                "channel": "患者互助",
                "author": "晨间记录者",
                "title": "起床后僵硬明显，大家会怎么记录变化？",
                "body": "想把症状和用药时间整理给医生看，欢迎分享你们觉得有效的记录方式。",
                "created_at": "2026-08-01T08:00:00+00:00",
                "replies": [],
            },
            {
                "id": "sample-2",
                "role": "医生",
                "channel": "医生答疑",
                "author": "神经内科医生",
                "title": "就诊前建议带上哪些资料？",
                "body": "近期症状视频、药物清单、开关期时间、睡眠和便秘等非运动症状记录，都能帮助医生更快判断。",
                "created_at": "2026-08-01T08:30:00+00:00",
                "replies": [],
            },
            {
                "id": "sample-3",
                "role": "科研人员",
                "channel": "科研讨论",
                "author": "文献共读",
                "title": "想开一个 alpha-syn SAA 定义争议共读帖",
                "body": "欢迎从临床终点、疾病分期和试验入组标准三个角度补充论文。",
                "created_at": "2026-08-01T09:00:00+00:00",
                "replies": [],
            },
        ]
    }


def github_headers() -> dict[str, str]:
    return {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "X-GitHub-Api-Version": "2022-11-28",
    }


def read_from_github() -> tuple[dict[str, Any], str | None]:
    url = f"https://api.github.com/repos/{REPO}/contents/{DATA_PATH}"
    response = requests.get(url, headers=github_headers(), params={"ref": BRANCH}, timeout=15)
    if response.status_code == 404:
        return empty_data(), None
    response.raise_for_status()
    payload = response.json()
    raw = base64.b64decode(payload["content"]).decode("utf-8")
    return json.loads(raw), payload["sha"]


def write_to_github(data: dict[str, Any], sha: str | None) -> None:
    url = f"https://api.github.com/repos/{REPO}/contents/{DATA_PATH}"
    body: dict[str, Any] = {
        "message": "Update community posts",
        "branch": BRANCH,
        "content": base64.b64encode(
            json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8")
        ).decode("utf-8"),
    }
    if sha:
        body["sha"] = sha
    response = requests.put(url, headers=github_headers(), json=body, timeout=20)
    response.raise_for_status()


def read_local() -> dict[str, Any]:
    if not LOCAL_DATA.exists():
        LOCAL_DATA.parent.mkdir(parents=True, exist_ok=True)
        LOCAL_DATA.write_text(json.dumps(empty_data(), ensure_ascii=False, indent=2), encoding="utf-8")
    return json.loads(LOCAL_DATA.read_text(encoding="utf-8"))


def write_local(data: dict[str, Any]) -> None:
    LOCAL_DATA.parent.mkdir(parents=True, exist_ok=True)
    LOCAL_DATA.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def load_data() -> tuple[dict[str, Any], str | None, str]:
    if GITHUB_TOKEN:
        try:
            data, sha = read_from_github()
            return data, sha, "github"
        except Exception as exc:
            st.warning(f"GitHub 数据读取失败，暂时使用本地数据：{exc}")
    return read_local(), None, "local"


def save_data(data: dict[str, Any], sha: str | None, mode: str) -> None:
    if mode == "github" and GITHUB_TOKEN:
        write_to_github(data, sha)
    else:
        write_local(data)


def count_for_channel(posts: list[dict[str, Any]], channel: str) -> int:
    return sum(1 + len(post.get("replies", [])) for post in posts if post.get("channel") == channel)


def add_post(data: dict[str, Any], post: dict[str, Any]) -> dict[str, Any]:
    next_data = json.loads(json.dumps(data, ensure_ascii=False))
    next_data.setdefault("posts", [])
    next_data["posts"].insert(0, post)
    return next_data


def add_reply(data: dict[str, Any], post_id: str, reply: dict[str, Any]) -> dict[str, Any]:
    next_data = json.loads(json.dumps(data, ensure_ascii=False))
    for post in next_data.get("posts", []):
        if post["id"] == post_id:
            post.setdefault("replies", []).append(reply)
            break
    return next_data


data, data_sha, storage_mode = load_data()
posts = data.get("posts", [])

st.markdown(
    f"""
    <div class="topbar">
      <div class="brand">
        <img src="{image_data_uri("public/pd-science-header-logo.png")}" alt="">
        <span>PD科学</span>
      </div>
      <div class="nav">
        <a href="#community">社区</a>
        <a href="#assistant">小助手</a>
        <a href="#research">文献</a>
        <a href="#wechat">公众号</a>
      </div>
    </div>
    """,
    unsafe_allow_html=True,
)

hero_col, assistant_hero_col = st.columns([1.35, 0.65], gap="large")

with hero_col:
    st.markdown(
        """
        <section class="hero">
      <p class="eyebrow">患者 · 医生 · 科研人员共同交流</p>
      <h1>PD科学社区</h1>
      <p>一个像贴吧一样的帕金森病交流空间：可以发帖提问、回应经验、追踪文献，也可以直达帕金森AI小助手、问卷访谈和研究招募入口。</p>
      <div class="action-row">
        <a class="action primary" href="#community">发起提问</a>
        <a class="action secondary" href="https://pd-science.streamlit.app/" target="_blank" rel="noreferrer">进入小助手</a>
      </div>
    </section>
        """,
        unsafe_allow_html=True,
    )

with assistant_hero_col:
    st.markdown(
        f"""
        <aside class="assistant-card" id="assistant">
          <img class="assistant-img" src="{image_data_uri("public/pd-science-bot.png")}" alt="帕金森AI小助手">
          <div>
            <p class="eyebrow">AI 小助手入口</p>
            <h2>把问题先整理清楚</h2>
            <p>用药、症状、文献名词、就诊前准备，都可以先让帕金森AI小助手帮你梳理。</p>
            <a class="action secondary" href="https://pd-science.streamlit.app/" target="_blank" rel="noreferrer">打开帕金森AI小助手</a>
          </div>
        </aside>
        """,
        unsafe_allow_html=True,
    )

left, right = st.columns([0.85, 1.35], gap="large")

with left:
    st.markdown('<h2 class="section-title" id="community">发帖提问</h2>', unsafe_allow_html=True)
    with st.form("new-post", clear_on_submit=True):
        col_a, col_b = st.columns(2)
        with col_a:
            role = st.selectbox("身份", ROLES, index=0)
        with col_b:
            channel = st.selectbox("板块", CHANNELS[1:], index=0)
        author = st.text_input("昵称", placeholder="例如：晨间记录者")
        title = st.text_input("标题", placeholder="例如：左旋多巴加量前应该记录哪些症状？")
        body = st.text_area("内容", height=170, placeholder="写下你的问题、背景、已有检查或想邀请谁来回答。请避免发布隐私信息。")
        submitted = st.form_submit_button("发布", type="primary", use_container_width=True)

    if submitted:
        if not title.strip() or not body.strip():
            st.error("标题和内容都需要填写。")
        else:
            try:
                latest_data, latest_sha, latest_mode = load_data()
                post = {
                    "id": uuid.uuid4().hex,
                    "role": role,
                    "channel": channel,
                    "author": author.strip() or role,
                    "title": title.strip(),
                    "body": body.strip(),
                    "created_at": now_iso(),
                    "replies": [],
                }
                save_data(add_post(latest_data, post), latest_sha, latest_mode)
                st.success("已发布到社区。")
                st.rerun()
            except Exception as exc:
                st.error(f"发布失败：{exc}")

    if storage_mode == "github":
        st.caption(f"当前数据保存到 GitHub：{REPO}/{DATA_PATH}")
    else:
        st.caption("当前是本地数据模式。部署到 Streamlit Cloud 后，请配置 GITHUB_TOKEN 让数据写回 GitHub。")

with right:
    header_a, header_b = st.columns([1, 1])
    with header_a:
        st.markdown('<h2 class="section-title">最新交流</h2>', unsafe_allow_html=True)
    with header_b:
        active_channel = st.selectbox("筛选板块", CHANNELS, index=0, label_visibility="collapsed", key="post_filter")

    visible_posts = posts if active_channel == "全部" else [p for p in posts if p.get("channel") == active_channel]
    st.markdown('<div class="feed-scroll">', unsafe_allow_html=True)
    if not visible_posts:
        st.info("这个板块还没有留言。")
    for post in visible_posts:
        st.markdown(
            f"""
            <article class="post-card">
              <div class="meta">
                <span>{clean(post.get("channel", "社区交流"))}</span>
                <span>{clean(post.get("role", "用户"))}</span>
                <span>{clean(short_date(post.get("created_at", "")))}</span>
              </div>
              <h3>{clean(post.get("title", ""))}</h3>
              <p class="muted">{clean(post.get("body", ""))}</p>
            """,
            unsafe_allow_html=True,
        )
        replies = post.get("replies", [])
        with st.expander(f"留言 {len(replies)}", expanded=False):
            if replies:
                st.markdown('<div class="reply">', unsafe_allow_html=True)
                for reply in replies:
                    st.markdown(
                        f"""
                        <div class="reply-card">
                          <div class="meta">
                            <span>{clean(reply.get("role", "用户"))}</span>
                            <span>{clean(short_date(reply.get("created_at", "")))}</span>
                          </div>
                          <p class="muted">{clean(reply.get("body", ""))}</p>
                        </div>
                        """,
                        unsafe_allow_html=True,
                    )
                st.markdown("</div>", unsafe_allow_html=True)
            else:
                st.caption("还没有留言，欢迎补充。")

            with st.form(f"reply-{post['id']}", clear_on_submit=True):
                reply_role = st.selectbox("身份", ROLES, key=f"role-{post['id']}")
                reply_author = st.text_input("昵称", key=f"author-{post['id']}", placeholder="可不填")
                reply_body = st.text_area("回复内容", key=f"body-{post['id']}", height=110)
                reply_submit = st.form_submit_button("回复")
            if reply_submit:
                if not reply_body.strip():
                    st.error("回复内容不能为空。")
                else:
                    try:
                        latest_data, latest_sha, latest_mode = load_data()
                        reply = {
                            "id": uuid.uuid4().hex,
                            "role": reply_role,
                            "author": reply_author.strip() or reply_role,
                            "body": reply_body.strip(),
                            "created_at": now_iso(),
                        }
                        save_data(add_reply(latest_data, post["id"], reply), latest_sha, latest_mode)
                        st.success("已回复在原帖下面。")
                        st.rerun()
                    except Exception as exc:
                        st.error(f"回复失败：{exc}")
        st.markdown("</article>", unsafe_allow_html=True)
    st.markdown("</div>", unsafe_allow_html=True)

stat_html = ""
for title, subtitle in [
    ("患者互助", "症状记录、用药体验、照护经验"),
    ("医生答疑", "诊疗路径、DBS、康复建议"),
    ("科研讨论", "靶点、临床试验、文献复盘"),
    ("招募与访谈", "问卷、访谈、研究参与机会"),
]:
    stat_html += (
        '<div class="stat-card">'
        f"<strong>{count_for_channel(posts, title)}</strong>"
        f"<h3>{title}</h3>"
        f"<p>{subtitle}</p>"
        "</div>"
    )
st.markdown('<section class="stat-grid">' + stat_html + '</section>', unsafe_allow_html=True)

st.markdown('<div id="research"></div>', unsafe_allow_html=True)
st.markdown(
    """
    <section class="literature-grid">
      <div class="literature-card">
        <p class="eyebrow">Literature room</p>
        <h2>文献板块</h2>
        <p class="muted">把 PD科学知识库中的研究突破、争议和临床转化线索，整理成社区可讨论的话题。</p>
      </div>
      <article class="literature-card">
        <span>Science</span>
        <h3>FAM171A2 与 alpha-syn 传播</h3>
        <p class="muted">关注疾病修饰靶点，讨论阻断病理蛋白传播的治疗可能性。</p>
      </article>
      <article class="literature-card">
        <span>Nature</span>
        <h3>SCAN 网络与精准脑环路</h3>
        <p class="muted">把药物、DBS、磁波刀、经颅刺激的作用机制放进统一脑网络框架。</p>
      </article>
      <article class="literature-card">
        <span>Clinical</span>
        <h3>细胞移植与临床转化</h3>
        <p class="muted">追踪安全性、疗效信号和长期随访。</p>
      </article>
    </section>
    """,
    unsafe_allow_html=True,
)

wechat_col, recruit_col = st.columns([0.9, 1.1], gap="large")
with wechat_col:
    st.markdown(
        f"""
        <section class="resource-panel" id="wechat">
          <p class="eyebrow">公众号</p>
          <h2>关注 PD科学</h2>
          <p class="muted">扫码进入公众号，适合承接长文、活动通知、访谈招募和社区精选帖。</p>
          <img class="wechat-img" src="{image_data_uri("public/pd-science-wechat.png")}" alt="PD科学微信公众号二维码">
        </section>
        """,
        unsafe_allow_html=True,
    )
with recruit_col:
    st.markdown(
        """
        <section class="resource-panel">
          <p class="eyebrow">问卷 · 访谈 · 招募</p>
          <h2>正在收集的问题</h2>
          <div class="recruit-list">
            <div>早期帕金森非运动症状访谈</div>
            <div>照护者负担与睡眠问卷</div>
            <div>科研人员文献共读小组招募</div>
          </div>
          <p class="muted">可以在“招募与访谈”板块发布新的问卷、访谈或研究参与机会。</p>
        </section>
        """,
        unsafe_allow_html=True,
    )

st.divider()
st.caption("本社区仅用于经验交流与科研信息整理，不构成医疗建议。具体诊疗请咨询专业医生。")
