/** @type {import('../venera-configs-main/_venera_.js')} */

/**
 * 思思漫画
 * 首页/列表 HTML + 章节页 qTcms_S_m_murl_e（base64 → $qingtiandy$ 分隔图片）
 */
class Sisimanhua extends ComicSource {
  name = "思思漫画";
  key = "sisimanhua";
  version = "1.0.0";
  minAppVersion = "1.0.0";
  url = "";

  static baseUrl = "https://m.sisimanhua.com";
  static headers = {
    "User-Agent":
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
    Accept: "text/html,*/*",
    "Accept-Language": "zh-CN,zh;q=0.9",
  };

  static abs(href) {
    if (!href) return "";
    if (/^https?:/i.test(href)) return href.replace(/^http:/i, "https:");
    try {
      return new URL(href, Sisimanhua.baseUrl + "/").href.replace(/^http:/i, "https:");
    } catch (_) {
      return href;
    }
  }

  static parseList(document) {
    let comics = [];
    let seen = {};
    for (let li of document.querySelectorAll("ul.col_3_1 li, li")) {
      let a = li.querySelector("a.ImgA") || li.querySelector("a[href*='/manhua/']");
      if (!a) continue;
      let href = a.attributes["href"] || "";
      let m = href.match(/\/manhua\/([a-z0-9_-]+)\/?$/i);
      if (!m) continue;
      let id = m[1];
      if (seen[id]) continue;
      seen[id] = true;
      let titleEl = li.querySelector("a.txtA");
      let title = titleEl ? titleEl.text.trim() : "";
      if (!title) title = (a.text || "").trim() || id;
      let img = a.querySelector("img") || li.querySelector("img");
      let cover = "";
      if (img) cover = img.attributes["data-src"] || img.attributes["src"] || "";
      comics.push(
        new Comic({
          id,
          title,
          cover: Sisimanhua.abs(cover),
        })
      );
    }
    return comics;
  }

  static decodeImages(html) {
    let m = /qTcms_S_m_murl_e\s*=\s*"([^"]+)"/.exec(html);
    if (!m) return [];
    let text = Convert.decodeUtf8(Convert.decodeBase64(m[1]));
    let parts = String(text).split("$qingtiandy$");
    let images = [];
    let seen = {};
    for (let p of parts) {
      let u = String(p || "").trim();
      if (!/^https?:\/\//i.test(u)) continue;
      if (seen[u]) continue;
      seen[u] = true;
      images.push(u.replace(/^http:/i, "https:"));
    }
    return images;
  }

  explore = [
    {
      title: "思思漫画",
      type: "multiPageComicList",
      load: async (page) => {
        page = page || 1;
        let url =
          page <= 1
            ? `${Sisimanhua.baseUrl}/`
            : `${Sisimanhua.baseUrl}/booklist/?page=${page}`;
        let res = await Network.get(url, Sisimanhua.headers);
        if (res.status !== 200) throw `Invalid status: ${res.status}`;
        let document = new HtmlDocument(res.body);
        let comics = Sisimanhua.parseList(document);
        return { comics, maxPage: comics.length > 0 ? page + 1 : page };
      },
    },
  ];

  search = {
    load: async (keyword, options, page) => {
      page = page || 1;
      let url = `${Sisimanhua.baseUrl}/search/?keywords=${encodeURIComponent(
        keyword
      )}&page=${page}`;
      let res = await Network.get(url, Sisimanhua.headers);
      if (res.status !== 200) throw `Invalid status: ${res.status}`;
      let document = new HtmlDocument(res.body);
      let comics = Sisimanhua.parseList(document);
      return { comics, maxPage: comics.length > 0 ? page + 1 : page };
    },
    optionList: [],
  };

  comic = {
    loadInfo: async (id) => {
      id = String(id).replace(/^\/+|\/+$/g, "");
      let url = `${Sisimanhua.baseUrl}/manhua/${id}/`;
      let res = await Network.get(url, Sisimanhua.headers);
      if (res.status !== 200) throw `Invalid status: ${res.status}`;
      let document = new HtmlDocument(res.body);
      let titleEl = document.querySelector("h1.title, h1, .title");
      let title = titleEl ? titleEl.text.trim() : id;
      let coverEl = document.querySelector("#Cover img, .pic img, .Introduct img");
      let cover = "";
      if (coverEl) {
        cover = coverEl.attributes["data-src"] || coverEl.attributes["src"] || "";
      }
      if (!cover || /logo|icon/i.test(cover)) {
        for (let img of document.querySelectorAll("img")) {
          let src = img.attributes["data-src"] || img.attributes["src"] || "";
          if (!src || /logo|icon|head_line|avatar/i.test(src)) continue;
          if (/maomimh|upload/i.test(src) || /\.(jpg|jpeg|png|webp)/i.test(src)) {
            cover = src;
            break;
          }
        }
      }
      let chapters = new Map();
      let items = [];
      let seen = {};
      for (let a of document.querySelectorAll("#mh-chapter-list-ol-0 a")) {
        let href = a.attributes["href"] || "";
        let m = href.match(/\/manhua\/[^/]+\/(\d+)\.html/i);
        if (!m) continue;
        let cid = m[1];
        if (seen[cid]) continue;
        seen[cid] = true;
        let name = (a.text || "").trim().replace(/\s+/g, " ");
        items.push([cid, name || cid]);
      }
      items.reverse();
      for (let [cid, name] of items) chapters.set(cid, name);
      return new ComicDetails({
        title,
        cover: Sisimanhua.abs(cover),
        description: "",
        tags: {},
        chapters,
      });
    },

    loadEp: async (comicId, epId) => {
      let churl = `${Sisimanhua.baseUrl}/manhua/${comicId}/${epId}.html`;
      let res = await Network.get(churl, {
        ...Sisimanhua.headers,
        Referer: `${Sisimanhua.baseUrl}/manhua/${comicId}/`,
      });
      if (res.status !== 200) throw `Invalid status: ${res.status}`;
      let images = Sisimanhua.decodeImages(res.body);
      if (images.length < 1) throw "No images";
      return { images };
    },

    onImageLoad: (url, comicId, epId) => {
      return {
        headers: {
          Referer: Sisimanhua.baseUrl + "/",
          "User-Agent": Sisimanhua.headers["User-Agent"],
        },
      };
    },
  };
}
