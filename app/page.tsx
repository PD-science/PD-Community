import { CommunityBoard } from "./community-board";

const channels = [
  { label: "患者互助", count: "128", tone: "症状记录、用药体验、照护经验" },
  { label: "医生答疑", count: "36", tone: "诊疗路径、DBS、康复建议" },
  { label: "科研讨论", count: "54", tone: "靶点、临床试验、文献复盘" },
  { label: "招募与访谈", count: "12", tone: "问卷、访谈、研究参与机会" },
];

const literature = [
  {
    tag: "Science",
    title: "FAM171A2 与 alpha-syn 传播",
    text: "复旦华山团队提出新的疾病修饰靶点，提示阻断病理蛋白传播可能成为下一代治疗路径。",
  },
  {
    tag: "Nature",
    title: "SCAN 网络与精准脑环路",
    text: "昌平实验室相关研究把药物、DBS、磁波刀、经颅刺激的作用机制放进统一脑网络框架。",
  },
  {
    tag: "Clinical",
    title: "iPSC/ESC 多巴胺细胞移植",
    text: "日本与美国小规模临床试验报告安全性和运动改善信号，长期疗效仍需要持续追踪。",
  },
];

const recruitments = [
  "早期帕金森非运动症状访谈",
  "照护者负担与睡眠问卷",
  "科研人员文献共读小组招募",
];

export default function Home() {
  return (
    <main className="site-shell">
      <header className="topbar" aria-label="PD科学社区导航">
        <a className="brand" href="#top" aria-label="PD科学首页">
          <img src="/pd-science-logo.png" alt="" />
          <span>PD科学</span>
        </a>
        <nav>
          <a href="#community">社区</a>
          <a href="#assistant">小助手</a>
          <a href="#research">文献</a>
          <a href="#recruit">招募</a>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">患者 · 医生 · 科研人员共同交流</p>
          <h1>PD科学社区</h1>
          <p className="hero-lede">
            一个像贴吧一样的帕金森病交流空间：可以发帖提问、回应经验、追踪文献，也可以直达 PD科学小助手、问卷访谈和研究招募入口。
          </p>
          <div className="hero-actions">
            <a className="primary-action" href="#community">发起提问</a>
            <a className="secondary-action" href="https://pd-science.streamlit.app/" target="_blank" rel="noreferrer">
              进入小助手
            </a>
          </div>
        </div>
        <div className="assistant-card" id="assistant">
          <div className="bot-frame">
            <img src="/pd-science-bot.png" alt="PD科学小助手" />
          </div>
          <div>
            <p className="card-kicker">AI 小助手入口</p>
            <h2>把问题先整理清楚</h2>
            <p>用药、症状、文献名词、就诊前准备，都可以先让小助手帮你梳理。</p>
            <a href="https://pd-science.streamlit.app/" target="_blank" rel="noreferrer">打开 Streamlit 小助手</a>
          </div>
        </div>
      </section>

      <section className="channel-strip" aria-label="社区板块">
        {channels.map((item) => (
          <article key={item.label} className="channel-card">
            <div>
              <span>{item.label}</span>
              <strong>{item.count}</strong>
            </div>
            <p>{item.tone}</p>
          </article>
        ))}
      </section>

      <CommunityBoard />

      <section className="split-section" id="research">
        <div className="section-heading">
          <p className="eyebrow">Literature room</p>
          <h2>文献板块</h2>
          <p>把 PD科学知识库中的研究突破、争议和临床转化线索，整理成社区可讨论的话题。</p>
        </div>
        <div className="literature-list">
          {literature.map((item) => (
            <article key={item.title} className="literature-card">
              <span>{item.tag}</span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="resource-band" id="recruit">
        <div className="wechat-panel">
          <img src="/pd-science-wechat.png" alt="PD科学微信公众号二维码" />
          <div>
            <p className="card-kicker">公众号</p>
            <h2>关注 PD科学</h2>
            <p>扫码进入公众号，适合承接长文、活动通知、访谈招募和社区精选帖。</p>
          </div>
        </div>
        <div className="recruit-panel">
          <p className="card-kicker">问卷 · 访谈 · 招募</p>
          <h2>正在收集的问题</h2>
          <ul>
            {recruitments.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <a href="mailto:pdscience@example.com?subject=PD科学社区招募合作">发布招募广告</a>
        </div>
      </section>
    </main>
  );
}
