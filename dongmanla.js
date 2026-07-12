/** @type {import('../venera-configs-main/_venera_.js')} */

/**
 * 动漫啦
 * 搜索 / 分类 / 章节 / 图片（img.dongman.la）
 */
class Dongmanla extends ComicSource {
  name = "动漫啦";
  key = "dongmanla";
  version = "1.0.0";
  minAppVersion = "1.0.0";
  url = "";

  static baseUrl = "https://www.dongman.la";
  static headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "text/html,*/*",
    "Accept-Language": "zh-CN,zh;q=0.9",
  };

  static abs(href) {
    if (!href) return "";
    if (/^https?:/i.test(href)) return href.replace(/^http:/i, "https:");
    try {
      return new URL(href, Dongmanla.baseUrl + "/").href.replace(/^http:/i, "https:");
    } catch (_) {
      return href;
    }
  }

  static parseList(document) {
    let comics = [];
    let seen = {};
    for (let ul of document.querySelectorAll(".cy_list_mh ul")) {
      let a = ul.querySelector("a");
      let titleEl = ul.querySelector(".title") || a;
      if (!a || !titleEl) continue;
      let href = a.attributes["href"] || "";
      let m = href.match(/\/manhua\/detail\/(\d+)/);
      if (!m) continue;
      let id = m[1];
      if (seen[id]) continue;
      seen[id] = true;
      let img = ul.querySelector("img");
      let cover = "";
      if (img) cover = img.attributes["data-src"] || img.attributes["src"] || "";
      comics.push(
        new Comic({
          id,
          title: titleEl.text.trim(),
          cover: Dongmanla.abs(cover),
        })
      );
    }
    return comics;
  }

  explore = [
    {
      title: "连载",
      type: "multiPageComicList",
      load: async (page) => {
        page = page || 1;
        let url = `${Dongmanla.baseUrl}/manhua/serial/${page}.html`;
        let res = await Network.get(url, Dongmanla.headers);
        if (res.status !== 200) throw `Invalid status: ${res.status}`;
        let document = new HtmlDocument(res.body);
        let comics = Dongmanla.parseList(document);
        return { comics, maxPage: comics.length > 0 ? page + 1 : page };
      },
    },
    {
      title: "完结",
      type: "multiPageComicList",
      load: async (page) => {
        page = page || 1;
        let url = `${Dongmanla.baseUrl}/manhua/finish/${page}.html`;
        let res = await Network.get(url, Dongmanla.headers);
        if (res.status !== 200) throw `Invalid status: ${res.status}`;
        let document = new HtmlDocument(res.body);
        let comics = Dongmanla.parseList(document);
        return { comics, maxPage: comics.length > 0 ? page + 1 : page };
      },
    },
  ];

  search = {
    load: async (keyword, options, page) => {
      page = page || 1;
      let url = `${Dongmanla.baseUrl}/manhua/so/${encodeURIComponent(
        keyword
      )}/${page}.html`;
      let res = await Network.get(url, Dongmanla.headers);
      if (res.status !== 200) throw `Invalid status: ${res.status}`;
      let document = new HtmlDocument(res.body);
      let comics = Dongmanla.parseList(document);
      return { comics, maxPage: comics.length > 0 ? page + 1 : page };
    },
    optionList: [],
  };

  comic = {
    loadInfo: async (id) => {
      id = String(id);
      let url = `${Dongmanla.baseUrl}/manhua/detail/${id}/`;
      let res = await Network.get(url, Dongmanla.headers);
      if (res.status !== 200) throw `Invalid status: ${res.status}`;
      let document = new HtmlDocument(res.body);
      let titleEl = document.querySelector(".cy_title h1, h1");
      let title = titleEl ? titleEl.text.trim() : id;
      let coverEl = document.querySelector(".cy_info_cover img, img");
      let cover = "";
      if (coverEl) {
        cover = coverEl.attributes["data-src"] || coverEl.attributes["src"] || "";
      }
      let introEl = document.querySelector(".cy_desc, .desc, .intro");
      let description = introEl ? introEl.text.trim() : "";

      let chapters = new Map();
      let items = [];
      for (let a of document.querySelectorAll(".cy_plist li a, .cy_plist a")) {
        let href = a.attributes["href"] || "";
        let m = href.match(/\/manhua\/chapter\/\d+\/(\d+)/);
        if (!m) continue;
        let name = (a.text || "").trim();
        if (!name) continue;
        items.push([m[1], name]);
      }
      // DOM often newest-first
      items.reverse();
      for (let [cid, name] of items) {
        chapters.set(cid, name);
      }

      return new ComicDetails({
        title,
        cover: Dongmanla.abs(cover),
        description,
        tags: {},
        chapters,
      });
    },

    loadEp: async (comicId, epId) => {
      let url = `${Dongmanla.baseUrl}/manhua/chapter/${comicId}/${epId}/`;
      let res = await Network.get(url, Dongmanla.headers);
      if (res.status !== 200) throw `Invalid status: ${res.status}`;
      let html = res.body;
      let re = /https:\/\/img\.dongman\.la\/[^\s"'<>]+/g;
      let seen = {};
      let images = [];
      let x;
      while ((x = re.exec(html)) !== null) {
        let u = x[0];
        if (seen[u]) continue;
        seen[u] = true;
        images.push(u);
      }
      images.sort();
      if (images.length < 1) throw "No images";
      return { images };
    },

    onImageLoad: (url, comicId, epId) => {
      return {
        headers: {
          Referer: Dongmanla.baseUrl + "/",
          "User-Agent": Dongmanla.headers["User-Agent"],
        },
      };
    },
  };
}
