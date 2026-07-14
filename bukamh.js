/** @type {import('../venera-configs-main/_venera_.js')} */

/**
 * 布卡漫画 — https://www.bukamh.com
 * MCCMS wap 模板：列表 HTML；章节 params AES-CBC；部分图源可能 AES 加密
 */
class Bukamh extends ComicSource {
  name = "布卡漫画";
  key = "bukamh";
  version = "1.0.0";
  minAppVersion = "1.4.0";
  url = "";

  static baseUrl = "https://www.bukamh.com";
  static ua =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1";
  static headers = {
    "User-Agent": Bukamh.ua,
    Accept: "text/html,*/*",
    "Accept-Language": "zh-CN,zh;q=0.9",
    Referer: Bukamh.baseUrl + "/",
  };

  /** params 解密密钥（与如漫画等同系 MCCMS） */
  static paramsKey = "9S8$vJnU2ANeSRoF";
  /** 图片解密密钥（与漫蛙等同系） */
  static imageKey = "my2ecret782ecret";

  static abs(href) {
    if (!href) return "";
    if (href.startsWith("//")) return "https:" + href;
    if (/^https?:/i.test(href)) return href.replace(/^http:/i, "https:");
    try {
      return new URL(href, Bukamh.baseUrl + "/").href.replace(/^http:/i, "https:");
    } catch (_) {
      return href;
    }
  }

  static normalizeId(href) {
    if (!href) return "";
    let h = String(href).trim();
    if (/^https?:/i.test(h)) {
      try {
        h = new URL(h).pathname;
      } catch (_) {}
    }
    h = h.replace(/\/+$/, "");
    if (!h.startsWith("/")) h = "/" + h;
    return h;
  }

  static parseList(document) {
    const comics = [];
    const seen = {};

    for (const li of document.querySelectorAll("ul.u_list > li")) {
      const nameA = li.querySelector("a.name") || li.querySelector(".neirong a");
      const picA = li.querySelector(".pic a") || li.querySelector("a");
      const a = nameA || picA;
      if (!a) continue;
      const href = a.attributes["href"] || "";
      const id = Bukamh.normalizeId(href);
      if (!id || id === "/" || /\/(custom|category|search|packs|template|api)\b/i.test(id)) {
        continue;
      }
      if (seen[id]) continue;
      seen[id] = true;

      let title = (nameA && nameA.text) || "";
      title = title.trim();
      const img = li.querySelector("img");
      let cover = "";
      if (img) {
        cover = img.attributes["data-src"] || img.attributes["src"] || "";
        if (!title) title = (img.attributes["alt"] || "").trim();
      }
      const authorEl = li.querySelector(".neirong .tage") || li.querySelector(".author");
      const author = authorEl ? authorEl.text.trim() : "";
      if (!title) continue;

      comics.push(
        new Comic({
          id,
          title,
          cover: Bukamh.abs(cover),
          subtitle: author,
        }),
      );
    }

    if (comics.length) return comics;

    // 首页 comic_box 网格
    for (const li of document.querySelectorAll(".comic_box li, .likebox li")) {
      const a = li.querySelector("a.txt") || li.querySelector("a.pic") || li.querySelector("a");
      if (!a) continue;
      const href = a.attributes["href"] || "";
      const id = Bukamh.normalizeId(href);
      if (!id || id === "/" || seen[id]) continue;
      if (/\/(custom|category|search|packs|template|api)\b/i.test(id)) continue;
      seen[id] = true;
      let title = (a.text || "").trim() || (a.attributes["title"] || "").trim();
      const img = li.querySelector("img");
      let cover = "";
      if (img) {
        cover = img.attributes["data-src"] || img.attributes["src"] || "";
        if (!title) title = (img.attributes["alt"] || "").trim();
      }
      const authorEl = li.querySelector(".author");
      if (!title) continue;
      comics.push(
        new Comic({
          id,
          title,
          cover: Bukamh.abs(cover),
          subtitle: authorEl ? authorEl.text.trim() : "",
        }),
      );
    }
    return comics;
  }

  static removePkcs7(buffer) {
    const len = buffer.length;
    if (!len) return buffer;
    const pad = buffer[len - 1];
    if (pad > 0 && pad <= 16) return buffer.slice(0, len - pad);
    return buffer;
  }

  static async decryptParams(encryptedParams) {
    const keyBuffer = await Convert.encodeUtf8(Bukamh.paramsKey);
    const decoded = await Convert.decodeBase64(encryptedParams);
    const decodedBytes = new Uint8Array(decoded);
    const ivBytes = decodedBytes.slice(0, 16);
    const ciphertextBytes = decodedBytes.slice(16);
    const decryptedBuffer = await Convert.decryptAesCbc(
      ciphertextBytes.buffer,
      keyBuffer,
      ivBytes.buffer,
    );
    let decryptedBytes = new Uint8Array(decryptedBuffer);
    decryptedBytes = Bukamh.removePkcs7(decryptedBytes);
    const text = await Convert.decodeUtf8(decryptedBytes.buffer);
    return JSON.parse(text);
  }

  static isImageMagic(buf) {
    if (!buf || buf.byteLength < 3) return false;
    const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    // JPEG / PNG / GIF / WEBP
    if (b[0] === 0xff && b[1] === 0xd8) return true;
    if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e) return true;
    if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return true;
    if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46) return true;
    return false;
  }

  explore = [
    {
      title: "最新",
      type: "multiPageComicList",
      load: async (page) => {
        page = page || 1;
        const url =
          page <= 1
            ? `${Bukamh.baseUrl}/custom/update`
            : `${Bukamh.baseUrl}/custom/update/page/${page}`;
        const res = await Network.get(url, Bukamh.headers);
        if (res.status !== 200) throw `Invalid status: ${res.status}`;
        const document = new HtmlDocument(res.body);
        const comics = Bukamh.parseList(document);
        return { comics, maxPage: comics.length >= 20 ? page + 1 : page };
      },
    },
    {
      title: "热门",
      type: "multiPageComicList",
      load: async (page) => {
        page = page || 1;
        const url =
          page <= 1
            ? `${Bukamh.baseUrl}/custom/hot`
            : `${Bukamh.baseUrl}/custom/hot/page/${page}`;
        const res = await Network.get(url, Bukamh.headers);
        if (res.status !== 200) throw `Invalid status: ${res.status}`;
        const document = new HtmlDocument(res.body);
        const comics = Bukamh.parseList(document);
        return { comics, maxPage: comics.length >= 20 ? page + 1 : page };
      },
    },
    {
      title: "完结",
      type: "multiPageComicList",
      load: async (page) => {
        page = page || 1;
        const url =
          page <= 1
            ? `${Bukamh.baseUrl}/custom/end`
            : `${Bukamh.baseUrl}/custom/end/page/${page}`;
        const res = await Network.get(url, Bukamh.headers);
        if (res.status !== 200) throw `Invalid status: ${res.status}`;
        const document = new HtmlDocument(res.body);
        const comics = Bukamh.parseList(document);
        return { comics, maxPage: comics.length >= 20 ? page + 1 : page };
      },
    },
  ];

  search = {
    load: async (keyword, options, page) => {
      page = page || 1;
      const q = encodeURIComponent(String(keyword || "").trim());
      if (!q) return { comics: [], maxPage: 0 };
      // 站点搜索入口：mhsearch('/index.php/search') + ?key=
      let url = `${Bukamh.baseUrl}/index.php/search?key=${q}`;
      if (page > 1) url += `&page=${page}`;
      const res = await Network.get(url, Bukamh.headers);
      if (res.status !== 200) throw `Invalid status: ${res.status}`;
      const document = new HtmlDocument(res.body);
      const comics = Bukamh.parseList(document);
      return { comics, maxPage: comics.length >= 20 ? page + 1 : page };
    },
  };

  comic = {
    loadInfo: async (id) => {
      const path = Bukamh.normalizeId(id);
      const res = await Network.get(Bukamh.baseUrl + path, Bukamh.headers);
      if (res.status !== 200) throw `Invalid status: ${res.status}`;
      const document = new HtmlDocument(res.body);

      const titleEl = document.querySelector(".infobox .title");
      const title = titleEl ? titleEl.text.trim() : path.replace(/^\//, "");
      const coverImg = document.querySelector(".infobox .img img");
      const cover = coverImg
        ? Bukamh.abs(coverImg.attributes["src"] || "")
        : "";

      let author = "";
      let updateTo = "";
      const tags = [];
      for (const p of document.querySelectorAll(".infobox .tage")) {
        const text = (p.text || "").trim();
        if (text.startsWith("作者：") || text.startsWith("作者:")) {
          author = text.replace(/^作者[:：]\s*/, "").trim();
        } else if (text.startsWith("更新至")) {
          updateTo = text.replace(/^更新至[:：]\s*/, "").trim();
        } else if (text.startsWith("类型：") || text.startsWith("类型:")) {
          for (const a of p.querySelectorAll("a")) {
            const t = (a.text || "").trim();
            if (t) tags.push(t);
          }
        }
      }

      const descEl = document.querySelector(".infocomic .text");
      const description = descEl ? descEl.text.trim() : "";

      const chapters = new Map();
      for (const a of document.querySelectorAll(".chapterbox .list a")) {
        const href = a.attributes["href"] || "";
        const chId = Bukamh.normalizeId(href);
        if (!chId || !/\.html$/i.test(chId)) continue;
        const chTitle = (a.text || "").trim() || chId;
        chapters.set(chId, chTitle);
      }

      return new ComicDetails({
        id: path,
        title,
        cover,
        author,
        description,
        tags: { 类型: tags },
        status: "unknown",
        chapters,
        updateTime: updateTo || undefined,
      });
    },

    loadEp: async (comicId, epId) => {
      const path = Bukamh.normalizeId(epId);
      const res = await Network.get(Bukamh.baseUrl + path, Bukamh.headers);
      if (res.status !== 200) throw `Invalid status: ${res.status}`;
      const body = res.body || "";

      const paramsMatch = body.match(/params\s*=\s*'([^']+)'/);
      if (paramsMatch) {
        const data = await Bukamh.decryptParams(paramsMatch[1]);
        const images = (data && data.images) || [];
        if (!images.length) throw "no images in decrypted params";
        return {
          images: images.map((u) => Bukamh.abs(String(u))),
        };
      }

      const document = new HtmlDocument(body);
      const images = [];
      for (const img of document.querySelectorAll("img.lazy-read, #images img")) {
        const src = img.attributes["data-src"] || img.attributes["src"] || "";
        if (/^https?:/i.test(src)) images.push(Bukamh.abs(src));
      }
      if (images.length < 1) throw "no images";
      return { images };
    },

    onImageLoad: (url) => {
      const keyStr = Bukamh.imageKey;
      return {
        url,
        headers: {
          "User-Agent": Bukamh.ua,
          Referer: Bukamh.baseUrl + "/",
          Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        },
        onResponse: (data) => {
          if (Bukamh.isImageMagic(data)) return data;
          const key = Convert.encodeUtf8(keyStr);
          try {
            return Convert.decryptAesCbc(data, key, key);
          } catch (_) {
            return data;
          }
        },
      };
    },

    idMatch: "^/[\\w%-]+$",

    link: {
      domains: ["www.bukamh.com", "bukamh.com"],
      linkToId: (url) => {
        try {
          const u = new URL(url);
          const path = u.pathname.replace(/\/+$/, "") || "/";
          if (path === "/" || /\/(custom|category|search)\b/i.test(path)) {
            return null;
          }
          // 章节页 → 无法反推 slug，返回章节 path 仅作跳转兜底
          if (/\.html$/i.test(path)) return path;
          return path;
        } catch (_) {
          return null;
        }
      },
    },
  };
}
