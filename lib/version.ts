/**
 * 與 package.json version 同步，部署後可在畫面上確認版本。
 * 每次 release 由 scripts/bump-and-push.js 更新版本號與發佈時間。
 */
export const APP_VERSION = "0.1.3";
/** 最近一次發佈時間（精準到分），由 bump-and-push 腳本寫入 */
export const RELEASE_TIME = "2025-02-14 00:00";
