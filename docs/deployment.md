# 部署 / Deployment

`npm run build` 生成纯静态站点 `dist/`（默认子路径 `/oioi-wordtalk/`，约 650 MB，含全部插画与音频）。

## GitHub Pages（默认）

`.github/workflows/pages.yml` 在推送到 `main` 时自动构建并部署，并检查 `dist/` 是否低于 GitHub Pages 的 1 GB 上限。首次需在仓库 Settings → Pages → Source 选 “GitHub Actions”。

在线地址：<https://2023anita.github.io/oioi-wordtalk/>

## 其他托管 / 根路径

```bash
ATLAS_BASE=/ npm run build
```

## 本地快速检查（不复制媒体）

```bash
npm run build:check   # SKIP_PUBLIC_COPY=1，只验证类型与打包
```

## 体积说明

插画按需懒加载（每个词卡打开时才请求），Service Worker 最多缓存 1500 个媒体文件。iOS 包不内置媒体，改从 Pages 在线加载（`VITE_MEDIA_BASE`）。
