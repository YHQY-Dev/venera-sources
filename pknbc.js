/** @type {import('../venera-configs-main/_venera_.js')} */

/**
 * 漫小肆
 * 列表 /book/{id}，章节 /chapter/{id}，页面内顺序图片
 */
class Pknbc extends ComicSource {
  name = "漫小肆";
  key = "pknbc";
  version = "1.0.0";
  minAppVersion = "1.0.0";
  url = "";

  static baseUrl = "https://www.pknbc.com";
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
      return new URL(href, Pknbc.baseUrl + "/").href.replace(/^http:/i, "https:");
    } catch (_) {
      return href;
    }
  }

  static parseList(document) {
    let comics = [];
    let seen = {};
    for (let a of document.querySelectorAll("a[href*='/book/']")) {
      let href = a.attributes["href"] || "";
      let m = href.match(/\/book\/(\d+)/);
      if (!m) continue;
      let id = m[1];
      if (seen[id]) continue;
      let title = (a.attributes["title"] || a.text || "").trim().replace(/\s+/g, " ");
      let img = a.querySelector("img");
      let cover = "";
      if (img) {
        cover = img.attributes["data-src"] || img.attributes["src"] || "";
        if (!title) title = (img.attributes["alt"] || "").trim();
      }
      if (!title || title.length < 1) continue;
      if (/App|下载|安装/i.test(title) && title.length < 8) continue;
      seen[id] = true;
      comics.push(new Comic({ id, title, cover: Pknbc.abs(cover) }));
    }
    return comics;
  }

  explore = [
    {
      title: "漫小肆",
      type: "multiPageComicList",
      load: async (page) => {
        page = page || 1;
        let url = page <= 1 ? `${Pknbc.baseUrl}/` : `${Pknbc.baseUrl}/?page=${page}`;
        let res = await Network.get(url, Pknbc.headers);
        if (res.status !== 200) throw `Invalid status: ${res.status}`;
        let document = new HtmlDocument(res.body);
        let comics = Pknbc.parseList(document);
        return { comics, maxPage: comics.length > 0 ? page + 1 : page };
      },
    },
  ];

  search = {
    load: async (keyword, options, page) => {
      page = page || 1;
      let url = `${Pknbc.baseUrl}/search?keyword=${encodeURIComponent(keyword)}&page=${page}`;
      let res = await Network.get(url, Pknbc.headers);
      if (res.status !== 200) throw `Invalid status: ${res.status}`;
      let document = new HtmlDocument(res.body);
      let comics = Pknbc.parseList(document);
      return { comics, maxPage: comics.length > 0 ? page + 1 : page };
    },
    optionList: [],
  };

  comic = {
    loadInfo: async (id) => {
      id = String(id).replace(/\D/g, "");
      let url = `${Pknbc.baseUrl}/book/${id}`;
      let res = await Network.get(url, Pknbc.headers);
      if (res.status !== 200) throw `Invalid status: ${res.status}`;
      let document = new HtmlDocument(res.body);
      let titleEl = document.querySelector("h1, .title, .book-title");
      let title = titleEl ? titleEl.text.trim() : id;
      let coverEl = document.querySelector(".cover img, .book-cover img, img");
      let cover = "";
      if (coverEl) {
        cover = coverEl.attributes["data-src"] || coverEl.attributes["src"] || "";
      }
      let chapters = new Map();
      let items = [];
      let seen = {};
      for (let a of document.querySelectorAll("a[href*='/chapter/']")) {
        let href = a.attributes["href"] || "";
        let m = href.match(/\/chapter\/(\d+)/);
        if (!m) continue;
        let cid = m[1];
        if (seen[cid]) continue;
        seen[cid] = true;
        let name = (a.text || "").trim().replace(/\s+/g, " ");
        if (!name || /开始阅读|开始阅读/.test(name)) name = cid;
        items.push([cid, name || cid]);
      }
      for (let [cid, name] of items) chapters.set(cid, name);
      return new ComicDetails({
        title,
        cover: Pknbc.abs(cover),
        description: "",
        tags: {},
        chapters,
      });
    },

    loadEp: async (comicId, epId) => {
      let churl = `${Pknbc.baseUrl}/chapter/${epId}`;
      let res = await Network.get(churl, {
        ...Pknbc.headers,
        Referer: `${Pknbc.baseUrl}/book/${comicId}`,
      });
      if (res.status !== 200) throw `Invalid status: ${res.status}`;
      let html = res.body;
      let images = [];
      let seen = {};
      let re = /https?:\/\/[^"'\\\s]+\/static\/upload\/book\/\d+\/\d+\/\d+\.(?:jpg|jpeg|png|webp)/gi;
      let m;
      while ((m = re.exec(html))) {
        let u = m[0].replace(/^http:/i, "https:");
        if (seen[u]) continue;
        seen[u] = true;
        images.push(u);
      }
      if (images.length < 1) {
        let document = new HtmlDocument(html);
        for (let img of document.querySelectorAll("img")) {
          let src = img.attributes["data-src"] || img.attributes["src"] || "";
          if (!src || /logo|icon|avatar|cover/i.test(src)) continue;
          if (!/\.(jpg|jpeg|png|webp)(\?|$)/i.test(src)) continue;
          let u = Pknbc.abs(src);
          if (seen[u]) continue;
          seen[u] = true;
          images.push(u);
        }
      }
      if (images.length < 1) throw "No images";
      return { images };
    },

    onImageLoad: (url, comicId, epId) => {
      return {
        headers: {
          Referer: Pknbc.baseUrl + "/",
          "User-Agent": Pknbc.headers["User-Agent"],
        },
      };
    },
  };
}
