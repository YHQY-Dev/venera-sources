/** @type {import('../venera-configs-main/_venera_.js')} */

/**
 * 知音漫客
 * 分类列表 / 详情章节 / 图片规则
 */
class Zymk extends ComicSource {
  name = "知音漫客";
  key = "zymk";
  version = "1.0.1";
  minAppVersion = "1.0.0";
  url = "";

  static baseUrl = "https://m.zymk.cn";
  static headers = {
    "User-Agent":
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
    Accept: "text/html,*/*",
  };

  explore = [
    {
      title: "知音漫客",
      type: "multiPageComicList",
      load: async (page) => {
        page = page || 1;
        let url =
          page <= 1
            ? `${Zymk.baseUrl}/sort/1.html`
            : `${Zymk.baseUrl}/sort/1-${page}.html`;
        let res = await Network.get(url, Zymk.headers);
        if (res.status !== 200) throw `Invalid status: ${res.status}`;
        let document = new HtmlDocument(res.body);
        let comics = [];
        let seen = {};
        for (let a of document.querySelectorAll("a")) {
          let href = a.attributes["href"] || "";
          let m = href.match(/^\/(\d+)\/?$/);
          if (!m) continue;
          let id = m[1];
          if (seen[id]) continue;
          let title = a.text.trim();
          title = title.replace(/^\d+话\s*/, "").replace(/\d+(\.\d+)?$/, "").trim();
          if (title.length < 1) continue;
          seen[id] = true;
          comics.push(
            new Comic({
              id,
              title,
              cover: "",
            })
          );
        }
        return {
          comics,
          maxPage: comics.length > 0 ? page + 1 : page,
        };
      },
    },
  ];

  search = {
    load: async (keyword, options, page) => {
      // 站内搜索页当前不可用，退化为分类页本地过滤
      page = page || 1;
      let explore = await this.explore[0].load(page);
      let kw = keyword.trim();
      let comics = explore.comics.filter((c) => c.title.indexOf(kw) >= 0);
      if (comics.length === 0 && page === 1) {
        let first = await this.explore[0].load(1);
        comics = first.comics.filter((c) => c.title.indexOf(kw) >= 0);
      }
      return {
        comics,
        maxPage: 1,
      };
    },
    optionList: [],
  };

  comic = {
    loadInfo: async (id) => {
      id = String(id);
      let res = await Network.get(`${Zymk.baseUrl}/${id}/`, Zymk.headers);
      if (res.status !== 200) throw `Invalid status: ${res.status}`;
      let document = new HtmlDocument(res.body);
      let titleEl = document.querySelector("h1, .title");
      let title = titleEl ? titleEl.text.trim() : id;
      let coverEl = document.querySelector("#Cover mip-img, #Cover img, mip-img, img");
      let cover = "";
      if (coverEl) {
        cover =
          coverEl.attributes["src"] ||
          coverEl.attributes["data-src"] ||
          "";
      }
      let introEl = document.querySelector(".txtDesc, .desc, .intro");
      let description = introEl ? introEl.text.trim() : "";
      let authorEl = document.querySelector(".author");
      let author = authorEl ? authorEl.text.trim() : "";

      let chapters = new Map();
      let nodes = document.querySelectorAll("a.chapterBtn, .chapterlist a");
      let items = [];
      for (let a of nodes) {
        let href = a.attributes["href"] || "";
        let m = href.match(/(\d+)\.html/);
        if (!m) continue;
        let name = (a.attributes["title"] || a.text || "").trim();
        items.push([m[1], name]);
      }
      items.reverse();
      for (let [cid, name] of items) {
        chapters.set(cid, name);
      }

      let tags = {};
      if (author) tags["作者"] = [author];

      return new ComicDetails({
        title: title,
        cover: cover,
        description: description,
        subtitle: author,
        tags: tags,
        chapters: chapters,
      });
    },

    loadEp: async (comicId, epId) => {
      let url = `${Zymk.baseUrl}/${comicId}/${epId}.html`;
      let res = await Network.get(url, Zymk.headers);
      if (res.status !== 200) throw `Invalid status: ${res.status}`;
      let html = res.body;
      let m = html.match(/end_var:(\d+),[\s\S]*?middle:"(.*)\$\$(.*?)"/);
      if (!m) {
        let imgs = [];
        let re = /https?:\/\/mhpic\.zymkcdn\.com\/[^"'\s]+/g;
        let x;
        while ((x = re.exec(html)) !== null) {
          imgs.push(x[0].replace(/^http:/, "https:"));
        }
        if (imgs.length === 0) throw "Cannot parse images";
        return { images: imgs };
      }
      let pn = parseInt(m[1]);
      let middle = m[2];
      let suffix = m[3];
      let images = [];
      for (let i = 1; i <= pn; i++) {
        images.push(`https://mhpic.zymkcdn.com/comic/${middle}${i}${suffix}`);
      }
      return { images };
    },

    onImageLoad: (url, comicId, epId) => {
      return {
        headers: {
          Referer: Zymk.baseUrl + "/",
          "User-Agent": Zymk.headers["User-Agent"],
        },
      };
    },
  };
}
