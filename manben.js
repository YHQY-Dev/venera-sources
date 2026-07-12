/** @type {import('../venera-configs-main/_venera_.js')} */

/**
 * 漫本（dm5 系）
 * 列表 HTML + 章节页 >eval(packer) → newImgs
 */
class Manben extends ComicSource {
  name = "漫本";
  key = "manben";
  version = "1.0.0";
  minAppVersion = "1.0.0";
  url = "";

  static baseUrl = "https://www.manben.com";
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
      return new URL(href, Manben.baseUrl + "/").href.replace(/^http:/i, "https:");
    } catch (_) {
      return href;
    }
  }

  static unpackNewImgs(html) {
    let m = html.match(/>eval\(([\s\S]*?)\)\s*<\/script>/);
    if (!m) {
      m = html.match(/eval\((function\(p,a,c,k,e,d\)\{[\s\S]*?\})\)/);
    }
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

  static parseComicLinks(document) {
    let comics = [];
    let seen = {};
    for (let a of document.querySelectorAll("a[href*='mh-']")) {
      let href = a.attributes["href"] || "";
      let m = href.match(/\/(mh-[^\/]+)\/?$/i);
      if (!m) continue;
      let id = m[1];
      if (/mh-(updated|boutique|recommend|rank)/i.test(id)) continue;
      if (seen[id]) continue;
      let title = (a.attributes["title"] || a.text || "").trim();
      if (title.length < 1) continue;
      seen[id] = true;
      let img = a.querySelector("img");
      let cover = "";
      if (img) cover = img.attributes["data-src"] || img.attributes["src"] || "";
      comics.push(
        new Comic({
          id,
          title,
          cover: Manben.abs(cover),
        })
      );
    }
    return comics;
  }

  explore = [
    {
      title: "最新更新",
      type: "multiPageComicList",
      load: async (page) => {
        page = page || 1;
        let url =
          page <= 1
            ? `${Manben.baseUrl}/mh-updated/`
            : `${Manben.baseUrl}/mh-updated/pagerdata.ashx?t=2&pageindex=${page}&tagid=0&mt=1&tst=0&tsort=0`;
        let res = await Network.get(url, Manben.headers);
        if (res.status !== 200) throw `Invalid status: ${res.status}`;
        let document = new HtmlDocument(res.body);
        let comics = Manben.parseComicLinks(document);
        if (!comics.length && res.body.trim().startsWith("[")) {
          try {
            let arr = JSON.parse(res.body) || [];
            comics = arr
              .map((it) => {
                let u = String(it.Url || it.url || "");
                let idMatch = u.match(/mh-[^\/]+/i);
                let id = idMatch ? idMatch[0] : "mh-" + u.replace(/\//g, "");
                return new Comic({
                  id,
                  title: it.Title || it.title || id,
                  cover: Manben.abs(it.ShowPicUrlSmall || it.Cover || ""),
                });
              })
              .filter((c) => c.title);
          } catch (_) {}
        }
        return { comics, maxPage: comics.length > 0 ? page + 1 : page };
      },
    },
  ];

  search = {
    load: async (keyword, options, page) => {
      page = page || 1;
      let url = `${Manben.baseUrl}/search?page=${page}&title=${encodeURIComponent(
        keyword
      )}&language=1`;
      let res = await Network.get(url, Manben.headers);
      if (res.status !== 200) throw `Invalid status: ${res.status}`;
      let document = new HtmlDocument(res.body);
      let comics = Manben.parseComicLinks(document);
      return { comics, maxPage: comics.length > 0 ? page + 1 : page };
    },
    optionList: [],
  };

  comic = {
    loadInfo: async (id) => {
      id = String(id);
      if (!id.startsWith("mh-")) id = "mh-" + id.replace(/^\/+|\/+$/g, "");
      let url = `${Manben.baseUrl}/${id}/`;
      let res = await Network.get(url, Manben.headers);
      if (res.status !== 200) throw `Invalid status: ${res.status}`;
      let document = new HtmlDocument(res.body);
      let titleEl = document.querySelector(".comicInfo .title, .detail-info-title, h1, .title");
      let title = titleEl ? titleEl.text.trim() : id;
      title = title.replace(/漫画$/, "").trim() || id;
      let coverEl = document.querySelector(".comicInfo img, .detail-info-cover, img");
      let cover = "";
      if (coverEl) cover = coverEl.attributes["src"] || coverEl.attributes["data-src"] || "";

      let chapters = new Map();
      let items = [];
      for (let a of document.querySelectorAll(".chapterList a, a[href*='/m']")) {
        let href = a.attributes["href"] || "";
        let m = href.match(/\/m(\d+)\/?/i);
        if (!m) continue;
        let name = (a.attributes["title"] || a.text || "").trim().replace(/\s+/g, " ");
        if (!name) name = m[1];
        items.push([m[1], name]);
      }
      // DOM often newest first
      items.reverse();
      let seen = {};
      for (let [cid, name] of items) {
        if (seen[cid]) continue;
        seen[cid] = true;
        chapters.set(cid, name);
      }
      return new ComicDetails({
        title,
        cover: Manben.abs(cover),
        description: "",
        tags: {},
        chapters,
      });
    },

    loadEp: async (comicId, epId) => {
      let churl = `${Manben.baseUrl}/m${epId}/`;
      let res = await Network.get(churl, {
        ...Manben.headers,
        Referer: `${Manben.baseUrl}/${comicId}/`,
      });
      if (res.status !== 200) throw `Invalid status: ${res.status}`;
      let images = Manben.unpackNewImgs(res.body);
      if (images.length < 1) throw "No images";
      return { images };
    },

    onImageLoad: (url, comicId, epId) => {
      return {
        headers: {
          Referer: Manben.baseUrl + "/",
          "User-Agent": Manben.headers["User-Agent"],
        },
      };
    },
  };
}
