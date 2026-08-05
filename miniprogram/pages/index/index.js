const CHANNELS = ["全部", "患者互助", "医生答疑", "科研讨论", "招募与访谈"];
const POST_CHANNELS = CHANNELS.slice(1);
const ROLES = ["患者", "家属", "医生", "科研人员", "其他"];
const ASSISTANT_URL = "https://pd-science.streamlit.app/";
const COMMUNITY_URL = "https://pd-community.streamlit.app/";

Page({
  data: {
    channels: CHANNELS,
    postChannels: POST_CHANNELS,
    roles: ROLES,
    activeChannelIndex: 0,
    postRoleIndex: 0,
    postChannelIndex: 0,
    replyRoleIndex: 0,
    query: "",
    page: 1,
    pageCount: 1,
    total: 0,
    counts: {},
    posts: [],
    loading: false,
    postForm: {
      author: "",
      title: "",
      body: ""
    },
    replyForm: {
      author: "",
      body: ""
    },
    openReplyPostId: ""
  },

  onLoad() {
    this.loadPosts();
  },

  onPullDownRefresh() {
    this.loadPosts(this.data.page).finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  async callApi(payload) {
    const response = await wx.cloud.callFunction({
      name: "githubPosts",
      data: payload
    });
    const result = response.result || {};
    if (result.statusCode && result.statusCode >= 400) {
      throw new Error((result.body && result.body.message) || "请求失败");
    }
    return result.body || result;
  },

  async loadPosts(nextPage) {
    this.setData({ loading: true });
    try {
      const page = nextPage || this.data.page;
      const body = await this.callApi({
        action: "list",
        channel: CHANNELS[this.data.activeChannelIndex],
        query: this.data.query,
        page
      });
      this.setData({
        posts: body.posts || [],
        page: body.page || 1,
        pageCount: body.pageCount || 1,
        total: body.total || 0,
        counts: body.counts || {},
        loading: false
      });
    } catch (error) {
      this.setData({ loading: false });
      wx.showToast({ title: error.message || "加载失败", icon: "none" });
    }
  },

  onChannelChange(event) {
    this.setData({
      activeChannelIndex: Number(event.detail.value),
      page: 1
    });
    this.loadPosts(1);
  },

  onSearchInput(event) {
    this.setData({ query: event.detail.value });
  },

  onSearchConfirm() {
    this.setData({ page: 1 });
    this.loadPosts(1);
  },

  clearSearch() {
    this.setData({ query: "", page: 1 });
    this.loadPosts(1);
  },

  copyLink(event) {
    const type = event.currentTarget.dataset.type;
    const url = type === "assistant" ? ASSISTANT_URL : COMMUNITY_URL;
    wx.setClipboardData({
      data: url,
      success() {
        wx.showToast({ title: "链接已复制", icon: "success" });
      }
    });
  },

  prevPage() {
    if (this.data.page <= 1) return;
    this.loadPosts(this.data.page - 1);
  },

  nextPage() {
    if (this.data.page >= this.data.pageCount) return;
    this.loadPosts(this.data.page + 1);
  },

  onPostRoleChange(event) {
    this.setData({ postRoleIndex: Number(event.detail.value) });
  },

  onPostChannelChange(event) {
    this.setData({ postChannelIndex: Number(event.detail.value) });
  },

  onPostInput(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({ [`postForm.${field}`]: event.detail.value });
  },

  async submitPost() {
    const { postForm, postRoleIndex, postChannelIndex } = this.data;
    if (!postForm.title.trim() || !postForm.body.trim()) {
      wx.showToast({ title: "标题和内容必填", icon: "none" });
      return;
    }
    try {
      await this.callApi({
        action: "createPost",
        role: ROLES[postRoleIndex],
        channel: POST_CHANNELS[postChannelIndex],
        author: postForm.author,
        title: postForm.title,
        body: postForm.body
      });
      wx.showToast({ title: "已发布", icon: "success" });
      this.setData({
        page: 1,
        postForm: { author: "", title: "", body: "" }
      });
      this.loadPosts(1);
    } catch (error) {
      wx.showToast({ title: error.message || "发布失败", icon: "none" });
    }
  },

  toggleReply(event) {
    const postId = event.currentTarget.dataset.id;
    this.setData({
      openReplyPostId: this.data.openReplyPostId === postId ? "" : postId,
      replyForm: { author: "", body: "" }
    });
  },

  onReplyRoleChange(event) {
    this.setData({ replyRoleIndex: Number(event.detail.value) });
  },

  onReplyInput(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({ [`replyForm.${field}`]: event.detail.value });
  },

  async submitReply(event) {
    const postId = event.currentTarget.dataset.id;
    const { replyForm, replyRoleIndex } = this.data;
    if (!replyForm.body.trim()) {
      wx.showToast({ title: "回复内容必填", icon: "none" });
      return;
    }
    try {
      await this.callApi({
        action: "createReply",
        postId,
        role: ROLES[replyRoleIndex],
        author: replyForm.author,
        body: replyForm.body
      });
      wx.showToast({ title: "已回复", icon: "success" });
      this.setData({
        openReplyPostId: "",
        replyForm: { author: "", body: "" }
      });
      this.loadPosts(this.data.page);
    } catch (error) {
      wx.showToast({ title: error.message || "回复失败", icon: "none" });
    }
  }
});
