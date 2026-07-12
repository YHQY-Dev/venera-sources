/** @type {import('../venera-configs-main/_venera_.js')} */

/**
 * 看漫画
 * 列表 /{comicId}/ ；章节 API getchapterlist；图片 getchapterinfov2.chapter_img_list
 */
class Kanman extends ComicSource {
  name = "看漫画";
  key = "kanman";
  version = "1.0.0";
  minAppVersion = "1.0.0";
  url = "";

  static baseUrl = "https://m.kanman.com";
  static headers = {
    "User-Agent":
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
    Accept: "text/html,application/json,*/*",
    "Accept-Language": "zh-CN,zh;q=0.9",
  };

  static abs(href) {
    if (!href) return "";
    if (href.startsWith("//")) return "https:" + href;
    if (/^https?:/i.test(href)) return href.replace(/^http:/i, "https:");
    try {
      return new URL(href, Kanman.baseUrl + "/").href.replace(/^http:/i, "https:");
    } catch (_) {
      return href;
    }
  }

  static parseList(document) {
    let comics = [];
    let seen = {};
    for (let a of document.querySelectorAll("a[href]")) {
      let href = a.attributes["href"] || "";
      let m = href.match(/^\/(\d+)\/?$/);
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
      if (!title || title.length < 2) continue;
      if (/登录|注册|下载|App|书架/i.test(title)) continue;
      seen[id] = true;
      comics.push(
        new Comic({
          id,
          title,
          cover: Kanman.abs(cover),
        })
      );
    }
    if (comics.length < 3) {
      for (let img of document.querySelectorAll("img")) {
        let src = img.attributes["data-src"] || img.attributes["src"] || "";
        let m = src.match(/\/mh\/(\d+)\.(?:jpg|png)/i);
        if (!m) continue;
        let id = m[1];
        if (seen[id]) continue;
        let title = (img.attributes["alt"] || "").trim() || id;
        seen[id] = true;
        comics.push(new Comic({ id, title, cover: Kanman.abs(src) }));
      }
    }
    return comics;
  }

  explore = [
    {
      title: "看漫画",
      type: "multiPageComicList",
      load: async (page) => {
        page = page || 1;
        let url =
          page <= 1
            ? `${Kanman.baseUrl}/`
            : `${Kanman.baseUrl}/top/all.html?page=${page}`;
        let res = await Network.get(url, Kanman.headers);
        if (res.status !== 200) throw `Invalid status: ${res.status}`;
        let document = new HtmlDocument(res.body);
        let comics = Kanman.parseList(document);
        return { comics, maxPage: comics.length > 0 ? page + 1 : page };
      },
    },
  ];

  search = {
    load: async (keyword, options, page) => {
      page = page || 1;
      // 站内 search 页常 404；用排行榜页做弱搜索兜底
      let url =
        page <= 1
          ? `${Kanman.baseUrl}/top/all.html`
          : `${Kanman.baseUrl}/top/all.html?page=${page}`;
      let res = await Network.get(url, Kanman.headers);
      if (res.status !== 200) throw `Invalid status: ${res.status}`;
      let document = new HtmlDocument(res.body);
      let comics = Kanman.parseList(document);
      let kw = String(keyword || "").trim();
      if (kw) {
        comics = comics.filter((c) => String(c.title || "").includes(kw));
      }
      return { comics, maxPage: comics.length > 0 ? page + 1 : page };
    },
    optionList: [],
  };

  comic = {
    loadInfo: async (id) => {
      id = String(id).replace(/\D/g, "");
      let listRes = await Network.get(
        `${Kanman.baseUrl}/api/getchapterlist?comic_id=${id}`,
        {
          ...Kanman.headers,
          Accept: "application/json,*/*",
          Referer: `${Kanman.baseUrl}/${id}/`,
        }
      );
      if (listRes.status !== 200) throw `Invalid status: ${listRes.status}`;
      let listJson;
      try {
        listJson = JSON.parse(listRes.body);
      } catch (_) {
        throw "Invalid chapter list JSON";
      }
      let list = (listJson && listJson.data) || [];
      if (!Array.isArray(list) || list.length < 1) throw "No chapters";

      let title = id;
      let cover = `https://image.yqmh.com/mh/${id}.jpg`;
      try {
        let pageRes = await Network.get(`${Kanman.baseUrl}/${id}/`, Kanman.headers);
        if (pageRes.status === 200) {
          let tm = String(pageRes.body).match(
            /property="og:title"\s+content="([^"]+)"/i
          );
          if (tm) title = tm[1].replace(/漫画.*$/, "").trim() || title;
          let cm = String(pageRes.body).match(
            /property="og:image"\s+content="([^"]+)"/i
          );
          if (cm) cover = cm[1];
          let nm = String(pageRes.body).match(/comic_name\s*:\s*"([^"]+)"/);
          if (nm) title = nm[1];
        }
      } catch (_) {}

      let items = list.slice();
      items.sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
      let chapters = new Map();
      for (let ch of items) {
        let cid = String(ch.chapter_newid || ch.chapter_id || "");
        if (!cid) continue;
        let name = String(ch.chapter_name || cid).trim();
        if (ch.is_vip || (ch.price && Number(ch.price) > 0)) {
          name = `[VIP] ${name}`;
        }
        chapters.set(cid, name);
      }
      return new ComicDetails({
        title,
        cover: Kanman.abs(cover),
        description: "",
        tags: {},
        chapters,
      });
    },

    loadEp: async (comicId, epId) => {
      comicId = String(comicId).replace(/\D/g, "");
      epId = String(epId);
      let url = `${Kanman.baseUrl}/api/getchapterinfov2?comic_id=${comicId}&chapter_newid=${encodeURIComponent(
        epId
      )}`;
      let res = await Network.get(url, {
        ...Kanman.headers,
        Accept: "application/json,*/*",
        Referer: `${Kanman.baseUrl}/${comicId}/`,
      });
      if (res.status !== 200) throw `Invalid status: ${res.status}`;
      let data;
      try {
        data = JSON.parse(res.body);
      } catch (_) {
        throw "Invalid chapter info JSON";
      }
      let cur = (data && data.data && data.data.current_chapter) || {};
      let images = cur.chapter_img_list || [];
      if (!Array.isArray(images) || images.length < 1) throw "No images";
      images = images
        .map((u) => Kanman.abs(String(u || "")))
        .filter((u) => /^https?:\/\//i.test(u));
      if (images.length < 1) throw "No images";
      return { images };
    },

    onImageLoad: (url, comicId, epId) => {
      return {
        headers: {
          Referer: Kanman.baseUrl + "/",
          "User-Agent": Kanman.headers["User-Agent"],
        },
      };
    },
  };
}
