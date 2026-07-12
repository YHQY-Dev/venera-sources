/** @type {import('../venera-configs-main/_venera_.js')} */

/**
 * 动漫星空（游民星空 ACG）
 * 列表 /manhua/all/{id}/，章节 /manhua/content/...shtml，正文图
 */
class Gamersky extends ComicSource {
  name = "动漫星空";
  key = "gamersky";
  version = "1.0.0";
  minAppVersion = "1.0.0";
  url = "";

  static baseUrl = "https://acg.gamersky.com";
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
      return new URL(href, Gamersky.baseUrl + "/").href.replace(/^http:/i, "https:");
    } catch (_) {
      return href;
    }
  }

  static parseList(document) {
    let comics = [];
    let seen = {};
    for (let a of document.querySelectorAll("a[href*='/manhua/all/']")) {
      let href = a.attributes["href"] || "";
      let m = href.match(/\/manhua\/all\/(\d+)\//);
      if (!m) continue;
      let id = m[1];
      if (seen[id]) continue;
      let img = a.querySelector("img");
      let title = (a.attributes["title"] || "").trim();
      let cover = "";
      if (img) {
        cover = img.attributes["data-src"] || img.attributes["src"] || "";
        if (!title) title = (img.attributes["alt"] || "").trim();
      }
      if (!title) title = (a.text || "").trim().replace(/\s+/g, " ");
      if (!title || title.length < 1) continue;
      seen[id] = true;
      comics.push(new Comic({ id, title, cover: Gamersky.abs(cover) }));
    }
    return comics;
  }

  explore = [
    {
      title: "动漫星空",
      type: "multiPageComicList",
      load: async (page) => {
        page = page || 1;
        let urls = [`${Gamersky.baseUrl}/`, `${Gamersky.baseUrl}/manhua/`];
        let comics = [];
        let seen = {};
        for (let url of urls) {
          let res = await Network.get(url, Gamersky.headers);
          if (res.status !== 200) continue;
          let document = new HtmlDocument(res.body);
          for (let c of Gamersky.parseList(document)) {
            if (seen[c.id]) continue;
            seen[c.id] = true;
            comics.push(c);
          }
        }
        if (!comics.length) throw "No comics";
        return { comics, maxPage: 1 };
      },
    },
  ];

  search = {
    load: async (keyword, options, page) => {
      // 站内无可靠搜索：回落到漫画面板并按标题过滤
      page = page || 1;
      let res = await Network.get(`${Gamersky.baseUrl}/manhua/`, Gamersky.headers);
      if (res.status !== 200) throw `Invalid status: ${res.status}`;
      let document = new HtmlDocument(res.body);
      let all = Gamersky.parseList(document);
      let kw = String(keyword || "").trim().toLowerCase();
      let comics = kw
        ? all.filter((c) => String(c.title || "").toLowerCase().includes(kw))
        : all;
      if (!comics.length) comics = all;
      return { comics, maxPage: 1 };
    },
    optionList: [],
  };

  comic = {
    loadInfo: async (id) => {
      id = String(id).replace(/\D/g, "");
      let url = `${Gamersky.baseUrl}/manhua/all/${id}/`;
      let res = await Network.get(url, Gamersky.headers);
      if (res.status !== 200) throw `Invalid status: ${res.status}`;
      let document = new HtmlDocument(res.body);
      let titleEl = document.querySelector("h1, .tit, title");
      let title = titleEl ? titleEl.text.trim() : id;
      title = title.replace(/_.*$/, "").replace(/动漫星空.*$/, "").trim() || id;
      let cover = "";
      for (let img of document.querySelectorAll("img")) {
        let src = img.attributes["data-src"] || img.attributes["src"] || "";
        if (!src || /logo|icon|avatar|72\.jpg/i.test(src)) continue;
        if (/gamersky\.com\/pic|pe_u_thumb/i.test(src) || img.attributes["class"] === "pe_u_thumb") {
          cover = src;
          break;
        }
        if (!cover && /\.(jpg|jpeg|png|webp)/i.test(src)) cover = src;
      }
      let chapters = new Map();
      let items = [];
      let seen = {};
      for (let a of document.querySelectorAll("a[href*='/manhua/content/']")) {
        let href = a.attributes["href"] || "";
        let m = href.match(/\/manhua\/content\/(\d{6}\/\d+)\.shtml/i);
        if (!m) continue;
        let cid = m[1];
        if (seen[cid]) continue;
        seen[cid] = true;
        let name = (a.text || "").trim().replace(/\s+/g, " ");
        if (!name || /在线观看|点击/i.test(name)) name = "正文";
        items.push([cid, name || "正文"]);
      }
      for (let [cid, name] of items) chapters.set(cid, name);
      return new ComicDetails({
        title,
        cover: Gamersky.abs(cover),
        description: "",
        tags: {},
        chapters,
      });
    },

    loadEp: async (comicId, epId) => {
      epId = String(epId).replace(/^\/+|\/+$/g, "");
      let url = `${Gamersky.baseUrl}/manhua/content/${epId}.shtml`;
      let res = await Network.get(url, {
        ...Gamersky.headers,
        Referer: `${Gamersky.baseUrl}/manhua/all/${comicId}/`,
      });
      if (res.status !== 200) throw `Invalid status: ${res.status}`;
      let document = new HtmlDocument(res.body);
      let images = [];
      let seen = {};
      let nodes = document.querySelectorAll("img.picact");
      if (!nodes.length) nodes = document.querySelectorAll("img");
      for (let img of nodes) {
        let u = img.attributes["data-src"] || img.attributes["src"] || "";
        if (!u) continue;
        if (/logo|icon|avatar|preview|thumb|header|footer|pic1/i.test(u)) continue;
        if (!/\.(jpg|jpeg|png|webp)/i.test(u) && !/sinaimg|mw690/i.test(u)) continue;
        u = Gamersky.abs(u);
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
          Referer: Gamersky.baseUrl + "/",
          "User-Agent": Gamersky.headers["User-Agent"],
        },
      };
    },
  };
}
