App({
  onLaunch() {
    wx.cloud.init({
      env: "YOUR_CLOUD_ENV_ID",
      traceUser: true
    });
  }
});
