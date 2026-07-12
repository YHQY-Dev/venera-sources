/** @type {import('./_venera_.js')} */
class GodaMH extends ComicSource {
  // Required metadata
  name = "Goda 漫画";
  key = "godamh";
  version = "1.3.0";
  minAppVersion = "1.0.0";
  url =
    "https://gh-proxy.com/https://raw.githubusercontent.com/Y-Ymeow/venera-configs/main/godamh.js";

  static mangaId = {};

  // Main components (some optional)
  settings = {
    mirror: {
      type: "select",
      title: "镜像网址",
      options: [
        { value: "https://g-mh.org", text: "g-mh.org" },
        { value: "https://m.g-mh.org", text: "m.g-mh.org" },
      ],
      default: "https://baozimh.org",
    },
    refreshGenre: {
      type: "callback",
      title: "刷新分类",
      callback: () => {
        this.fetchGenres();
      },
    },
    enableCache: {
      title: "启用缓存",
      type: "switch",
      default: true,
    },
    cacheDuration: {
      title: "缓存时间 (小时)",
      type: "input",
      default: "1",
    },
    clearCache: {
      title: "清除缓存",
      type: "callback",
      buttonText: "清除",
      callback: () => {
        this.deleteData("cache_timestamps");
        this.deleteData("cache_data");
        this.deleteData("cache_keys");
        UI.showMessage("已清除缓存");
      },
    },
  };

  // Get the base URL from settings
  getBaseUrl() {
    return this.loadSetting("mirror");
  }

  static #chapterImageStd =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  static #chapterImageCustom =
    "_-9876543210abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  static #chapterImageDecodeTable = (() => {
    const table = new Int32Array(128).fill(-1);
    for (let i = 0; i < GodaMH.#chapterImageCustom.length; i++) {
      table[GodaMH.#chapterImageCustom.charCodeAt(i)] =
        GodaMH.#chapterImageStd.charCodeAt(i);
    }
    return table;
  })();

  /** Reverse /api/v2/chapter/getinfo obfuscated image list string to JSON array. */
  _decodeChapterImages(input) {
    const PREFIX = "J7r";
    const MARKER1 = "kD";
    const MARKER2 = "W4s";
    const SUFFIX = "nQ";
    const GROUP = 7;

    if (!input.startsWith(PREFIX) || !input.endsWith(SUFFIX)) {
      throw new Error("未知的章节数据格式");
    }
    const body = input.slice(PREFIX.length, input.length - SUFFIX.length);
    const payloadLen = body.length - MARKER1.length - MARKER2.length;
    if (payloadLen <= 0) throw new Error("未知的章节数据格式");

    const aLen = Math.floor(payloadLen / 3);
    const bLen = Math.floor((payloadLen - aLen) / 2);
    const cLen = payloadLen - aLen - bLen;

    const part1 = body.slice(0, bLen);
    const marker1 = body.slice(bLen, bLen + MARKER1.length);
    const part2 = body.slice(
      bLen + MARKER1.length,
      bLen + MARKER1.length + cLen,
    );
    const marker2 = body.slice(
      bLen + MARKER1.length + cLen,
      bLen + MARKER1.length + cLen + MARKER2.length,
    );
    const part3 = body.slice(bLen + MARKER1.length + cLen + MARKER2.length);
    if (
      marker1 !== MARKER1 ||
      marker2 !== MARKER2 ||
      part3.length !== aLen
    ) {
      throw new Error("未知的章节数据格式");
    }

    const reordered = part3 + part1 + part2;
    let unzigzag = "";
    for (let i = 0, block = 0; i < reordered.length; i += GROUP, block++) {
      const chunk = reordered.slice(i, Math.min(i + GROUP, reordered.length));
      unzigzag +=
        block % 2 === 1 ? chunk.split("").reverse().join("") : chunk;
    }

    let standard = "";
    const table = GodaMH.#chapterImageDecodeTable;
    for (const ch of unzigzag) {
      const mapped =
        ch.charCodeAt(0) < table.length ? table[ch.charCodeAt(0)] : -1;
      if (mapped < 0) throw new Error("无效的章节数据字符");
      standard += String.fromCharCode(mapped);
    }

    const pad = (4 - (standard.length % 4)) % 4;
    const padded = standard + "=".repeat(pad);
    const json = Convert.decodeUtf8(Convert.decodeBase64(padded));
    return JSON.parse(json);
  }

  // --- Cache Implementation ---
  async _withCache(key, fetcher) {
    const enableCache = this.loadSetting("enableCache");
    if (!enableCache) {
      return await fetcher();
    }

    const durationHours = parseFloat(this.loadSetting("cacheDuration") || "1");
    const CACHE_DURATION = durationHours * 60 * 60 * 1000;

    const get = (obj, p) =>
      p.split(".").reduce((acc, part) => acc && acc[part], obj);

    const timestamps = this.loadData("cache_timestamps") || {};
    const cachedTimestamp = get(timestamps, key);
    const data = this.loadData("cache_data") || {};
    const cachedData = get(data, key);

    if (cachedTimestamp && cachedData) {
      const isExpired = Date.now() - cachedTimestamp > CACHE_DURATION;
      if (!isExpired) {
        console.log(`[Cache] HIT: ${key}`);
        return cachedData;
      }
    }

    try {
      console.log(
        `[Cache] ${cachedTimestamp ? "EXPIRED" : "MISS"}: ${key}. Fetching...`,
      );
      const newData = await fetcher();

      const set = (obj, p, val) => {
        const parts = p.split(".");
        const last = parts.pop();
        let current = obj;
        for (const part of parts) {
          if (!current[part]) {
            current[part] = {};
          }
          current = current[part];
        }
        current[last] = val;
        return obj;
      };

      let allTimestamps = this.loadData("cache_timestamps") || {};
      let allData = this.loadData("cache_data") || {};
      let allKeys = this.loadData("cache_keys") || {};

      set(allTimestamps, key, Date.now());
      set(allData, key, newData);
      set(allKeys, key, true);

      this.saveData("cache_timestamps", allTimestamps);
      this.saveData("cache_data", allData);
      this.saveData("cache_keys", allKeys);

      return newData;
    } catch (e) {
      console.error(`[Cache] FETCH FAILED for ${key}: ${e}`);
      if (cachedData) {
        console.log(
          `[Cache] Using STALE data for ${key} due to network error.`,
        );
        return cachedData;
      }
      throw e;
    }
  }

  explore = [
    {
      title: "GoDa 漫画",
      type: "multiPageComicList",
      load: async (page) => {
        const baseUrl = this.getBaseUrl();
        const res = await Network.get(`${baseUrl}/newss/page/${page}`, {
          headers: {
            Referer: `${baseUrl}/`,
          },
        });

        if (res.status !== 200) {
          throw new Error(`Failed to fetch latest updates: ${res.status}`);
        }

        const html = res.body;
        const doc = new HtmlDocument(html);

        const comics = [];
        const comicElements = doc.querySelectorAll(
          ".container > .cardlist .pb-2 a",
        );

        for (const element of comicElements) {
          const img = element.querySelector("img");
          const titleElement = element.querySelector("h3");

          if (img && titleElement) {
            const imgSrc = img.attributes["src"];
            // Extract 'url' parameter from imgSrc without using URL constructor
            let thumbnailUrl = imgSrc;
            if (imgSrc.includes("url=")) {
              const urlParam = imgSrc.match(/[?&]url=([^&]*)/);
              if (urlParam && urlParam[1]) {
                thumbnailUrl = decodeURIComponent(urlParam[1]);
              }
            }

            const comic = new Comic({
              id: element.attributes["href"]
                .substring("/manga/".length)
                .replace(/\/$/, "")
                .trim(),
              title: titleElement.text.trim(),
              cover: thumbnailUrl,
              url: element.attributes["href"],
            });
            comics.push(comic);
          }
        }

        // Check for next page
        const nextPageElement = doc.querySelector(
          'a[aria-label="下一頁"] button, a[aria-label="NEXT"] button',
        );
        const hasNextPage = !!nextPageElement;

        return {
          comics: comics,
          maxPage: hasNextPage ? page + 1 : 1,
        };
      },
    },
  ];

  async fetchGenres() {
    const baseUrl = this.getBaseUrl();
    const res = await Network.get(`${baseUrl}/hots/page/1`, {
      headers: {
        Referer: `${baseUrl}/`,
      },
    });

    if (res.status !== 200) {
      console.error(`Failed to fetch genres: ${res.status}`);
      return [];
    }

    const html = res.body;
    const doc = new HtmlDocument(html);

    // Find the genre elements in the page
    const h2Element = doc.querySelector("h2");
    if (!h2Element) return [];

    const parent = h2Element.parent?.parent;
    if (!parent) return [];

    const genreElements = parent.querySelectorAll("a");
    const genres = [];

    for (const element of genreElements) {
      const text = element.text.trim().replace("#", "");
      // Extract the URL path for the genre
      const href = element.attributes["href"];
      let key = text.toLowerCase();

      // If href exists, extract the category key from it
      if (href) {
        key = href.replace(/^\//, "").trim(); // Get the first part after the leading slash
      }

      const genre = {
        text: text,
        key: key,
      };
      genres.push(genre);
    }

    this.saveData("genres", genres);
    UI.showMessage("分类刷新成功");
  }

  // categories
  category = {
    /// title of the category page, used to identify the page, it should be unique
    title: "GoDa 漫画",
    parts: [
      {
        // title of the part
        name: "动态分类",

        // fixed or random or dynamic
        // if random, need to provide `randomNumber` field, which indicates the number of comics to display at the same time
        // if dynamic, need to provide `loader` field, which indicates the function to load comics
        type: "dynamic",

        loader: () => {
          const genres = this.loadData("genres");
          const categories = [];
          // If we couldn't fetch genres, provide a default list
          if (genres.length > 0) {
            // Add fetched genres as categories
            for (const genre of genres) {
              categories.push({
                label: genre.text,
                target: {
                  page: "category",
                  attributes: {
                    category: genre.key,
                    title: genre.text,
                    param: null,
                  },
                },
              });
            }
          } else {
            categories.push({
              label: "全部",
              /**
               * @type {PageJumpTarget}
               */
              target: {
                page: "category",
                attributes: {},
              },
            });
          }

          return categories;
        },
      },
    ],
    // enable ranking page
    enableRankingPage: false,
  };

  /// category comic loading related
  categoryComics = {
    /**
     * load comics of a category
     * @param category {string} - category name
     * @param param {string?} - category param
     * @param options {string[]} - options from optionList
     * @param page {number} - page number
     * @returns {Promise<{comics: Comic[], maxPage: number}>}
     */
    load: async (category, param, options, page) => {
      if (category === "all" || !category) {
        // If 'all' or no category specified, return popular manga
        const baseUrl = this.getBaseUrl();
        let cate = "manga";
        const res = await Network.get(`${baseUrl}/${cate}/page/${page}`, {
          headers: {
            Referer: `${baseUrl}/`,
          },
        });

        if (res.status !== 200) {
          throw new Error(`Failed to fetch popular manga: ${res.status}`);
        }

        const html = res.body;
        const doc = new HtmlDocument(html);

        const comics = [];
        const comicElements = doc.querySelectorAll(
          ".container > .cardlist .pb-2 a",
        );

        for (const element of comicElements) {
          const img = element.querySelector("img");
          const titleElement = element.querySelector("h3");

          if (img && titleElement) {
            const imgSrc = img.attributes["src"];
            // Extract 'url' parameter from imgSrc without using URL constructor
            let thumbnailUrl = imgSrc;
            if (imgSrc.includes("url=")) {
              const urlParam = imgSrc.match(/[?&]url=([^&]*)/);
              if (urlParam && urlParam[1]) {
                thumbnailUrl = decodeURIComponent(urlParam[1]);
              }
            }

            const comic = new Comic({
              id: element.attributes["href"]
                .substring("/manga/".length)
                .replace(/\/$/, "")
                .trim(),
              title: titleElement.text.trim(),
              cover: thumbnailUrl,
              url: element.attributes["href"],
            });
            comics.push(comic);
          }
        }

        // Check for next page
        const nextPageElement = doc.querySelector(
          'a[aria-label="下一頁"] button, a[aria-label="NEXT"] button',
        );
        const hasNextPage = !!nextPageElement;

        return {
          comics: comics,
          maxPage: hasNextPage ? page + 1 : page, // Convert hasNextPage to maxPage format
        };
      } else {
        // For category filtering, we need to use the category key that corresponds to a URL
        const baseUrl = this.getBaseUrl();
        // In the original implementation, category keys are URLs
        const categoryPath = category.startsWith("/")
          ? category
          : `/${category}`;
        const res = await Network.get(
          `${baseUrl}${categoryPath}/page/${page}`,
          {
            headers: {
              Referer: `${baseUrl}/`,
            },
          },
        );

        if (res.status !== 200) {
          throw new Error(`Failed to fetch category manga: ${res.status}`);
        }

        const html = res.body;
        const doc = new HtmlDocument(html);

        const comics = [];
        const comicElements = doc.querySelectorAll(
          ".container > .cardlist .pb-2 a",
        );

        for (const element of comicElements) {
          const img = element.querySelector("img");
          const titleElement = element.querySelector("h3");

          if (img && titleElement) {
            const imgSrc = img.attributes["src"];
            // Extract 'url' parameter from imgSrc without using URL constructor
            let thumbnailUrl = imgSrc;
            if (imgSrc.includes("url=")) {
              const urlParam = imgSrc.match(/[?&]url=([^&]*)/);
              if (urlParam && urlParam[1]) {
                thumbnailUrl = decodeURIComponent(urlParam[1]);
              }
            }

            const comic = new Comic({
              id: element.attributes["href"]
                .substring("/manga/".length)
                .replace(/\/$/, "")
                .trim(),
              title: titleElement.text.trim(),
              cover: thumbnailUrl,
              url: element.attributes["href"],
            });
            comics.push(comic);
          }
        }

        // Check for next page
        const nextPageElement = doc.querySelector(
          'a[aria-label="下一頁"] button, a[aria-label="NEXT"] button',
        );
        const hasNextPage = !!nextPageElement;

        return {
          comics: comics,
          maxPage: hasNextPage ? page + 1 : page, // Convert hasNextPage to maxPage format
        };
      }
    },
    // [Optional] provide options for category comic loading
    optionList: [
      {
        // [Optional] The label will not be displayed if it is empty.
        label: "",
        // For a single option, use `-` to separate the value and text, left for value, right for text
        options: ["newToOld-最新发布", "oldToNew-最早发布"],
        // [Optional] {string[]} - show this option only when the category not in the list
        notShowWhen: null,
        // [Optional] {string[]} - show this option only when the category in the list
        showWhen: null,
      },
    ],
    /**
     * [Optional] load options dynamically. If `optionList` is provided, this will be ignored.
     * @since 1.5.0
     * @param category {string}
     * @param param {string?}
     * @return {Promise<{options: string[], label?: string}[]>} - return a list of option group, each group contains a list of options
     */
    optionLoader: async (category, param) => {
      return [
        {
          // [Optional] The label will not be displayed if it is empty.
          label: "",
          // For a single option, use `-` to separate the value and text, left for value, right for text
          options: ["newToOld-最新发布", "oldToNew-最早发布"],
        },
      ];
    },
    ranking: {
      // For a single option, use `-` to separate the value and text, left for value, right for text
      options: ["day-Day", "week-Week"],
      /**
       * load ranking comics
       * @param option {string} - option from optionList
       * @param page {number} - page number
       * @returns {Promise<{comics: Comic[], maxPage: number}>}
       */
      load: async (option, page) => {
        // Ranking function would go here if implemented
      },
    },
  };

  search = {
    load: async (query, options, page) => {
      if (!query || query.trim() === "") {
        return {
          comics: [],
          hasNextPage: false,
        };
      }

      const baseUrl = this.getBaseUrl();
      const encodedQuery = encodeURIComponent(query);
      const res = await Network.get(
        `${baseUrl}/s/${encodedQuery}?page=${page}`,
        {
          headers: {
            Referer: `${baseUrl}/`,
          },
        },
      );

      if (res.status !== 200) {
        throw new Error(`Failed to search: ${res.status}`);
      }

      const html = res.body;
      const doc = new HtmlDocument(html);

      const comics = [];
      const comicElements = doc.querySelectorAll(
        ".container > .cardlist .pb-2 a",
      );

      for (const element of comicElements) {
        const img = element.querySelector("img");
        const titleElement = element.querySelector("h3");

        if (img && titleElement) {
          const imgSrc = img.attributes["src"];
          // Extract 'url' parameter from imgSrc without using URL constructor
          let thumbnailUrl = imgSrc;
          if (imgSrc.includes("url=")) {
            const urlParam = imgSrc.match(/[?&]url=([^&]*)/);
            if (urlParam && urlParam[1]) {
              thumbnailUrl = decodeURIComponent(urlParam[1]);
            }
          }

          const comic = new Comic({
            id: element.attributes["href"]
              .substring("/manga/".length)
              .replace(/\/$/, "")
              .trim(),
            title: titleElement.text.trim(),
            cover: thumbnailUrl,
            url: element.attributes["href"],
          });
          comics.push(comic);
        }
      }

      // Check for next page
      const nextPageElement = doc.querySelector(
        'a[aria-label="下一頁"] button, a[aria-label="NEXT"] button',
      );
      const hasNextPage = !!nextPageElement;

      return {
        comics: comics,
        maxPage: hasNextPage ? page + 1 : page,
      };
    },
    // enable tags suggestions
    enableTagsSuggestions: false,
  };

  comic = {
    loadInfo: async (mangaUrl) => {
      const cacheKey = `comic.${mangaUrl}.info`;
      return this._withCache(cacheKey, async () => {
        const baseUrl = this.getBaseUrl();

        // Get the manga page
        const mangaPageRes = await Network.get(`${baseUrl}/manga/${mangaUrl}`, {
          headers: {
            Referer: `${baseUrl}/`,
          },
        });

        if (mangaPageRes.status !== 200) {
          throw new Error(`Failed to load manga page: ${mangaPageRes.status}`);
        }

        const html = mangaPageRes.body;
        const doc = new HtmlDocument(html);

        // Extract cover
        let cover = "";

        // Extract title
        const titleElement = doc.querySelector("h1");
        let title = titleElement ? titleElement.text.trim() : "Unknown Title";

        // Extract author
        const authorElement = doc.querySelector('a[href*="/manga-author/"]');
        const author = authorElement ? [authorElement.text.trim()] : [];

        // Extract status
        const statusSpans = doc.querySelectorAll("h1 span");

        let status = [];
        for (const span of statusSpans) {
          if (
            span.text.includes("連載") ||
            span.text.includes("完結") ||
            span.text.includes("休刊")
          ) {
            title = title.replace(span.text, "");
            status = [span.text.trim()];
            break;
          }
        }

        // Extract genres/tags
        const genres = [];
        const genreElements = doc.querySelectorAll('a[href*="/manga-tag/"]');
        for (const genreElement of genreElements) {
          genres.push(genreElement.text.trim());
        }

        // Extract description
        const descElement = doc.querySelector("p.line-clamp-4");
        const description = descElement ? descElement.text.trim() : "";

        // Extract manga ID from the page for API call
        const mangaIdElement = doc.querySelector(
          "#mangachapters, #chaplistlast",
        );
        let mangaId = null;
        if (mangaIdElement) {
          mangaId = mangaIdElement.attributes["data-mid"];
        }

        // If we couldn't get the manga ID from the page, try other selectors
        if (!mangaId) {
          const bookmarkData = doc.querySelector("#bookmarkData");
          if (bookmarkData) {
            mangaId = bookmarkData.attributes["data-mid"];
          }
        }

        // Get detailed chapter info from API using the manga ID
        const chapters = new Map();
        let updateTime = "";

        const apiRes = await fetch(
          `https://api-get-v3.mgsearcher.com/api/manga/get?mid=${mangaId}&mode=all&t=${Date.now()}`,
          {
            headers: {
              Referer: `${baseUrl}/`,
              Origin: `${baseUrl}/`,
              Connection: "keep-alive",
              "Sec-GPC": 1,
              Pragma: "no-cache",
              "Content-Type": "application/json",
            },
          },
        );

        if (apiRes.status === 200) {
          const apiJson = await apiRes.json();
          cover = apiJson.data.cover;
          title = apiJson.data.title;
          const apiChapters = apiJson.data?.chapters;

          updateTime = apiChapters[apiChapters.length - 1].attributes.updatedAt
            .replace("T", " ")
            .replace("Z", "");
          if (apiChapters) {
            // The API returns chapters as an indexed object
            for (const key in apiChapters) {
              if (apiChapters.hasOwnProperty(key)) {
                const chapterData = apiChapters[key];
                const chapterId = chapterData.id;
                const chapterTitle = chapterData.attributes.title;
                // Use chapterId/mangaId format to maintain consistency
                chapters.set(`${chapterId}`, chapterTitle);
              }
            }
          }
        }

        Goda.mangaId[mangaUrl] = mangaId;
        // Create ComicDetails
        const details = new ComicDetails({
          id: mangaId, // Using mangaUrl as the ID since we're not using API
          title,
          cover,
          description,
          tags: {
            作者: author,
            状态: status,
            标签: genres,
          },
          chapters: chapters,
          updateTime,
        });

        return details;
      });
    },

    loadEp: async (comicId, epId) => {
      const baseUrl = this.getBaseUrl();

      let mangaId;
      let chapterId;
      if (epId.includes("/")) {
        // Extract chapter ID from epId (format is chapterId/mangaId)
        [chapterId, mangaId] = epId.split("/");
      } else {
        mangaId = Goda.mangaId[comicId];
        chapterId = epId;
      }

      if (!mangaId || !chapterId) {
        throw new Error("请刷新漫画");
      }

      const apiRes = await fetch(
        `https://api-get-v3.mgsearcher.com/api/v2/chapter/getinfo?m=${mangaId}&c=${chapterId}&t=${Date.now()}`,
        {
          headers: {
            Referer: `${baseUrl}/`,
            Origin: `${baseUrl}/`,
            Connection: "keep-alive",
            "Sec-GPC": 1,
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        },
      );

      if (apiRes.status !== 200) {
        throw new Error(`Failed to load chapter: ${apiRes.status}`);
      }

      const jsonData = await apiRes.json();
      const encrypted = jsonData?.data?.info?.images?.images;
      if (!encrypted || typeof encrypted !== "string") {
        throw new Error("Invalid API response format");
      }

      const imageList = this._decodeChapterImages(encrypted);
      const imageHost = "https://t40-1-4.g-mh.online";
      const images = [];

      for (const item of imageList) {
        let imageUrl = item && item.url;
        if (!imageUrl) continue;
        if (imageUrl.startsWith("/")) {
          imageUrl = imageHost + imageUrl;
        }
        images.push(imageUrl);
      }

      if (!images.length) {
        throw new Error("No images in chapter");
      }

      return { images };
    },

    onThumbnailLoad: (url) => {
      return {
        url: url,
        headers: {
          Referer: this.getBaseUrl(),
          Pragma: "no-cache",
        },
      };
    },
    onImageLoad: (url) => {
      return {
        url: url,
        headers: {
          Referer: this.getBaseUrl(),
          Pragma: "no-cache",
        },
      };
    },
  };
}