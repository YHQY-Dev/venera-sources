/** @type {import('../venera-configs-main/_venera_.js')} */

/**
 * 崩坏3漫画
 * 列表 /book/{id}，章节 /book/{id}/{ep}，图片 data-original 直链
 */
class Bh3 extends ComicSource {
  name = "崩坏3漫画";
  key = "bh3";
  version = "1.0.0";
  minAppVersion = "1.0.0";
  url = "";

  static baseUrl = "https://comic.bh3.com";
  static headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "text/html,*/*",
    "Accept-Language": "zh-CN,zh;q=0.9",
  };

  static abs(href) {
    if (!href) return "";
    if (href.startsWith("//")) return "https:" + href;
    if (/^https?:/i.test(href)) return href;
    try {
      return new URL(href, Bh3.baseUrl + "/").href;
    } catch (_) {
      return href;
    }
  }

  static parseList(html) {
    let comics = [];
    let seen = {};
    let re = /href=["'](\/?book\/(\d+))["'][^>]*>([\s\S]*?)<\/a>/gi;
    let m;
    // also collect from href alone with nearby title attributes
    let hrefRe = /href=["'](\/?book\/(\d+))\/?(?:["']|\?)/gi;
    while ((m = hrefRe.exec(html))) {
      let id = m[2];
      if (seen[id]) continue;
      // skip chapter links /book/id/n
      let full = m[1];
      if (/\/book\/\d+\/\d+/.test(html.slice(m.index, m.index + 40))) continue;
      seen[id] = true;
      comics.push(new Comic({ id, title: id, cover: "" }));
    }
    // enrich titles from data or text near book cards
    let titleRe = /\/book\/(\d+)[^>]*>[\s\n]*([^<]{1,40})/gi;
    let titles = {};
    while ((m = titleRe.exec(html))) {
      let t = m[2].trim().replace(/\s+/g, " ");
      if (t && t.length > 1 && !/^[\d\/]+$/.test(t)) titles[m[1]] = t;
    }
    // alt from images
    let imgRe = /\/book\/(\d+)[\s\S]{0,200}?alt=["']([^"']+)["']/gi;
    while ((m = imgRe.exec(html))) {
      if (!titles[m[1]]) titles[m[1]] = m[2].trim();
    }
    for (let c of comics) {
      if (titles[c.id]) c.title = titles[c.id];
    }
    // covers
    let coverRe =
      /(?:href=["']\/?book\/(\d+)["'][\s\S]{0,300}?src=["']([^"']+)["'])|(?:src=["']([^"']+)["'][\s\S]{0,300}?href=["']\/?book\/(\d+)["'])/gi;
    while ((m = coverRe.exec(html))) {
      let id = m[1] || m[4];
      let src = m[2] || m[3];
      if (!id || !src) continue;
      let comic = comics.find((x) => x.id === id);
      if (comic && !comic.cover) comic.cover = Bh3.abs(src);
    }
    return comics.filter((c) => c.title);
  }

  explore = [
    {
      title: "崩坏3漫画",
      type: "multiPageComicList",
      load: async (page) => {
        page = page || 1;
        if (page > 1) return { comics: [], maxPage: 1 };
        let res = await Network.get(`${Bh3.baseUrl}/`, Bh3.headers);
        if (res.status !== 200) throw `Invalid status: ${res.status}`;
        let comics = Bh3.parseList(res.body);
        // dedupe book-only (no chapter suffix already handled)
        let seen = {};
        let out = [];
        for (let c of comics) {
          if (seen[c.id]) continue;
          seen[c.id] = true;
          out.push(c);
        }
        return { comics: out, maxPage: 1 };
      },
    },
  ];

  search = {
    load: async (keyword, options, page) => {
      page = page || 1;
      let res = await Network.get(`${Bh3.baseUrl}/`, Bh3.headers);
      if (res.status !== 200) throw `Invalid status: ${res.status}`;
      let all = Bh3.parseList(res.body);
      let kw = String(keyword || "").toLowerCase();
      let comics = kw
        ? all.filter((c) => String(c.title).toLowerCase().includes(kw) || c.id.includes(kw))
        : all;
      if (!comics.length) comics = all;
      return { comics, maxPage: 1 };
    },
    optionList: [],
  };

  comic = {
    loadInfo: async (id) => {
      id = String(id).replace(/\D/g, "");
      let url = `${Bh3.baseUrl}/book/${id}`;
      let res = await Network.get(url, Bh3.headers);
      if (res.status !== 200) throw `Invalid status: ${res.status}`;
      let title =
        ((res.body.match(/var\s+booktitle\s*=\s*"([^"]+)"/) || [])[1] ||
          (res.body.match(/<title[^>]*>([^<]+)/i) || [])[1] ||
          id)
          .split("—")[0]
          .split("|")[0]
          .trim() || id;
      let cover = "";
      let cm = res.body.match(
        /(?:og:image|cover)[^>]+content=["']([^"']+)["']/i
      ) || res.body.match(/src=["'](https?:\/\/[^"']+\/comic\/book\/[^"']+\.(?:jpg|png|webp))["']/i);
      if (cm) cover = cm[1];
      let chapters = new Map();
      let eps = [];
      let seen = {};
      let re = /\/book\/(\d+)\/(\d+)/g;
      let m;
      while ((m = re.exec(res.body))) {
        if (m[1] !== id) continue;
        let cid = m[2];
        if (seen[cid]) continue;
        seen[cid] = true;
        eps.push(cid);
      }
      // sort numeric
      eps.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
      for (let cid of eps) chapters.set(cid, `第${cid}话`);
      // if empty, at least chapter 1
      if (!chapters.size) chapters.set("1", "第1话");
      return new ComicDetails({
        title,
        cover: Bh3.abs(cover),
        description: "",
        tags: {},
        chapters,
      });
    },

    loadEp: async (comicId, epId) => {
      comicId = String(comicId).replace(/\D/g, "");
      epId = String(epId).replace(/\D/g, "");
      let url = `${Bh3.baseUrl}/book/${comicId}/${epId}`;
      let res = await Network.get(url, {
        ...Bh3.headers,
        Referer: `${Bh3.baseUrl}/book/${comicId}`,
      });
      if (res.status !== 200) throw `Invalid status: ${res.status}`;
      let images = [];
      let seen = {};
      // data-original may be unquoted
      let re =
        /data-original\s*=\s*(?:["']([^"']+)["']|(https?:\/\/[^\s>"']+))/gi;
      let m;
      while ((m = re.exec(res.body))) {
        let u = Bh3.abs(m[1] || m[2] || "");
        if (!u || seen[u]) continue;
        if (!/\.(jpg|jpeg|png|webp)(\?|$)/i.test(u)) continue;
        seen[u] = true;
        images.push(u);
      }
      if (images.length < 1) throw "No images";
      return { images };
    },

    onImageLoad: (url, comicId, epId) => {
      return {
        headers: {
          Referer: Bh3.baseUrl + "/",
          "User-Agent": Bh3.headers["User-Agent"],
        },
      };
    },
  };
}
