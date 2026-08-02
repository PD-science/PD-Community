const issueList = document.querySelector("#issue-list");

function labelsHtml(labels) {
  if (!labels.length) return '<span>社区交流</span>';
  return labels
    .slice(0, 3)
    .map((label) => `<span>${escapeHtml(label.name)}</span>`)
    .join("");
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).format(new Date(value));
}

async function loadIssues() {
  try {
    const response = await fetch(
      "https://api.github.com/repos/PD-science/PD-Community/issues?state=open&per_page=12&sort=updated",
      { headers: { accept: "application/vnd.github+json" } },
    );
    if (!response.ok) throw new Error("GitHub API unavailable");
    const issues = (await response.json()).filter((issue) => !issue.pull_request);
    if (!issues.length) {
      issueList.innerHTML = `
        <article class="issue-card">
          <h3>还没有公开留言</h3>
          <p>你可以成为第一个发帖的人。</p>
        </article>
      `;
      return;
    }
    issueList.innerHTML = issues
      .map(
        (issue) => `
          <article class="issue-card">
            <div class="issue-meta">
              ${labelsHtml(issue.labels ?? [])}
              <span>${formatDate(issue.updated_at)}</span>
              <span>留言 ${issue.comments}</span>
            </div>
            <h3><a href="${issue.html_url}">${escapeHtml(issue.title)}</a></h3>
            <p>${escapeHtml((issue.body ?? "点击进入 GitHub 查看详情和回复。").slice(0, 160))}</p>
            <a class="secondary" href="${issue.html_url}">进入回复</a>
          </article>
        `,
      )
      .join("");
  } catch {
    issueList.innerHTML = `
      <article class="issue-card">
        <h3>暂时无法读取最新留言</h3>
        <p>可以直接进入 GitHub Issues 查看或发帖。</p>
        <a class="secondary" href="https://github.com/PD-science/PD-Community/issues">查看全部留言</a>
      </article>
    `;
  }
}

loadIssues();
