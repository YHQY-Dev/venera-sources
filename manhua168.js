/** @type {import('../venera-configs-main/_venera_.js')} */

/**
 * 168漫画
 * 列表 /comic/{id}，章节 /view/{cid}.html
 * 图片 API: /e/extend/api/index.php?type=chapter&filter=info
 */
class Manhua168 extends ComicSource {
  name = "168漫画";
  key = "manhua168";
  version = "1.0.0";
  minAppVersion = "1.0.0";
  url = "";

  static baseUrl = "https://m.168manhua.com";
  static headers = {
    "User-Agent":
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
    Accept: "text/html,*/*",
    "Accept-Language": "zh-CN,zh;q=0.9",
  };

  static abs(href) {
    if (!href) return "";
    if (href.startsWith("//")) return "https:" + href;
    if (/^https?:/i.test(href)) return href.replace(/^http:/i, "https:");
    try {
      return new URL(href, Manhua168.baseUrl + "/").href.replace(/^http:/i, "https:");
    } catch (_) {
      return href;
    }
  }

  static parseList(document) {
    let comics = [];
    let seen = {};
    for (let a of document.querySelectorAll("a[href*='/comic/']")) {
      let href = a.attributes["href"] || "";
      let m = href.match(/\/comic\/(\d+)/);
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
      if (!title || title.length < 1) title = id;
      if (/App|下载|安装|註册|登录/i.test(title) && title.length < 8) continue;
      seen[id] = true;
      comics.push(
        new Comic({
          id,
          title,
          cover: Manhua168.abs(cover),
        })
      );
    }
    return comics;
  }

  explore = [
    {
      title: "168漫画",
      type: "multiPageComicList",
      load: async (page) => {
        page = page || 1;
        let url =
          page <= 1
            ? `${Manhua168.baseUrl}/`
            : `${Manhua168.baseUrl}/new/?page=${page}`;
        let res = await Network.get(url, Manhua168.headers);
        if (res.status !== 200) throw `Invalid status: ${res.status}`;
        let document = new HtmlDocument(res.body);
        let comics = Manhua168.parseList(document);
        return { comics, maxPage: comics.length > 0 ? page + 1 : page };
      },
    },
  ];

  search = {
    load: async (keyword, options, page) => {
      page = page || 1;
      let url = `${Manhua168.baseUrl}/search/?keywords=${encodeURIComponent(
        keyword
      )}&page=${page}`;
      let res = await Network.get(url, Manhua168.headers);
      if (res.status !== 200) throw `Invalid status: ${res.status}`;
      let document = new HtmlDocument(res.body);
      let comics = Manhua168.parseList(document);
      return { comics, maxPage: comics.length > 0 ? page + 1 : page };
    },
    optionList: [],
  };

  comic = {
    loadInfo: async (id) => {
      id = String(id).replace(/\D/g, "");
      let url = `${Manhua168.baseUrl}/comic/${id}`;
      let res = await Network.get(url, Manhua168.headers);
      if (res.status !== 200) throw `Invalid status: ${res.status}`;
      let document = new HtmlDocument(res.body);
      let title =
        (res.body.match(/property="og:novel:book_name"\s+content="([^"]+)"/i) ||
          [])[1] || "";
      if (!title) {
        let titleEl = document.querySelector("h1.title, article h1, h1");
        title = titleEl ? titleEl.text.trim() : id;
      }
      title = title.replace(/^漫画名称[：:]\s*/, "").trim() || id;
      let cover =
        (res.body.match(/property="og:image"\s+content="([^"]+)"/i) || [])[1] ||
        "";
      if (!cover) {
        let coverEl = document.querySelector(".cover, .detailBG img, img");
        if (coverEl) {
          cover = coverEl.attributes["data-src"] || coverEl.attributes["src"] || "";
        }
      }
      let chapters = new Map();
      let items = [];
      let seen = {};
      for (let a of document.querySelectorAll(".chapter_list a[href*='/view/'], a[href*='/view/']")) {
        let href = a.attributes["href"] || "";
        let m = href.match(/\/view\/(\d+)\.html/);
        if (!m) continue;
        let cid = m[1];
        if (seen[cid]) continue;
        seen[cid] = true;
        let name = "";
        let w50 = a.querySelector(".w50");
        if (w50) name = w50.text.trim().split("\n")[0].trim();
        if (!name) name = (a.text || "").trim().replace(/\s+/g, " ");
        if (!name || /開始閱讀|免錢閱讀|返回封面/.test(name)) name = `第${items.length + 1}话`;
        items.push([cid, name]);
      }
      // 站点列表多为倒序；探针对首章更稳，统一正序
      items.reverse();
      for (let [cid, name] of items) chapters.set(cid, name);
      return new ComicDetails({
        title,
        cover: Manhua168.abs(cover),
        description: "",
        tags: {},
        chapters,
      });
    },

    loadEp: async (comicId, epId) => {
      comicId = String(comicId).replace(/\D/g, "");
      epId = String(epId).replace(/\D/g, "");
      let api = `${Manhua168.baseUrl}/e/extend/api/index.php?zid=${comicId}&id=${epId}&type=chapter&filter=info`;
      let res = await Network.get(api, {
        ...Manhua168.headers,
        Accept: "application/json,text/javascript,*/*",
        "X-Requested-With": "XMLHttpRequest",
        Referer: `${Manhua168.baseUrl}/view/${epId}.html`,
      });
      if (res.status !== 200) throw `Invalid status: ${res.status}`;
      let body = String(res.body || "").trim();
      if (!body.startsWith("{") && !body.startsWith("[")) {
        throw "Chapter API returned HTML (locked/missing)";
      }
      let data;
      try {
        data = JSON.parse(body);
      } catch (_) {
        throw "Invalid chapter JSON";
      }
      let images = [];
      let seen = {};
      let blocks = (data && data.data) || [];
      for (let block of blocks) {
        let list = (block && block.list) || [];
        for (let item of list) {
          let u = Manhua168.abs((item && item.img) || "");
          if (!u) continue;
          if (/shikan|vip\d|loading\.gif|cover\.gif|skin\/images/i.test(u)) continue;
          if (!/\.(jpg|jpeg|png|webp)(\?|$)/i.test(u)) continue;
          if (seen[u]) continue;
          seen[u] = true;
          images.push(u);
        }
      }
      if (images.length < 1) throw "No images (VIP/locked?)";
      return { images };
    },

    onImageLoad: (url, comicId, epId) => {
      return {
        headers: {
          Referer: Manhua168.baseUrl + "/",
          "User-Agent": Manhua168.headers["User-Agent"],
        },
      };
    },
  };
}
