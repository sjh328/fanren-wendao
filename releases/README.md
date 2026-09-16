# releases/ —— 历史版本可玩快照

- 每个版本发布时由 `npm run release -- v<N>` 自动生成一个子目录 `v<N>/`，
  内含该版本完整可玩本体（`index.html + game.js + style.css + sw.js + manifest.webmanifest + icons/ + README.md`）。
- **历史快照一经发布永不改动、永不删除**——想玩旧版本，直接用本地静态服务器指向对应子目录即可，例如：
  `node server.mjs` 的根目录是本项目根；旧版可临时 `cd releases/v30 && npx serve .` 或任意静态服务器打开 `index.html`。
- 规范全文见根目录 `AGENTS.md` 的「版本发布硬性规范」。
