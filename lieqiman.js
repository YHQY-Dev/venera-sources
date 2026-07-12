/** @type {import('../venera-configs-main/_venera_.js')} */

/**
 * 猎奇漫画
 * 列表 /mh/{cat}/{id}.html，单页即整本，图片 pic.lieqimh.com
 */
class Lieqiman extends ComicSource {
  name = "猎奇漫画";
  key = "lieqiman";
  version = "1.0.0";
  minAppVersion = "1.0.0";
  url = "";

  static baseUrl = "https://www.lieqimh.com";
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
      return new URL(href, Lieqiman.baseUrl + "/").href;
    } catch (_) {
      return href;
    }
  }

  static parseList(html) {
    let comics = [];
    let seen = {};
    let re = /href=["'](\/mh\/([a-z0-9_-]+)\/(\d+)\.html)["']/gi;
    let m;
    while ((m = re.exec(html))) {
      let id = `${m[2]}/${m[3]}`;
      if (seen[id]) continue;
      seen[id] = true;
      // look back for title/alt nearby
      let slice = html.slice(Math.max(0, m.index - 200), m.index + 120);
      let title =
        (slice.match(/alt=["']([^"']+)["']/i) ||
          slice.match(/title=["']([^"']+)["']/i) ||
          [])[1] || id;
      let cover = (slice.match(/src=["']([^"']+)["']/i) || [])[1] || "";
      comics.push(
        new Comic({
          id,
          title: String(title).trim() || id,
          cover: Lieqiman.abs(cover),
        })
      );
    }
    return comics;
  }

  static pageImages(html) {
    let images = [];
    let seen = {};
    let re = /(?:src|data-src)=["'](https?:\/\/pic\.lieqimh\.com\/[^"']+)["']/gi;
    let m;
    while ((m = re.exec(html))) {
      let u = m[1];
      if (seen[u]) continue;
      seen[u] = true;
      images.push(u);
    }
    return images;
  }

  explore = [
    {
      title: "猎奇漫画",
      type: "multiPageComicList",
      load: async (page) => {
        page = page || 1;
        let url = page <= 1 ? `${Lieqiman.baseUrl}/` : `${Lieqiman.baseUrl}/?page=${page}`;
        let res = await Network.get(url, Lieqiman.headers);
        if (res.status !== 200) throw `Invalid status: ${res.status}`;
        let comics = Lieqiman.parseList(res.body);
        return { comics, maxPage: comics.length > 0 ? page + 1 : page };
      },
    },
  ];

  search = {
    load: async (keyword, options, page) => {
      page = page || 1;
      let res = await Network.get(`${Lieqiman.baseUrl}/`, Lieqiman.headers);
      if (res.status !== 200) throw `Invalid status: ${res.status}`;
      let all = Lieqiman.parseList(res.body);
      let kw = String(keyword || "");
      let comics = kw ? all.filter((c) => String(c.title).includes(kw)) : all;
      if (!comics.length) comics = all;
      return { comics, maxPage: 1 };
    },
    optionList: [],
  };

  comic = {
    loadInfo: async (id) => {
      id = String(id).replace(/^\/+|\/+$/g, "");
      let url = `${Lieqiman.baseUrl}/mh/${id}.html`;
      let res = await Network.get(url, Lieqiman.headers);
      if (res.status !== 200) throw `Invalid status: ${res.status}`;
      let title =
        ((res.body.match(/<title[^>]*>([^<]+)/i) || [])[1] || id)
          .split("-")[0]
          .split("_")[0]
          .trim() || id;
      let imgs = Lieqiman.pageImages(res.body);
      let cover = imgs[0] || "";
      let chapters = new Map();
      chapters.set("1", "全文");
      return new ComicDetails({
        title,
        cover: Lieqiman.abs(cover),
        description: "",
        tags: {},
        chapters,
      });
    },

    loadEp: async (comicId, epId) => {
      comicId = String(comicId).replace(/^\/+|\/+$/g, "");
      let url = `${Lieqiman.baseUrl}/mh/${comicId}.html`;
      let res = await Network.get(url, {
        ...Lieqiman.headers,
        Referer: Lieqiman.baseUrl + "/",
      });
      if (res.status !== 200) throw `Invalid status: ${res.status}`;
      let images = Lieqiman.pageImages(res.body);
      if (images.length < 1) throw "No images";
      return { images };
    },

    onImageLoad: (url, comicId, epId) => {
      return {
        headers: {
          Referer: Lieqiman.baseUrl + "/",
          "User-Agent": Lieqiman.headers["User-Agent"],
        },
      };
    },
  };
}
