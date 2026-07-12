/** @type {import('../venera-configs-main/_venera_.js')} */

/**
 * 漫画看（m.mhkan.com → m.wmh1234.com）
 * 列表/搜索 HTML + 章节页 reader-image data-src
 */
class Mhkan extends ComicSource {
  name = "漫画看";
  key = "mhkan";
  version = "1.0.0";
  minAppVersion = "1.0.0";
  url = "";

  static baseUrl = "https://m.wmh1234.com";
  static headers = {
    "User-Agent":
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
    Accept: "text/html,*/*",
    "Accept-Language": "zh-CN,zh;q=0.9",
  };

  static abs(href) {
    if (!href) return "";
    if (/^https?:/i.test(href)) return href;
    try {
      return new URL(href, Mhkan.baseUrl + "/").href;
    } catch (_) {
      return href;
    }
  }

  static parseList(document) {
    let comics = [];
    let seen = {};
    for (let card of document.querySelectorAll("article.comic-card, .comic-card")) {
      let a = card.querySelector("a.comic-card__link, a[href*='/comic/']");
      if (!a) continue;
      let href = a.attributes["href"] || "";
      let m = href.match(/\/comic\/(\d+)\.html/i);
      if (!m) continue;
      let id = m[1];
      if (seen[id]) continue;
      seen[id] = true;
      let titleEl = card.querySelector(".comic-card__title, h3, h2");
      let title = titleEl ? titleEl.text.trim() : "";
      let img = card.querySelector("img");
      let cover = "";
      if (img) {
        cover = img.attributes["data-src"] || img.attributes["src"] || "";
        if (!title) title = (img.attributes["alt"] || "").trim();
      }
      if (!title) title = id;
      if (/placeholder\.svg/i.test(cover)) cover = img ? img.attributes["data-src"] || "" : "";
      comics.push(new Comic({ id, title, cover: Mhkan.abs(cover) }));
    }
    if (comics.length) return comics;
    for (let a of document.querySelectorAll("a[href*='/comic/']")) {
      let href = a.attributes["href"] || "";
      let m = href.match(/\/comic\/(\d+)\.html/i);
      if (!m) continue;
      let id = m[1];
      if (seen[id]) continue;
      let img = a.querySelector("img");
      let title = "";
      let cover = "";
      if (img) {
        cover = img.attributes["data-src"] || img.attributes["src"] || "";
        title = (img.attributes["alt"] || "").trim();
      }
      if (!title) title = (a.attributes["title"] || a.text || "").trim().replace(/\s+/g, " ");
      if (!title || /开始阅读|查看更多/i.test(title)) continue;
      seen[id] = true;
      comics.push(new Comic({ id, title, cover: Mhkan.abs(cover) }));
    }
    return comics;
  }

  explore = [
    {
      title: "漫画看",
      type: "multiPageComicList",
      load: async (page) => {
        page = page || 1;
        let url =
          page <= 1 ? `${Mhkan.baseUrl}/` : `${Mhkan.baseUrl}/?page=${page}`;
        let res = await Network.get(url, Mhkan.headers);
        if (res.status !== 200) throw `Invalid status: ${res.status}`;
        let document = new HtmlDocument(res.body);
        let comics = Mhkan.parseList(document);
        return { comics, maxPage: comics.length > 0 ? page + 1 : page };
      },
    },
    {
      title: "分类",
      type: "multiPageComicList",
      load: async (page) => {
        page = page || 1;
        let url =
          page <= 1
            ? `${Mhkan.baseUrl}/category/`
            : `${Mhkan.baseUrl}/category/?page=${page}`;
        let res = await Network.get(url, Mhkan.headers);
        if (res.status !== 200) throw `Invalid status: ${res.status}`;
        let document = new HtmlDocument(res.body);
        let comics = Mhkan.parseList(document);
        return { comics, maxPage: comics.length > 0 ? page + 1 : page };
      },
    },
  ];

  search = {
    load: async (keyword, options, page) => {
      page = page || 1;
      let url = `${Mhkan.baseUrl}/search/?keywords=${encodeURIComponent(
        keyword
      )}&page=${page}`;
      let res = await Network.get(url, Mhkan.headers);
      if (res.status !== 200) throw `Invalid status: ${res.status}`;
      let document = new HtmlDocument(res.body);
      let comics = Mhkan.parseList(document);
      return { comics, maxPage: comics.length > 0 ? page + 1 : page };
    },
    optionList: [],
  };

  comic = {
    loadInfo: async (id) => {
      id = String(id).replace(/\D/g, "");
      let url = `${Mhkan.baseUrl}/comic/${id}.html`;
      let res = await Network.get(url, Mhkan.headers);
      if (res.status !== 200) throw `Invalid status: ${res.status}`;
      let document = new HtmlDocument(res.body);
      let titleEl = document.querySelector("h1, .comic-title, .detail-title");
      let title = titleEl ? titleEl.text.trim() : id;
      let coverEl = document.querySelector(
        ".comic-cover img, .detail-cover img, .cover img, img.lazy"
      );
      let cover = "";
      if (coverEl) {
        cover = coverEl.attributes["data-src"] || coverEl.attributes["src"] || "";
      }
      let chapters = new Map();
      let items = [];
      let seen = {};
      for (let a of document.querySelectorAll("a[href*='/comic/']")) {
        let href = a.attributes["href"] || "";
        let m = href.match(new RegExp(`/comic/${id}/(\\d+)\\.html`, "i"));
        if (!m) continue;
        let cid = m[1];
        if (seen[cid]) continue;
        seen[cid] = true;
        let nameEl = a.querySelector(".chapter-title");
        let name = nameEl
          ? nameEl.text.trim()
          : (a.text || "").trim().replace(/\s+/g, " ");
        if (!name || /开始阅读|继续阅读/i.test(name)) name = cid;
        items.push([cid, name || cid]);
      }
      for (let [cid, name] of items) chapters.set(cid, name);
      return new ComicDetails({
        title,
        cover: Mhkan.abs(cover),
        description: "",
        tags: {},
        chapters,
      });
    },

    loadEp: async (comicId, epId) => {
      comicId = String(comicId).replace(/\D/g, "");
      epId = String(epId).replace(/\D/g, "");
      let url = `${Mhkan.baseUrl}/comic/${comicId}/${epId}.html`;
      let res = await Network.get(url, {
        ...Mhkan.headers,
        Referer: `${Mhkan.baseUrl}/comic/${comicId}.html`,
      });
      if (res.status !== 200) throw `Invalid status: ${res.status}`;
      let document = new HtmlDocument(res.body);
      let images = [];
      let seen = {};
      for (let img of document.querySelectorAll("img.reader-image, img.lazy, img")) {
        let u = img.attributes["data-src"] || img.attributes["src"] || "";
        if (!u || /placeholder\.svg|logo|icon/i.test(u)) continue;
        if (!/\.(jpg|jpeg|png|webp)/i.test(u) && !/UploadFiles|wszwhg/i.test(u)) continue;
        u = Mhkan.abs(u);
        if (seen[u]) continue;
        seen[u] = true;
        images.push(u);
      }
      if (images.length < 1) throw "No images";
      return { images };
    },

    onImageLoad: (url, comicId, epId) => {
      return {
        headers: {
          Referer: Mhkan.baseUrl + "/",
          "User-Agent": Mhkan.headers["User-Agent"],
        },
      };
    },
  };
}
