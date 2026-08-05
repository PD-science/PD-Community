# PD科学社区

PD科学社区是面向帕金森病患者、家属、医生和科研人员的交流网站。仓库里保留了两套发布方式：

- `streamlit_app.py`：推荐使用的 Streamlit 互动版，支持网页内发帖和回复。
- `miniprogram/` + `cloudfunctions/`：微信小程序版，通过云函数同步读写 GitHub 数据。
- `docs/`：GitHub Pages 静态版，适合作为公开入口或备用页面。

## Streamlit 版本

本地运行：

```bash
pip install -r requirements.txt
streamlit run streamlit_app.py
```

Streamlit Community Cloud 部署：

1. 打开 Streamlit Community Cloud。
2. 选择仓库 `PD-science/PD-Community`。
3. Main file path 填写 `streamlit_app.py`。
4. 在 App settings -> Secrets 中配置下面的内容：

```toml
GITHUB_REPO = "PD-science/PD-Community"
GITHUB_BRANCH = "main"
GITHUB_DATA_PATH = "data/posts.json"
GITHUB_TOKEN = "你的 GitHub fine-grained token"
```

`GITHUB_TOKEN` 需要对该仓库有 Contents 读写权限。不要把真实 token 提交到 GitHub。

如果没有配置 token，应用会退回本地 JSON 模式，适合本地测试，但 Streamlit Cloud 重启后数据可能丢失。正式使用时请配置 GitHub token，让核心留言数据写入 `data/posts.json`。

## 微信小程序版本

小程序端不能直接保存 GitHub token，否则会暴露仓库写权限。本项目采用：

```text
微信小程序 -> 微信云函数 githubPosts -> GitHub data/posts.json
Streamlit -> GitHub data/posts.json
```

这样 Streamlit 网页和微信小程序会共用同一份帖子数据。

### 目录

```text
miniprogram/                  微信小程序前端
cloudfunctions/githubPosts/   读写 GitHub 数据的微信云函数
project.config.json           微信开发者工具项目配置
```

### 配置步骤

1. 打开微信开发者工具，选择本仓库作为项目目录。
2. 将 `project.config.json` 里的 `YOUR_WECHAT_MINIPROGRAM_APPID` 改成你的小程序 AppID。
3. 开通微信云开发，并复制云开发环境 ID。
4. 将 `miniprogram/app.js` 里的 `YOUR_CLOUD_ENV_ID` 改成你的云开发环境 ID。
5. 上传并部署云函数 `cloudfunctions/githubPosts`。
6. 在云函数环境变量里配置：

```text
GITHUB_REPO=PD-science/PD-Community
GITHUB_BRANCH=main
GITHUB_DATA_PATH=data/posts.json
GITHUB_TOKEN=你的 GitHub fine-grained token
```

`GITHUB_TOKEN` 需要对该仓库有 Contents 读写权限。不要把真实 token 写进小程序前端，也不要提交到 GitHub。

小程序目前支持：

- 发帖和回复。
- 按板块筛选。
- 搜索标题、内容、昵称和留言。
- 每页 3 条分页展示。
- 板块统计数字，与 Streamlit 版本使用同一套计算逻辑。

## 功能

- 患者互助、医生答疑、科研讨论、招募与访谈四个板块。
- 发帖、回复、按板块筛选。
- 统计数字按帖子和回复总数计算。
- PD科学小助手入口。
- 文献板块、公众号二维码、招募入口。

## 数据

社区数据默认保存在：

```text
data/posts.json
```

Streamlit 运行时会读取这个文件。配置 GitHub token 后，每次发帖或回复都会通过 GitHub API 更新这个文件。

## 注意

本社区用于经验交流与科研信息整理，不构成医疗建议。用户发帖时应避免发布姓名、电话、身份证号、详细住址、病历原件等隐私信息。
