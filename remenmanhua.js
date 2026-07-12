/** @type {import('../venera-configs-main/_venera_.js')} */

/**
 * 热门漫画
 * 列表 /comic/{id}，章节 /view/{id}.html，图片 API /e/extend/api/index.php
 */
class Remenmanhua extends ComicSource {
  name = "热门漫画";
  key = "remenmanhua";
  version = "1.0.0";
  minAppVersion = "1.0.0";
  url = "";

  static baseUrl = "http://m.remenmanhua.com";
  static headers = {
    "User-Agent":
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
    Accept: "text/html,*/*",
    "Accept-Language": "zh-CN,zh;q=0.9",
  };

  static abs(href) {
    if (!href) return "";
    if (href.startsWith("//")) return "https:" + href;
    if (/^https?:/i.test(href)) return href;
    try {
      return new URL(href, Remenmanhua.baseUrl + "/").href;
    } catch (_) {
      return href;
    }
  }

  static parseList(document) {
    let comics = [];
    let seen = {};
    for (let a of document.querySelectorAll("a[href*='/comic/']")) {
      let href = a.attributes["href"] || "";
      let m = href.match(/\/comic\/(\d+)/);
      if (!m) continue;
      let id = m[1];
      if (seen[id]) continue;
      let img = a.querySelector("img");
      let cover = "";
      let title = (a.attributes["title"] || "").trim();
      if (img) {
        cover = img.attributes["data-src"] || img.attributes["src"] || "";
        if (!title) title = (img.attributes["alt"] || "").trim();
      }
      if (!title) {
        title = (a.text || "")
          .trim()
          .replace(/\s+/g, " ")
          .replace(/18\+.*$/i, "")
          .replace(/\|.*$/, "")
          .trim();
      }
      if (!title || title.length < 1) continue;
      if (/^[\d\s|+話话連載连载完結完结限免中]*$/i.test(title)) continue;
      seen[id] = true;
      comics.push(new Comic({ id, title, cover: Remenmanhua.abs(cover) }));
    }
    return comics;
  }

  explore = [
    {
      title: "热门漫画",
      type: "multiPageComicList",
      load: async (page) => {
        page = page || 1;
        let url =
          page <= 1
            ? `${Remenmanhua.baseUrl}/`
            : `${Remenmanhua.baseUrl}/cate/?page=${page}`;
        let res = await Network.get(url, Remenmanhua.headers);
        if (res.status !== 200) throw `Invalid status: ${res.status}`;
        let document = new HtmlDocument(res.body);
        let comics = Remenmanhua.parseList(document);
        return { comics, maxPage: comics.length > 0 ? page + 1 : page };
      },
    },
  ];

  search = {
    load: async (keyword, options, page) => {
      page = page || 1;
      let body = `show=title,ftitle,author,body&tbname=comic&tempid=1&keyboard=${encodeURIComponent(
        keyword
      )}`;
      let res = await Network.post(
        `${Remenmanhua.baseUrl}/e/search/`,
        {
          ...Remenmanhua.headers,
          "Content-Type": "application/x-www-form-urlencoded",
          Referer: Remenmanhua.baseUrl + "/",
        },
        body
      );
      if (res.status !== 200) throw `Invalid status: ${res.status}`;
      let document = new HtmlDocument(res.body);
      let comics = Remenmanhua.parseList(document);
      return { comics, maxPage: comics.length > 0 ? page + 1 : page };
    },
    optionList: [],
  };

  comic = {
    loadInfo: async (id) => {
      id = String(id).replace(/\D/g, "");
      let url = `${Remenmanhua.baseUrl}/comic/${id}`;
      let res = await Network.get(url, Remenmanhua.headers);
      if (res.status !== 200) throw `Invalid status: ${res.status}`;
      let document = new HtmlDocument(res.body);
      let titleEl = document.querySelector("h1.title, article h1, h1");
      let title = titleEl ? titleEl.text.trim() : "";
      title = title.replace(/^漫画名称[：:]/, "").trim();
      if (!title || title.length < 1) {
        let t = (res.body.match(/<title[^>]*>([^<]+)/i) || [])[1] || id;
        title = t.split("|")[0].trim() || id;
      }
      let coverEl = document.querySelector(".cover img, .book-cover img, img.lazyload, img");
      let cover = "";
      if (coverEl) {
        cover = coverEl.attributes["data-src"] || coverEl.attributes["src"] || "";
      }
      let chapters = new Map();
      let items = [];
      let seen = {};
      for (let a of document.querySelectorAll("a[href*='/view/']")) {
        let href = a.attributes["href"] || "";
        let m = href.match(/\/view\/(\d+)\.html/);
        if (!m) continue;
        let cid = m[1];
        if (seen[cid]) continue;
        let name = (a.text || "").trim().replace(/\s+/g, " ");
        if (/開始閱讀|开始阅读|加入|書架/i.test(name)) continue;
        // 列表项通常含「第 N 话」
        if (!/第\s*\d+\s*话|第\s*\d+\s*話/i.test(name) && name.length > 40) continue;
        seen[cid] = true;
        if (!name || name.length < 1) name = `话 ${cid}`;
        items.push([cid, name]);
      }
      for (let [cid, name] of items) chapters.set(cid, name);
      return new ComicDetails({
        title,
        cover: Remenmanhua.abs(cover),
        description: "",
        tags: {},
        chapters,
      });
    },

    loadEp: async (comicId, epId) => {
      epId = String(epId).replace(/\D/g, "");
      let pageUrl = `${Remenmanhua.baseUrl}/view/${epId}.html`;
      let res = await Network.get(pageUrl, {
        ...Remenmanhua.headers,
        Referer: `${Remenmanhua.baseUrl}/comic/${comicId}`,
      });
      if (res.status !== 200) throw `Invalid status: ${res.status}`;
      let html = res.body;
      let id = (html.match(/id=["']id["'][^>]*value=["'](\d+)["']/i) ||
        html.match(/value=["'](\d+)["'][^>]*id=["']id["']/i) ||
        [])[1];
      let zid = (html.match(/id=["']zid["'][^>]*value=["'](\d+)["']/i) ||
        html.match(/value=["'](\d+)["'][^>]*id=["']zid["']/i) ||
        [])[1];
      let nid = (html.match(/id=["']numid["'][^>]*value=["'](\d+)["']/i) ||
        html.match(/value=["'](\d+)["'][^>]*id=["']numid["']/i) ||
        [])[1];
      if (!id) id = epId;
      if (!zid) zid = String(comicId).replace(/\D/g, "");
      if (!nid) nid = "1";
      let api = `${Remenmanhua.baseUrl}/e/extend/api/index.php?type=chapter&filter=info&id=${id}&zid=${zid}&nid=${nid}`;
      let apiRes = await Network.get(api, {
        ...Remenmanhua.headers,
        Accept: "application/json,*/*",
        Referer: pageUrl,
      });
      if (apiRes.status !== 200) throw `Invalid status: ${apiRes.status}`;
      let data;
      try {
        data = JSON.parse(apiRes.body);
      } catch (_) {
        throw "chapter api json parse failed";
      }
      let images = [];
      let seen = {};
      for (let block of data.data || []) {
        for (let it of block.list || []) {
          let u = Remenmanhua.abs(it.img || "");
          if (!u || seen[u]) continue;
          // 付费试看占位 / 站点皮肤图
          if (/\/skin\/images\//i.test(u) || /shikan|vip\d*\.png/i.test(u)) continue;
          seen[u] = true;
          images.push(u);
        }
      }
      if (images.length < 1) throw "No images (paywalled or empty)";
      return { images };
    },

    onImageLoad: (url, comicId, epId) => {
      return {
        headers: {
          Referer: Remenmanhua.baseUrl + "/",
          "User-Agent": Remenmanhua.headers["User-Agent"],
        },
      };
    },
  };
}
