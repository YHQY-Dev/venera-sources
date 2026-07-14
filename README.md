# Venera 书源（venera-sources）

可直接导入 [Venera](https://github.com/venera-app/venera) 的 ComicSource 脚本集合。

当前共 **29** 个源，清单以 `index.json` 为准。收录标准为本地 Probe-A：探索/搜索 → 详情 → 章节 → ≥3 张真实图片。

## 导入

1. 打开 Venera → **设置** → **漫画源**
2. 选择「从文件导入」，选中本目录下的 `.js`（可多选）
3. 部分源需在源设置里填写域名 / API / 账号（如紳士漫畫分流等）

> 国内部分站点可能需系统代理；应用内一般跟随系统网络。

## 目录结构

```
venera-sources/
  index.json     # 源清单（name / key / fileName / version / description）
  *.js           # ComicSource 脚本
  README.md
```

## 源列表

| 文件 | key | 版本 | 名称 | 说明 |
|------|-----|------|------|------|
| `mkzhan.js` | `mkzhan` | 1.0.1 | 漫客栈 | 搜索 / 热门 / 章节 / 图片 |
| `dongmanla.js` | `dongmanla` | 1.0.0 | 动漫啦 | 搜索 / 连载完结分类 / 章节 / 图片 |
| `manhuagui.js` | `manhuagui` | 1.2.2 | 漫画柜 | 列表 / 搜索 / LZString 图片解码 |
| `mangabz.js` | `mangabz` | 1.0.0 | Mangabz | 列表 / 搜索 / chapterimage.ashx |
| `manben.js` | `manben` | 1.0.0 | 漫本 | dm5 系 packed newImgs |
| `dm5.js` | `dm5` | 1.0.0 | 动漫屋 | dm5 系 packed newImgs |
| `xmanhua.js` | `xmanhua` | 1.0.0 | X漫画 | Mangabz 同系 ashx |
| `sisimanhua.js` | `sisimanhua` | 1.0.0 | 思思漫画 | qTcms base64 图片 |
| `pknbc.js` | `pknbc` | 1.0.0 | 漫小肆 | /book/ + 顺序图 |
| `zaimanhua.js` | `zaimanhua` | 1.0.2 | 再漫画 | 官方配置 |
| `hcomic.js` | `hcomic` | 1.0.0 | H-Comic | 官方配置 |
| `jcomic.js` | `jcomic` | 1.0.0 | jcomic.net | 官方配置 |
| `manhuaren.js` | `manhuaren` | 1.0.0 | 漫画人 | 官方配置（dm5 系） |
| `hot_manga.js` | `hot_manga` | 1.0.0 | 热辣漫画 | 官方配置 |
| `comick.js` | `comick` | 1.2.0 | comick | 官方配置 |
| `mhkan.js` | `mhkan` | 1.0.0 | 漫画看 | 列表 / 搜索 / reader-image（wmh1234） |
| `remenmanhua.js` | `remenmanhua` | 1.0.0 | 热门漫画 | 列表 /comic/ + 章节 API 图片 |
| `manhuapi.js` | `manhuapi` | 1.0.0 | 漫画皮 | 列表 /manhua/ + chapter jhc-data 图片 |
| `isamanhua.js` | `isamanhua` | 1.0.0 | 爱飒漫画 | 跳转看漫；getchapterlist / getchapterinfov2 |
| `kanman.js` | `kanman` | 1.0.0 | 看漫画 | 列表 / 章节 API / chapter_img_list |
| `mh18.js` | `mh18` | 1.0.0 | 18漫画 | 官方配置；列表 / 搜索 / 章节图片 |
| `ccc.js` | `ccc` | 1.0.1 | CCC追漫台 | 官方配置；台湾 CCC API |
| `mxs.js` | `mxs` | 1.0.0 | 漫小肆 | 官方配置；列表 / 搜索 / lazy 图片 |
| `baozi.js` | `baozi` | 1.1.7 | 包子漫画 | 官方配置；默认 baozimhcn.com / 网页章节图；CDN 含 s1/s2.bzcdn.net |
| `wnacg.js` | `wnacg` | 1.0.5 | 紳士漫畫 | 官方配置；默认镜像域名 / 单册章节 |
| `jm.js` | `jm` | 1.4.0 | 禁漫天堂 | 官方配置；更新 API 域名池与 APP 版本 |
| `ehentai.js` | `ehentai` | 1.2.0 | ehentai | 官方配置；列表 / 搜索 / 画廊图片 |
| `manwa.js` | `manwa` | 1.1.6 | 漫蛙 | 推荐 / 搜索 / 章节 / AES 图片 |
| `rumanhua.js` | `rumanhua` | 1.1.0 | 如漫画 | 列表 / 章节 / AES 解密图片 |
| `bukamh.js` | `bukamh` | 1.0.0 | 布卡漫画 | 最新热门 / AES params |
| `cycomic.js` | `cycomic` | 1.0.0 | 次元漫画 | 更新榜 / 搜索 / 直链图 |

## 说明

- 源站随时可能改版、换域或加盾；失效时请更新脚本或换分流域名。
- `pknbc` 与 `mxs` 名称均含「漫小肆」，key/域名不同，请按需选用。
- 未收录站点多为 Cloudflare 403、需登录、自建演示站不可用或 API 已废弃，详见仓库 `reports/` 摘要。
