/** @type {import('../venera-configs-main/_venera_.js')} */

/**
 * MangaDex
 * 官方 API：列表 / 搜索 / feed 章节 / at-home 图片
 */
class Mangadex extends ComicSource {
  name = "MangaDex";
  key = "mangadex";
  version = "1.0.0";
  minAppVersion = "1.0.0";
  url = "";

  static api = "https://api.mangadex.org";
  static headers = {
    "User-Agent": "VeneraMangaDex/1.0",
    Accept: "application/json",
  };

  static pickTitle(attrs) {
    let titles = attrs && attrs.title ? attrs.title : {};
    return (
      titles["zh"] ||
      titles["zh-hk"] ||
      titles["zh-tw"] ||
      titles["en"] ||
      titles["ja"] ||
      titles[Object.keys(titles)[0]] ||
      ""
    );
  }

  static coverOf(data) {
    let id = data.id;
    let rel = (data.relationships || []).find((e) => e.type === "cover_art");
    let file = rel && rel.attributes && rel.attributes.fileName;
    if (!file) return "";
    return `https://mangadex.org/covers/${id}/${file}.256.jpg`;
  }

  static parseComic(data) {
    let title = Mangadex.pickTitle(data.attributes) || data.id;
    return new Comic({
      id: data.id,
      title,
      cover: Mangadex.coverOf(data),
    });
  }

  static async apiGet(path) {
    let url = path.startsWith("http") ? path : `${Mangadex.api}${path}`;
    let res = await Network.get(url, Mangadex.headers);
    if (res.status !== 200) throw `Invalid status: ${res.status}`;
    return JSON.parse(res.body);
  }

  explore = [
    {
      title: "MangaDex",
      type: "multiPageComicList",
      load: async (page) => {
        page = page || 1;
        let limit = 20;
        let offset = (page - 1) * limit;
        let data = await Mangadex.apiGet(
          `/manga?includes[]=cover_art&order[followedCount]=desc&hasAvailableChapters=true&limit=${limit}&offset=${offset}`
        );
        let comics = (data.data || []).map((d) => Mangadex.parseComic(d));
        let total = data.total || 0;
        let maxPage = total ? Math.ceil(total / limit) : page;
        return { comics, maxPage };
      },
    },
  ];

  search = {
    load: async (keyword, options, page) => {
      page = page || 1;
      let limit = 20;
      let offset = (page - 1) * limit;
      let data = await Mangadex.apiGet(
        `/manga?title=${encodeURIComponent(keyword)}&includes[]=cover_art&hasAvailableChapters=true&order[followedCount]=desc&limit=${limit}&offset=${offset}`
      );
      let comics = (data.data || []).map((d) => Mangadex.parseComic(d));
      let total = data.total || 0;
      let maxPage = total ? Math.ceil(total / limit) : page;
      return { comics, maxPage };
    },
    optionList: [],
  };

  comic = {
    loadInfo: async (id) => {
      id = String(id);
      let info = await Mangadex.apiGet(
        `/manga/${id}?includes[]=cover_art&includes[]=author&includes[]=artist`
      );
      let data = info.data;
      let title = Mangadex.pickTitle(data.attributes) || id;
      let cover = Mangadex.coverOf(data);
      let desc = "";
      let d = (data.attributes && data.attributes.description) || {};
      desc = d["zh"] || d["en"] || d[Object.keys(d)[0]] || "";

      let chapters = new Map();
      let offset = 0;
      let limit = 100;
      let seen = {};
      let langQs = [
        "translatedLanguage[]=en&translatedLanguage[]=zh",
        "",
      ];
      for (let langQ of langQs) {
        offset = 0;
        while (offset < 500) {
          let q = `/manga/${id}/feed?limit=${limit}&offset=${offset}&order[chapter]=asc`;
          if (langQ) q += `&${langQ}`;
          let feed = await Mangadex.apiGet(q);
          let list = feed.data || [];
          if (!list.length) break;
          for (let ch of list) {
            let cid = ch.id;
            if (seen[cid]) continue;
            seen[cid] = true;
            let attrs = ch.attributes || {};
            let num =
              attrs.chapter != null && attrs.chapter !== ""
                ? attrs.chapter
                : "Oneshot";
            let lang = attrs.translatedLanguage || "";
            let name = attrs.title ? `${num} ${attrs.title}` : String(num);
            if (lang) name = `${name} [${lang}]`;
            chapters.set(cid, name);
          }
          offset += list.length;
          if (list.length < limit) break;
        }
        if (chapters.size > 0) break;
      }

      return new ComicDetails({
        title,
        cover,
        description: desc,
        tags: {},
        chapters,
      });
    },

    loadEp: async (comicId, epId) => {
      let data = await Mangadex.apiGet(`/at-home/server/${epId}`);
      let base = (data.baseUrl || "https://uploads.mangadex.org").replace(/\/$/, "");
      let hash = data.chapter && data.chapter.hash;
      let files = (data.chapter && (data.chapter.data || data.chapter.dataSaver)) || [];
      if (!hash || !files.length) throw "No images";
      let quality = data.chapter.data && data.chapter.data.length ? "data" : "data-saver";
      let images = files.map((f) => `${base}/${quality}/${hash}/${f}`);
      return { images };
    },

    onImageLoad: (url, comicId, epId) => {
      return {
        headers: {
          Referer: "https://mangadex.org/",
          "User-Agent": Mangadex.headers["User-Agent"],
        },
      };
    },
  };
}
