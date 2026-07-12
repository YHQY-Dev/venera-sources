# Venera 书源（venera-sources）

可直接导入 [Venera](https://github.com/venera-app/venera) 的 ComicSource 脚本集合。

当前共 **48** 个源，清单以 `index.json` 为准。收录标准为本地 Probe-A：探索/搜索 → 详情 → 章节 → ≥3 张真实图片。

## 导入

1. 打开 Venera → **设置** → **漫画源**
2. 选择「从文件导入」，选中本目录下的 `.js`（可多选）
3. 部分源需在源设置里填写域名 / API / 账号（如 Lanraragi、紳士漫畫分流等）

> 国内部分站点可能需系统代理；应用内一般跟随系统网络。

## 目录结构

```
venera-sources/
  index.json     # 源清单（name / key / filename / version / description）
  *.js           # ComicSource 脚本
  README.md
```

## 源列表

| 文件 | key | 版本 | 名称 | 说明 |
|------|-----|------|------|------|
| `mkzhan.js` | `mkzhan` | 1.0.1 | 漫客栈 | 搜索 / 热门 / 章节 / 图片 |
| `zymk.js` | `zymk` | 1.0.1 | 知音漫客 | 分类浏览 / 章节 / 图片；站内搜索页当前不可用 |
| `dongmanla.js` | `dongmanla` | 1.0.0 | 动漫啦 | 搜索 / 连载完结分类 / 章节 / 图片 |
| `manhuagui.js` | `manhuagui` | 1.2.2 | 漫画柜 | 列表 / 搜索 / LZString 图片解码 |
| `mangabz.js` | `mangabz` | 1.0.0 | Mangabz | 列表 / 搜索 / chapterimage.ashx |
| `manben.js` | `manben` | 1.0.0 | 漫本 | dm5 系 packed newImgs |
| `dm5.js` | `dm5` | 1.0.0 | 动漫屋 | dm5 系 packed newImgs |
| `xmanhua.js` | `xmanhua` | 1.0.0 | X漫画 | Mangabz 同系 ashx |
| `sisimanhua.js` | `sisimanhua` | 1.0.0 | 思思漫画 | qTcms base64 图片 |
| `onekkk.js` | `onekkk` | 1.0.1 | 极速漫画 | chapterfun.ashx |
| `pknbc.js` | `pknbc` | 1.0.0 | 漫小肆 | /book/ + 顺序图 |
| `zaimanhua.js` | `zaimanhua` | 1.0.2 | 再漫画 | 官方配置 |
| `hcomic.js` | `hcomic` | 1.0.0 | H-Comic | 官方配置 |
| `jcomic.js` | `jcomic` | 1.0.0 | jcomic.net | 官方配置 |
| `komiic.js` | `Komiic` | 1.0.3 | Komiic | 官方配置 |
| `manhuaren.js` | `manhuaren` | 1.0.0 | 漫画人 | 官方配置（dm5 系） |
| `ykmh.js` | `ykmh` | 1.0.1 | 优酷漫画 | 官方配置；首页解析含宽松兜底 |
| `hot_manga.js` | `hot_manga` | 1.0.0 | 热辣漫画 | 官方配置 |
| `comick.js` | `comick` | 1.2.0 | comick | 官方配置 |
| `mhkan.js` | `mhkan` | 1.0.0 | 漫画看 | 列表 / 搜索 / reader-image（wmh1234） |
| `gamersky.js` | `gamersky` | 1.0.0 | 动漫星空 | 游民星空 ACG 漫画栏目 |
| `remenmanhua.js` | `remenmanhua` | 1.0.0 | 热门漫画 | 列表 /comic/ + 章节 API 图片 |
| `manhuapi.js` | `manhuapi` | 1.0.0 | 漫画皮 | 列表 /manhua/ + chapter jhc-data 图片 |
| `bh3.js` | `bh3` | 1.0.0 | 崩坏3漫画 | 米哈游官方漫画 data-original |
| `lieqiman.js` | `lieqiman` | 1.0.0 | 猎奇漫画 | 单页全集 pic.lieqimh.com |
| `mangadex.js` | `mangadex` | 1.0.0 | MangaDex | API 列表 / 搜索 / at-home 图片 |
| `manhua168.js` | `manhua168` | 1.0.0 | 168漫画 | 列表 / 搜索 / 章节 API 试看图 |
| `isamanhua.js` | `isamanhua` | 1.0.0 | 爱飒漫画 | 跳转看漫；getchapterlist / getchapterinfov2 |
| `kanman.js` | `kanman` | 1.0.0 | 看漫画 | 列表 / 章节 API / chapter_img_list |
| `mh18.js` | `mh18` | 1.0.0 | 18漫画 | 官方配置；列表 / 搜索 / 章节图片 |
| `lanraragi.js` | `lanraragi` | 1.2.0 | Lanraragi | 官方配置；默认公共演示站，可改 API |
| `ccc.js` | `ccc` | 1.0.1 | CCC追漫台 | 官方配置；台湾 CCC API |
| `mxs.js` | `mxs` | 1.0.0 | 漫小肆 | 官方配置；列表 / 搜索 / lazy 图片 |
| `manwaba.js` | `manwaba` | 1.0.3 | 漫蛙吧 | 官方配置；mwuu.cc API |
| `baihehui.js` | `baihehui` | 1.0.0 | 百合会 | 官方配置；yamibo.com |
| `baozi.js` | `baozi` | 1.1.6 | 包子漫画 | 官方配置；默认 baozimhcn.com / 网页章节图 |
| `godamh.js` | `godamh` | 1.3.0 | Goda 漫画 | G站列表 / 搜索 / v2 章节图解密 |
| `wnacg.js` | `wnacg` | 1.0.5 | 紳士漫畫 | 官方配置；默认镜像域名 / 单册章节 |
| `jm.js` | `jm` | 1.4.0 | 禁漫天堂 | 官方配置；更新 API 域名池与 APP 版本 |
| `ehentai.js` | `ehentai` | 1.2.0 | ehentai | 官方配置；列表 / 搜索 / 画廊图片 |
| `hitomi.js` | `hitomi` | 1.1.2 | hitomi.la | 官方配置；标签索引 / 搜索 / 图片 |
| `nhentai.js` | `nhentai` | 1.0.8 | nhentai | 官方配置；搜索 / 画廊 API 图片 |
| `manga_dex.js` | `manga_dex` | 1.1.1 | MangaDex (官方) | 官方配置；API 列表 / 搜索 / at-home 图片 |
| `manhwa18cc.js` | `manhwa18cc` | 1.0.8 | Manhwa18cc | 韩漫 raw 列表 / 章节 / 图片 |
| `manwa.js` | `manwa` | 1.1.6 | 漫蛙 | 推荐 / 搜索 / 章节 / AES 图片 |
| `webtoon.js` | `webtoon` | 1.1.1 | Webtoon | 官方配置；多语言 Webtoon 列表 / 搜索 / 章节图片 |
| `comic_walker.js` | `comic_walker` | 1.0.0 | カドコミ | 官方配置；首页 / 搜索 / DRM 解密图片 |
| `rumanhua.js` | `rumanhua` | 1.1.0 | 如漫画 | 列表 / 章节 / AES 解密图片 |


## 说明

- 源站随时可能改版、换域或加盾；失效时请更新脚本或换分流域名。
- `mangadex.js`（自定义）与 `manga_dex.js`（官方配置）可并存，key 不同。
- `pknbc` 与 `mxs` 名称均含「漫小肆」，key/域名不同，请按需选用。
- 未收录站点多为 Cloudflare 403、需登录、自建演示站不可用或 API 已废弃，详见仓库 `reports/` 摘要。
