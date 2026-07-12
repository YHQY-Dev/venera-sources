/** @type {import('./_venera_.js')} */
class RuManHua extends ComicSource {
  name = "如漫画";
  key = "rumanhua";
  version = "1.1.0";
  minAppVersion = "1.4.0";

  url =
    "https://gh-proxy.com/https://raw.githubusercontent.com/Y-Ymeow/venera-configs/main/rumanhua.js";
  domain = "https://www.rumanhua.org";

  #picScriptCache = null;
  #decryptionKeysCache = null;

  explore = [
    {
      title: "最新更新",
      type: "multiPageComicList",
      load: async (page) => {
        const url = `${this.domain}/category/order/addtime${page > 1 ? `/page/${page}` : ""}`;
        const res = await Network.get(url);
        if (res.status !== 200) {
          throw `HTTP Error ${res.status}`;
        }
        const document = new HtmlDocument(res.body);
        const comics = this.parseComicList(document);
        const maxPage = this.parseMaxPage(document);
        return {
          comics: comics,
          maxPage: maxPage,
        };
      },
    },
  ];

  async _init() {
    var tpl_path = "/template/pc/32/",
      params =
        "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";

    this.decryptParams(params, await this.aesKey());
  }

  init() {
    this._init();
  }

  parseComicList(document) {
    const comicElements = document.querySelectorAll(".list > .item");
    const comics = [];
    for (const element of comicElements) {
      let temp = this.parseComic(element);
      if (temp) {
        comics.push(temp);
      }
    }
    return comics;
  }

  parseComic(element) {
    const linkElement = element.querySelector(".info a");
    if (linkElement) {
      const id = linkElement.attributes["href"];
      const title = linkElement.attributes["title"];

      const imgElement = element.querySelector(".img img");
      const cover = imgElement.attributes["src"];

      const latestChapterElement = element.querySelector(".tip");
      const subTitle = latestChapterElement ? latestChapterElement.text : "";

      const descriptionElement = element.querySelector(".info .line .ibcont");
      const description = descriptionElement ? descriptionElement.text : "";

      const tagElements = element.querySelectorAll(
        ".info .line a[href*='/tags/']",
      );
      const tags = tagElements.map((a) => a.text.trim());

      return new Comic({
        id: id,
        title: title,
        subTitle: subTitle,
        cover: cover,
        tags: tags,
        description: description,
      });
    }
    return null;
  }

  parseMaxPage(document) {
    const pageLinks = document.querySelectorAll(".divpage a.end");
    if (pageLinks.length > 0) {
      const href = pageLinks[0].attributes["href"];
      if (href) {
        const match = href.match(/page\/(\d+)/);
        if (match) {
          return parseInt(match[1], 10);
        }
      }
    }

    const onPage = document.querySelector(".divpage a.on");
    if (onPage) {
      return parseInt(onPage.text, 10);
    }

    return 1;
  }

  search = {
    load: async (keyword, options, page) => {
      return {
        comics: [],
        maxPage: 0,
      };
    },
  };

  comic = {
    loadInfo: async (id) => {
      const res = await Network.get(this.domain + id);
      if (res.status !== 200) {
        throw `HTTP Error ${res.status}`;
      }
      const document = new HtmlDocument(res.body);

      const title = document
        .querySelector(".comicInfo .title")
        .text.replace(/.*?分/g, "")
        .trim();
      const cover = document.querySelector(".comicInfo .cover .img img")
        .attributes["src"];

      const infoElements = document.querySelectorAll(".comicInfo .info p");
      let author = "";
      let tags = [];
      let status = "unknown";

      infoElements.forEach((p) => {
        const text = p.text;
        if (text.includes("作  者：")) {
          author = text.replace("作  者：", "").trim();
        } else if (text.includes("类  别：")) {
          p.querySelectorAll("a").forEach((a) => tags.push(a.text.trim()));
        } else if (text.includes("状  态：")) {
          const statusText = text.replace("状  态：", "").trim();
          if (statusText === "连载中") {
            status = "ongoing";
          } else if (statusText === "已完结") {
            status = "completed";
          }
        }
      });

      const description = document
        .querySelector(".comicInfo .info .content")
        .text.trim();

      const chapterElements = document.querySelectorAll(
        "#chapterlistload .list a",
      );
      const chapters = new Map();
      chapterElements.forEach((el) => {
        const chapterId = el.attributes["href"];
        const chapterTitle = el.text.trim();
        chapters.set(chapterId, chapterTitle);
      });

      return new ComicDetails({
        id: id,
        title: title,
        cover: cover,
        author: author,
        description: description,
        tags: { 类型: tags },
        status: status,
        chapters: chapters,
      });
    },

    loadEp: async (comicId, epId) => {
      const res = await Network.get(this.domain + epId);
      if (res.status !== 200) {
        throw `HTTP Error ${res.status}`;
      }

      const body = res.body;
      const paramsMatch = body.match(/params = '([^']+)';/);

      if (!paramsMatch || paramsMatch.length < 2) {
        const imageElements = new HtmlDocument(body).querySelectorAll(
          "#images img.lazy-read",
        );
        const images = imageElements.map((el) => el.attributes["data-src"]);
        return { images };
      }

      const encryptedParams = paramsMatch[1];
      const keys = await this.getDecryptionKeys();
      const decrypted = await this.decryptParams(
        encryptedParams,
        keys.decryptParamsKey,
      );

      const images = decrypted.images;

      return { images };
    },

    onImageLoad: (url, comicId, epId) => {
      return {
        url,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36 Edg/103.0.1264.71",
          Referer: this.domain,
          Accept:
            "image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
          "Cache-Control": "max-age=0",
          Connection: "keep-alive",
          "Upgrade-Insecure-Requests": "1",
        },
      };
    },

    idMatch: "/news/\\d+",

    link: {
      domains: ["www.rumanhua.org"],
      linkToId: (url) => {
        const match = url.match(/\/news\/\d+/);
        return match ? match[0] : null;
      },
    },
  };

  // --- Decryption Logic ---
  async getDecryptionKeys() {
    if (this.#decryptionKeysCache) {
      return this.#decryptionKeysCache;
    }

    const decryptParamsKey = await this.aesKey();

    this.#decryptionKeysCache = {
      decryptParamsKey: decryptParamsKey,
    };
    return this.#decryptionKeysCache;
  }

  // Obfuscated key - decoded at runtime
  async aesKey() {
    // This key is obfuscated to avoid being easily extracted
    const encodedKey = "OVM4JHZKblUyQU5lU1JvRg==";
    return await Convert.decodeUtf8(await Convert.decodeBase64(encodedKey));
  }
  removePkcs7Padding(buffer) {
    const len = buffer.length;
    const pad = buffer[len - 1];
    if (pad <= 16) {
      return buffer.slice(0, len - pad);
    }
    return buffer;
  }

  async decryptParams(encryptedParams, key) {
    try {
      // 1. Key 固定
      const keyStr = key; // "9S8$vJnU2ANeSRoF";
      const keyBuffer = await Convert.encodeUtf8(keyStr);
      // 2. Base64 decode
      const decoded = await Convert.decodeBase64(encryptedParams); // ArrayBuffer
      try {
        // 3. 取 IV 和 ciphertext
        const decodedBytes = new Uint8Array(decoded);
        const ivBytes = decodedBytes.slice(0, 16); // 前16字节
        const ciphertextBytes = decodedBytes.slice(16); // 剩余部分

        // 4. CBC 解密
        const decryptedBuffer = await Convert.decryptAesCbc(
          ciphertextBytes.buffer,
          keyBuffer,
          ivBytes.buffer,
        );
        // 5. 转 UTF-8
        let decryptedBytes = new Uint8Array(decryptedBuffer);
        decryptedBytes = this.removePkcs7Padding(decryptedBytes); // 去掉 PKCS7

        const decryptedText = await Convert.decodeUtf8(decryptedBytes.buffer);

        return JSON.parse(decryptedText);
      } catch (e) {
        console.warn(" An error occurred during decryption 2:" + e.message);
      }

      return [];
    } catch (e) {
      console.error("An error occurred during decryption:" + e.message);
      return [];
    }
  }
}
