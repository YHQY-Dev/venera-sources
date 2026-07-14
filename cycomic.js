/** @type {import('../venera-configs-main/_venera_.js')} */

/**
 * 次元漫画 — https://2cycomic.com
 * 列表 /update/{page}.html；详情 /book/{id}/；章节 /chapter/{id}/{cid}.html（#img-box 直链）
 * 搜索 POST /api/front/index/search
 */
class Cycomic extends ComicSource {
  name = "次元漫画";
  key = "cycomic";
  version = "1.0.0";
  minAppVersion = "1.0.0";
  url = "";

  static baseUrl = "https://2cycomic.com";
  static ua =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  static headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "text/html,*/*",
    "Accept-Language": "zh-CN,zh;q=0.9",
    Referer: "https://2cycomic.com/",
  };

  static abs(href) {
    if (!href) return "";
    if (href.startsWith("//")) return "https:" + href;
    if (/^https?:/i.test(href)) return href.replace(/^http:/i, "https:");
    try {
      return new URL(href, Cycomic.baseUrl + "/").href.replace(/^http:/i, "https:");
    } catch (_) {
      return href;
    }
  }

  /** 图片 URL 含中文/空格时做 encodeURI（保留已有 %） */
  static encodeImageUrl(u) {
    if (!u) return "";
    try {
      // 已是合法编码则直接返回
      decodeURI(u);
      if (!/[^\x00-\x7F ]/.test(u) && !u.includes(" ")) return u;
    } catch (_) {}
    try {
      return encodeURI(u);
    } catch (_) {
      return u.replace(/ /g, "%20");
    }
  }

  static parseList(document) {
    const comics = [];
    const seen = {};
    for (const a of document.querySelectorAll("a[href*='/book/']")) {
      const href = a.attributes["href"] || "";
      const m = href.match(/\/book\/(\d+)/);
      if (!m) continue;
      const id = m[1];
      if (seen[id]) continue;

      let title = (a.attributes["title"] || "").trim();
      const img = a.querySelector("img");
      let cover = "";
      if (img) {
        cover =
          img.attributes["data-src"] ||
          img.attributes["src"] ||
          "";
        // style background url
        if (!cover) {
          const style = img.attributes["style"] || "";
          const bm = style.match(/url\(['"]?([^'")]+)['"]?\)/);
          if (bm) cover = bm[1];
        }
        if (!title) title = (img.attributes["alt"] || "").trim();
      }
      if (!title) {
        const tEl =
          a.querySelector(".title, h4, .name, p.item-keywords") ||
          a.querySelector("h3, h2");
        if (tEl) title = tEl.text.trim();
      }
      if (!title) title = (a.text || "").trim().replace(/\s+/g, " ");
      title = title.replace(/,?\s*[^,]*漫画\s*$/, "").trim() || title;
      if (!title || title.length < 1) continue;
      if (/^(VIP|更新|排行|分类|完结)$/i.test(title)) continue;

      seen[id] = true;
      comics.push(
        new Comic({
          id,
          title,
          cover: Cycomic.abs(cover),
        }),
      );
    }
    return comics;
  }

  explore = [
    {
      title: "最近更新",
      type: "multiPageComicList",
      load: async (page) => {
        page = page || 1;
        const url = `${Cycomic.baseUrl}/update/${page}.html`;
        const res = await Network.get(url, Cycomic.headers);
        if (res.status !== 200) throw `Invalid status: ${res.status}`;
        const document = new HtmlDocument(res.body);
        const comics = Cycomic.parseList(document);
        return { comics, maxPage: comics.length > 0 ? page + 1 : page };
      },
    },
    {
      title: "人气榜",
      type: "multiPageComicList",
      load: async (page) => {
        page = page || 1;
        const url =
          page <= 1
            ? `${Cycomic.baseUrl}/top/alldj.html`
            : `${Cycomic.baseUrl}/top/alldj/${page}.html`;
        const res = await Network.get(url, Cycomic.headers);
        if (res.status !== 200) throw `Invalid status: ${res.status}`;
        const document = new HtmlDocument(res.body);
        const comics = Cycomic.parseList(document);
        return { comics, maxPage: comics.length > 0 ? page + 1 : page };
      },
    },
  ];

  search = {
    load: async (keyword, options, page) => {
      page = page || 1;
      const key = String(keyword || "").trim();
      if (!key) return { comics: [], maxPage: 0 };
      // 站点为实时搜索 API，无分页；仅第 1 页有结果
      if (page > 1) return { comics: [], maxPage: 1 };

      const res = await Network.post(
        `${Cycomic.baseUrl}/api/front/index/search`,
        {
          ...Cycomic.headers,
          Accept: "application/json, text/javascript, */*; q=0.01",
          "Content-Type": "application/x-www-form-urlencoded",
          "X-Requested-With": "XMLHttpRequest",
        },
        `key=${encodeURIComponent(key)}`,
      );
      if (res.status !== 200) throw `Invalid status: ${res.status}`;

      let data = [];
      try {
        const json = JSON.parse(res.body);
        if (json && Number(json.code) === 0 && Array.isArray(json.data)) {
          data = json.data;
        }
      } catch (_) {
        throw "search parse error";
      }

      const comics = data.map((item) => {
        const id = String(item.id || "").replace(/\D/g, "");
        return new Comic({
          id,
          title: item.name || item.bname || id,
          cover: Cycomic.abs(item.cover || ""),
          subtitle: item.author || "",
        });
      }).filter((c) => c.id);

      return { comics, maxPage: 1 };
    },
  };

  comic = {
    loadInfo: async (id) => {
      id = String(id).replace(/\D/g, "");
      const res = await Network.get(
        `${Cycomic.baseUrl}/book/${id}/`,
        Cycomic.headers,
      );
      if (res.status !== 200) throw `Invalid status: ${res.status}`;
      const document = new HtmlDocument(res.body);
      const body = res.body || "";

      const titleEl = document.querySelector("h1.title, h1");
      let title = titleEl ? titleEl.text.trim() : id;

      let cover = "";
      const ogCover = body.match(
        /property="og:image"\s+content="([^"]+)"/i,
      );
      if (ogCover) cover = ogCover[1];
      if (!cover) {
        const thumb = document.querySelector(".detail-cover img, .detail-cover .thumb");
        if (thumb) {
          cover = thumb.attributes["src"] || "";
          if (!cover) {
            const style = thumb.attributes["style"] || "";
            const bm = style.match(/url\(['"]?([^'")]+)['"]?\)/);
            if (bm) cover = bm[1];
          }
        }
      }

      let author = "";
      const ogAuthor = body.match(
        /property="og:novel:author"\s+content="([^"]+)"/i,
      );
      if (ogAuthor) author = ogAuthor[1].trim();

      const tags = [];
      for (const a of document.querySelectorAll("ul.tags a")) {
        const t = (a.text || "").trim();
        if (t) tags.push(t);
      }

      let description = "";
      const descEl = document.querySelector("#js_comciDesc .desc-content, .desc-content");
      if (descEl) description = descEl.text.trim();

      let status = "unknown";
      const statusM = body.match(/状态：\s*&nbsp;<em class="num">([^<]+)<\/em>/);
      if (statusM) {
        const s = statusM[1].trim();
        if (/连载/.test(s)) status = "ongoing";
        else if (/完结|完本/.test(s)) status = "completed";
      }

      const chapters = new Map();
      const seen = {};
      for (const a of document.querySelectorAll(
        "#j_chapter_list a, .chapter-list a[href*='/chapter/']",
      )) {
        const href = a.attributes["href"] || "";
        const m = href.match(/\/chapter\/\d+\/(\d+)\.html/);
        if (!m) continue;
        const cid = m[1];
        if (seen[cid]) continue;
        seen[cid] = true;
        const name =
          (a.attributes["title"] || a.text || "").trim().replace(/\s+/g, " ") ||
          cid;
        chapters.set(cid, name);
      }

      return new ComicDetails({
        id,
        title,
        cover: Cycomic.abs(cover),
        author,
        description,
        tags: { 类型: tags },
        status,
        chapters,
      });
    },

    loadEp: async (comicId, epId) => {
      const bid = String(comicId).replace(/\D/g, "");
      const cid = String(epId).replace(/\D/g, "");
      const url = `${Cycomic.baseUrl}/chapter/${bid}/${cid}.html`;
      const res = await Network.get(url, {
        ...Cycomic.headers,
        Referer: `${Cycomic.baseUrl}/book/${bid}/`,
      });
      if (res.status !== 200) throw `Invalid status: ${res.status}`;

      const document = new HtmlDocument(res.body);
      const images = [];
      const seen = {};
      const box = document.querySelector("#img-box");
      const nodes = box
        ? box.querySelectorAll("img")
        : document.querySelectorAll("#img-box img, .acgn-reader-chapter__swiper-box img");
      for (const img of nodes) {
        let src = img.attributes["src"] || img.attributes["data-src"] || "";
        if (!src || /\/static\/|cover\/co\d+/i.test(src)) continue;
        if (!/\.(jpg|jpeg|png|webp)(\?|$)/i.test(src)) continue;
        src = Cycomic.encodeImageUrl(Cycomic.abs(src));
        if (seen[src]) continue;
        seen[src] = true;
        images.push(src);
      }

      // fallback: regex on img-box chunk
      if (images.length < 1) {
        const chunk =
          (res.body || "").match(
            /id="img-box"([\s\S]*?)(?:id="js_footMenu"|class="read-footer)/,
          ) || [];
        const re =
          /src="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi;
        let m;
        const html = chunk[1] || "";
        while ((m = re.exec(html))) {
          let u = Cycomic.encodeImageUrl(m[1]);
          if (seen[u] || /cover\/co\d+/i.test(u)) continue;
          seen[u] = true;
          images.push(u);
        }
      }

      if (images.length < 1) throw "No images (可能需登录或付费)";
      return { images };
    },

    onImageLoad: (url) => {
      return {
        url,
        headers: {
          Referer: Cycomic.baseUrl + "/",
          "User-Agent": Cycomic.ua,
          Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        },
      };
    },

    idMatch: "^\\d+$",

    link: {
      domains: ["2cycomic.com", "www.2cycomic.com"],
      linkToId: (url) => {
        const m = String(url).match(/\/book\/(\d+)/);
        return m ? m[1] : null;
      },
    },
  };
}
