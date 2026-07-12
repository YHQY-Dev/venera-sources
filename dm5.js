/** @type {import('../venera-configs-main/_venera_.js')} */

/**
 * 动漫屋 / DM5
 * 与漫本同属 dm5 系：章节页 >eval(packer) → newImgs
 */
class Dm5 extends ComicSource {
  name = "动漫屋";
  key = "dm5";
  version = "1.0.0";
  minAppVersion = "1.0.0";
  url = "";

  static baseUrl = "https://m.dm5.com";
  static headers = {
    "User-Agent":
      "Mozilla/5.0 (Linux; Android 12; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    Accept: "text/html,*/*",
    "Accept-Language": "zh-CN,zh;q=0.9",
  };

  static abs(href) {
    if (!href) return "";
    if (/^https?:/i.test(href)) return href.replace(/^http:/i, "https:");
    try {
      return new URL(href, Dm5.baseUrl + "/").href.replace(/^http:/i, "https:");
    } catch (_) {
      return href;
    }
  }

  static unpackNewImgs(html) {
    let m = html.match(/>eval\(([\s\S]*?)\)\s*<\/script>/);
    if (!m) m = html.match(/eval\((function\(p,a,c,k,e,d\)\{[\s\S]*?\})\)/);
    if (!m) throw "packer not found";
    let fn = new Function(`
      var newImgs;
      var jseval = (${m[1]});
      eval(jseval);
      return newImgs;
    `);
    let imgs = fn();
    if (!Array.isArray(imgs) || !imgs.length) throw "newImgs empty";
    return imgs.filter((u) => typeof u === "string" && /^https?:/i.test(u));
  }

  static parseList(document) {
    let comics = [];
    let seen = {};
    for (let a of document.querySelectorAll("a[href*='manhua-']")) {
      let href = a.attributes["href"] || "";
      let m = href.match(/\/(manhua-[^\/]+)\/?/i);
      if (!m) continue;
      let id = m[1];
      if (seen[id]) continue;
      let title = (a.attributes["title"] || a.text || "").trim();
      if (title.length < 2) continue;
      seen[id] = true;
      let img = a.querySelector("img");
      let cover = "";
      if (img) cover = img.attributes["data-src"] || img.attributes["src"] || "";
      comics.push(new Comic({ id, title, cover: Dm5.abs(cover) }));
    }
    return comics;
  }

  explore = [
    {
      title: "动漫屋",
      type: "multiPageComicList",
      load: async (page) => {
        page = page || 1;
        let url = page <= 1 ? `${Dm5.baseUrl}/` : `${Dm5.baseUrl}/update/?page=${page}`;
        let res = await Network.get(url, Dm5.headers);
        if (res.status !== 200) throw `Invalid status: ${res.status}`;
        let document = new HtmlDocument(res.body);
        let comics = Dm5.parseList(document);
        return { comics, maxPage: comics.length > 0 ? page + 1 : page };
      },
    },
  ];

  search = {
    load: async (keyword, options, page) => {
      page = page || 1;
      let url = `${Dm5.baseUrl}/search?title=${encodeURIComponent(
        keyword
      )}&language=1&page=${page}`;
      let res = await Network.get(url, Dm5.headers);
      if (res.status !== 200) throw `Invalid status: ${res.status}`;
      let document = new HtmlDocument(res.body);
      let comics = Dm5.parseList(document);
      return { comics, maxPage: comics.length > 0 ? page + 1 : page };
    },
    optionList: [],
  };

  comic = {
    loadInfo: async (id) => {
      id = String(id);
      if (!id.startsWith("manhua-")) id = "manhua-" + id;
      let url = `${Dm5.baseUrl}/${id}/`;
      let res = await Network.get(url, Dm5.headers);
      if (res.status !== 200) throw `Invalid status: ${res.status}`;
      let document = new HtmlDocument(res.body);
      let titleEl = document.querySelector(".detail-info-title, h1, .title");
      let title = titleEl ? titleEl.text.trim() : id;
      let coverEl = document.querySelector(".detail-info-cover, img");
      let cover = "";
      if (coverEl) cover = coverEl.attributes["src"] || coverEl.attributes["data-src"] || "";
      let chapters = new Map();
      let items = [];
      for (let a of document.querySelectorAll(
        "#chapterlistload a, .chapterList a, a[href*='/m']"
      )) {
        let href = a.attributes["href"] || "";
        let m = href.match(/\/m(\d+)\/?/i);
        if (!m) continue;
        let name = (a.attributes["title"] || a.text || "").trim().replace(/\s+/g, " ");
        if (!name) name = m[1];
        items.push([m[1], name]);
      }
      items.reverse();
      let seen = {};
      for (let [cid, name] of items) {
        if (seen[cid]) continue;
        seen[cid] = true;
        chapters.set(cid, name);
      }
      return new ComicDetails({
        title,
        cover: Dm5.abs(cover),
        description: "",
        tags: {},
        chapters,
      });
    },

    loadEp: async (comicId, epId) => {
      let churl = `${Dm5.baseUrl}/m${epId}/`;
      let res = await Network.get(churl, {
        ...Dm5.headers,
        Referer: `${Dm5.baseUrl}/${comicId}/`,
      });
      if (res.status !== 200) throw `Invalid status: ${res.status}`;
      let images = Dm5.unpackNewImgs(res.body);
      if (images.length < 1) throw "No images";
      return { images };
    },

    onImageLoad: (url, comicId, epId) => {
      return {
        headers: {
          Referer: Dm5.baseUrl + "/",
          "User-Agent": Dm5.headers["User-Agent"],
        },
      };
    },
  };
}
