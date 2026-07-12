/** @type {import('../venera-configs-main/_venera_.js')} */

/**
 * Mangabz
 * 列表/搜索 HTML + chapterimage.ashx（packed JS → 图片 URL）
 */
class Mangabz extends ComicSource {
  name = "Mangabz";
  key = "mangabz";
  version = "1.0.0";
  minAppVersion = "1.0.0";
  url = "";

  static baseUrl = "https://www.mangabz.com";
  static headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Cookie: "mangabz_lang=2",
    Accept: "text/html,*/*",
    "Accept-Language": "zh-CN,zh;q=0.9",
  };

  static abs(href) {
    if (!href) return "";
    if (/^https?:/i.test(href)) return href.replace(/^http:/i, "https:");
    try {
      return new URL(href, Mangabz.baseUrl + "/").href.replace(/^http:/i, "https:");
    } catch (_) {
      return href;
    }
  }

  static unpackImages(body) {
    if (!body || !String(body).trim()) return [];
    try {
      let fn = new Function(`${body}\n; return (typeof d !== "undefined") ? d : [];`);
      let d = fn();
      return Array.isArray(d) ? d.filter((u) => typeof u === "string" && u) : [];
    } catch (e) {
      throw `unpack images failed: ${e}`;
    }
  }

  static parseList(document) {
    let comics = [];
    let seen = {};
    for (let li of document.querySelectorAll(".mh-list li")) {
      let a = li.querySelector("a");
      if (!a) continue;
      let href = a.attributes["href"] || "";
      let m = href.match(/\/(\d+)bz\/?/i);
      if (!m) continue;
      let id = m[1];
      if (seen[id]) continue;
      seen[id] = true;
      let titleEl = li.querySelector("h2, .title, a");
      let title = titleEl ? titleEl.text.trim() : id;
      let img = li.querySelector("img");
      let cover = "";
      if (img) cover = img.attributes["data-src"] || img.attributes["src"] || "";
      comics.push(
        new Comic({
          id,
          title,
          cover: Mangabz.abs(cover),
        })
      );
    }
    return comics;
  }

  explore = [
    {
      title: "Mangabz",
      type: "multiPageComicList",
      load: async (page) => {
        page = page || 1;
        let url = `${Mangabz.baseUrl}/manga-list-0-1-10-p${page}/`;
        let res = await Network.get(url, Mangabz.headers);
        if (res.status !== 200) throw `Invalid status: ${res.status}`;
        let document = new HtmlDocument(res.body);
        let comics = Mangabz.parseList(document);
        return { comics, maxPage: comics.length > 0 ? page + 1 : page };
      },
    },
  ];

  search = {
    load: async (keyword, options, page) => {
      page = page || 1;
      let url = `${Mangabz.baseUrl}/search?title=${encodeURIComponent(
        keyword
      )}&page=${page}`;
      let res = await Network.get(url, Mangabz.headers);
      if (res.status !== 200) throw `Invalid status: ${res.status}`;
      let document = new HtmlDocument(res.body);
      let comics = Mangabz.parseList(document);
      return { comics, maxPage: comics.length > 0 ? page + 1 : page };
    },
    optionList: [],
  };

  comic = {
    loadInfo: async (id) => {
      id = String(id).replace(/bz$/i, "");
      let url = `${Mangabz.baseUrl}/${id}bz/`;
      let res = await Network.get(url, Mangabz.headers);
      if (res.status !== 200) throw `Invalid status: ${res.status}`;
      let document = new HtmlDocument(res.body);
      let titleEl = document.querySelector(".detail-info-title, h1, .title");
      let title = titleEl ? titleEl.text.trim() : id;
      let coverEl = document.querySelector(".detail-info-cover, img");
      let cover = "";
      if (coverEl) {
        cover = coverEl.attributes["src"] || coverEl.attributes["data-src"] || "";
      }
      let chapters = new Map();
      let items = [];
      for (let a of document.querySelectorAll("#chapterlistload a")) {
        let href = a.attributes["href"] || "";
        let m = href.match(/\/m(\d+)\/?/i);
        if (!m) continue;
        let name = (a.text || "").trim().replace(/\s+/g, " ");
        items.push([m[1], name || m[1]]);
      }
      items.reverse();
      for (let [cid, name] of items) chapters.set(cid, name);
      return new ComicDetails({
        title,
        cover: Mangabz.abs(cover),
        description: "",
        tags: {},
        chapters,
      });
    },

    loadEp: async (comicId, epId) => {
      let churl = `${Mangabz.baseUrl}/m${epId}/`;
      let res = await Network.get(churl, {
        ...Mangabz.headers,
        Referer: `${Mangabz.baseUrl}/${comicId}bz/`,
      });
      if (res.status !== 200) throw `Invalid status: ${res.status}`;
      let html = res.body;
      let cid = /MANGABZ_CID\s*=\s*(.*?)\s*;/.exec(html);
      let mid = /COMIC_MID\s*=\s*(.*?)\s*;/.exec(html);
      let dt = /MANGABZ_VIEWSIGN_DT\s*=\s*"(.*?)"\s*;/.exec(html);
      let sign = /MANGABZ_VIEWSIGN\s*=\s*"(.*?)"\s*;/.exec(html);
      if (!cid || !mid || !dt || !sign) throw "missing chapter sign vars";
      cid = cid[1];
      mid = mid[1];
      let dtQ = dt[1].replace(/ /g, "+").replace(/:/g, "%3A");
      let signV = sign[1];
      let countM = /MANGABZ_IMAGE_COUNT\s*=\s*(\d+)\s*;/.exec(html);
      let imageCount = countM ? parseInt(countM[1], 10) : 0;
      if (!imageCount) imageCount = 20;

      let pages = [];
      for (let p = 1; p <= imageCount; p += 2) pages.push(p);

      let images = [];
      let seen = {};
      const fetchPage = async (page) => {
        let api =
          `${Mangabz.baseUrl}/m${cid}/chapterimage.ashx?cid=${cid}&page=${page}` +
          `&key=&_cid=${cid}&_mid=${mid}&_dt=${dtQ}&_sign=${signV}`;
        let r = await Network.get(api, {
          ...Mangabz.headers,
          Referer: churl,
          "X-Requested-With": "XMLHttpRequest",
        });
        if (r.status !== 200 || !r.body || !String(r.body).trim()) return [];
        try {
          return Mangabz.unpackImages(r.body);
        } catch (_) {
          return [];
        }
      };

      for (let i = 0; i < pages.length; i += 4) {
        let batch = pages.slice(i, i + 4);
        let parts = await Promise.all(batch.map(fetchPage));
        for (let part of parts) {
          for (let u of part) {
            if (seen[u]) continue;
            seen[u] = true;
            images.push(u);
          }
        }
        if (images.length >= imageCount) break;
      }
      images = images.slice(0, imageCount || images.length);
      if (images.length < 1) throw "No images";
      return { images };
    },

    onImageLoad: (url, comicId, epId) => {
      return {
        headers: {
          Referer: Mangabz.baseUrl + "/",
          "User-Agent": Mangabz.headers["User-Agent"],
        },
      };
    },
  };
}
