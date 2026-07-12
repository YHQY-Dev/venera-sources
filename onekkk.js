/** @type {import('../venera-configs-main/_venera_.js')} */

/**
 * 极速漫画（1kkk）
 * 列表 /manhua{id}/，章节 /ch{n}-{cid}/，图片 chapterfun.ashx（packed → d）
 */
class Onekkk extends ComicSource {
  name = "极速漫画";
  key = "onekkk";
  version = "1.0.1";
  minAppVersion = "1.0.0";
  url = "";

  static baseUrl = "https://www.1kkk.com";
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
      return new URL(href, Onekkk.baseUrl + "/").href.replace(/^http:/i, "https:");
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
    for (let a of document.querySelectorAll("a[href*='/manhua']")) {
      let href = a.attributes["href"] || "";
      let m = href.match(/\/(manhua\d+)\/?/i);
      if (!m) continue;
      let id = m[1];
      if (seen[id]) continue;
      let title = (a.attributes["title"] || a.text || "").trim().replace(/\s+/g, " ");
      if (title.length < 2) continue;
      seen[id] = true;
      let img = a.querySelector("img");
      let cover = "";
      if (img) cover = img.attributes["data-src"] || img.attributes["src"] || "";
      comics.push(new Comic({ id, title, cover: Onekkk.abs(cover) }));
    }
    return comics;
  }

  explore = [
    {
      title: "极速漫画",
      type: "multiPageComicList",
      load: async (page) => {
        page = page || 1;
        let url =
          page <= 1
            ? `${Onekkk.baseUrl}/manhua-list/`
            : `${Onekkk.baseUrl}/manhua-list-p${page}/`;
        let res = await Network.get(url, Onekkk.headers);
        if (res.status !== 200) throw `Invalid status: ${res.status}`;
        let document = new HtmlDocument(res.body);
        let comics = Onekkk.parseList(document);
        return { comics, maxPage: comics.length > 0 ? page + 1 : page };
      },
    },
  ];

  search = {
    load: async (keyword, options, page) => {
      page = page || 1;
      let url = `${Onekkk.baseUrl}/search?title=${encodeURIComponent(
        keyword
      )}&language=1&page=${page}`;
      let res = await Network.get(url, Onekkk.headers);
      if (res.status !== 200) throw `Invalid status: ${res.status}`;
      let document = new HtmlDocument(res.body);
      let comics = Onekkk.parseList(document);
      return { comics, maxPage: comics.length > 0 ? page + 1 : page };
    },
    optionList: [],
  };

  comic = {
    loadInfo: async (id) => {
      id = String(id).replace(/^\/+|\/+$/g, "");
      if (!/^manhua\d+/i.test(id)) id = `manhua${id.replace(/\D/g, "")}`;
      let url = `${Onekkk.baseUrl}/${id}/`;
      let res = await Network.get(url, Onekkk.headers);
      if (res.status !== 200) throw `Invalid status: ${res.status}`;
      let document = new HtmlDocument(res.body);
      let titleEl = document.querySelector(".detail-info-title, h1, .title");
      let title = titleEl ? titleEl.text.trim() : id;
      let coverEl = document.querySelector(".detail-info-cover img, .banner_detail_form img, img");
      let cover = "";
      if (coverEl) {
        cover = coverEl.attributes["src"] || coverEl.attributes["data-src"] || "";
      }
      let chapters = new Map();
      let items = [];
      let seen = {};
      for (let a of document.querySelectorAll("a[href*='/ch']")) {
        let href = a.attributes["href"] || "";
        let m = href.match(/\/ch(\d+)-(\d+)\//i);
        if (!m) continue;
        let cid = m[2];
        if (seen[cid]) continue;
        seen[cid] = true;
        let name =
          (a.attributes["title"] || a.text || "").trim().replace(/\s+/g, " ") ||
          `ch${m[1]}`;
        // store "n-cid" so loadEp can rebuild /ch{n}-{cid}/
        items.push([`${m[1]}-${cid}`, name]);
      }
      for (let [cid, name] of items) chapters.set(cid, name);
      return new ComicDetails({
        title,
        cover: Onekkk.abs(cover),
        description: "",
        tags: {},
        chapters,
      });
    },

    loadEp: async (comicId, epId) => {
      epId = String(epId);
      let churl = `${Onekkk.baseUrl}/ch${epId}/`;
      if (!/^\/?ch\d+-\d+/i.test(`ch${epId}`) && epId.includes("-")) {
        churl = `${Onekkk.baseUrl}/ch${epId}/`;
      } else if (/^\d+$/.test(epId)) {
        churl = `${Onekkk.baseUrl}/ch1-${epId}/`;
      }
      let res = await Network.get(churl, {
        ...Onekkk.headers,
        Referer: `${Onekkk.baseUrl}/${comicId}/`,
      });
      if (res.status !== 200) throw `Invalid status: ${res.status}`;
      let html = res.body;
      let cid = /DM5_CID\s*=\s*(.*?)\s*;/.exec(html);
      let mid = /DM5_MID\s*=\s*(.*?)\s*;/.exec(html);
      let dt = /DM5_VIEWSIGN_DT\s*=\s*"(.*?)"\s*;/.exec(html);
      let sign = /DM5_VIEWSIGN\s*=\s*"(.*?)"\s*;/.exec(html);
      if (!cid || !mid || !dt || !sign) throw "missing chapter sign vars";
      cid = cid[1];
      mid = mid[1];
      let dtQ = dt[1].replace(/ /g, "+").replace(/:/g, "%3A");
      let signV = sign[1];
      let countM = /DM5_IMAGE_COUNT\s*=\s*(\d+)\s*;/.exec(html);
      let imageCount = countM ? parseInt(countM[1], 10) : 20;

      let pages = [];
      for (let p = 1; p <= imageCount; p += 1) pages.push(p);

      let images = [];
      let seen = {};
      const fetchPage = async (page) => {
        let api =
          `${Onekkk.baseUrl}/chapterfun.ashx?cid=${cid}&page=${page}&key=&language=1&gtk=6` +
          `&_cid=${cid}&_mid=${mid}&_dt=${dtQ}&_sign=${signV}`;
        let r = await Network.get(api, {
          ...Onekkk.headers,
          Referer: churl,
          "X-Requested-With": "XMLHttpRequest",
        });
        if (r.status !== 200 || !r.body || !String(r.body).trim()) return [];
        try {
          return Onekkk.unpackImages(r.body);
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
          Referer: Onekkk.baseUrl + "/",
          "User-Agent": Onekkk.headers["User-Agent"],
        },
      };
    },
  };
}
