/**
 * 與 package.json version 同步，部署後可在畫面上確認版本。
 * 每次 release 由 scripts/bump-and-push.js 更新版本號與發佈時間。
 */
export const APP_VERSION = "2.0.24";
/** 最近一次發佈時間（精準到分），由 bump-and-push 腳本寫入 */
export const RELEASE_TIME = "2026-02-14 20:35";
