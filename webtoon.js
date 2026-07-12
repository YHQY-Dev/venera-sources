/** @type {import('./_venera_.js')} */

class WebtoonComicSource extends ComicSource {
  // name of the source
  name = "Webtoon";

  // unique id of the source
  key = "webtoon";

  version = "1.1.1";

  minAppVersion = "1.4.0";

  // update url
  url =
    "https://gh-proxy.com/https://raw.githubusercontent.com/Y-Ymeow/venera-configs/main/webtoon.js";

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

  /**
   * 提取Webtoon URL中的路径和title_no
   * @param {string} url - Webtoon URL字符串
   * @returns {string} - 格式化后的路径和title_no字符串，格式为"path:titleNo"
   */
  extractWebtoonPathAndId(url) {
    const lang = this.loadSetting("language") || "en";
    // 提取host和list/viewer之间的路径
    const pathMatch = url.match(/\/([^\/]+)\/([^\/]+)\/(list|viewer)/i);
    if (!pathMatch) {
      throw new Error("无法从URL中提取路径");
    }
    const path = `${pathMatch[1]}/${pathMatch[2]}`;

    // 提取title_no
    const titleNoMatch = url.match(/[?&]title_no=([^&]*)/i);
    if (!titleNoMatch) {
      throw new Error("无法从URL中提取title_no");
    }
    const titleNo = titleNoMatch[1];

    return `${path}:${titleNo}`;
  }

  /**
   * 生成Webtoon URL
   * @param {string} host - 基础主机（例如"https://www.webtoons.com"）
   * @param {string} lang - 语言代码（例如"zh-hant"）
   * @param {string} pathAndId - 由extractWebtoonPathAndId返回的"path:titleNo"格式字符串
   * @param {string} episodeNo - 剧集编号（可选）
   * @param {string} episodeTitle - 剧集标题（URL编码后的，可选）
   * @returns {string} - 完整的URL字符串
   */
  generateEpisodeUrl(pathAndId, episodeNoAndTitle = null) {
    const lang = this.loadSetting("language") || "en";
    const [path, titleNo] = pathAndId.split(":");

    if (episodeNoAndTitle) {
      const parts = episodeNoAndTitle.split("-");
      const episodeNo = parts[0];
      const episodeTitle = parts.slice(1).join(":");
      return `https://www.webtoons.com/${lang}/${path}/${episodeTitle}/viewer?title_no=${titleNo}&episode_no=${episodeNo}`;
    } else {
      // 如果没有剧集编号和标题，返回列表页面URL
      return `https://m.webtoons.com/${lang}/${path}/list?title_no=${titleNo}`;
    }
  }
  /**
   * [Optional] init function
   */
  init() {
    // Set up necessary cookies for Webtoon access
    const lang = this.loadSetting("language") || "en";
    Network.setCookies("https://www.webtoons.com", [
      new Cookie({
        name: "ageGatePass",
        value: "true",
        domain: "webtoons.com",
      }),
      new Cookie({ name: "locale", value: lang, domain: "webtoons.com" }),
      new Cookie({ name: "needGDPR", value: "false", domain: "webtoons.com" }),
    ]);
  }

  // explore page list
  explore = [
    {
      // title of the page.
      // title is used to identify the page, it should be unique
      title: "Webtoon",

      /// multiPartPage or multiPageComicList or mixed
      type: "multiPartPage",

      /**
       * load function
       * @param page {number | null} - page number, null for `singlePageWithMultiPart` type
       * @returns {{}}
       * - for `multiPartPage` type, return [{title: string, comics: Comic[], viewMore: PageJumpTarget}]
       * - for `multiPageComicList` type, for each page(1-based), return {comics: Comic[], maxPage: number}
       * - for `mixed` type, use param `page` as index. for each index(0-based), return {data: [], maxPage: number?}, data is an array contains Comic[] or {title: string, comics: Comic[], viewMore: string?}
       */
      load: async (page) => {
        const lang = this.loadSetting("language") || "en";
        const baseUrl = `https://www.webtoons.com/${lang}/`;

        // Set up cookies first to ensure proper access
        Network.setCookies("https://www.webtoons.com", [
          new Cookie({
            name: "ageGatePass",
            value: "true",
            domain: "webtoons.com",
          }),
          new Cookie({ name: "locale", value: lang, domain: "webtoons.com" }),
          new Cookie({
            name: "needGDPR",
            value: "false",
            domain: "webtoons.com",
          }),
        ]);

        const results = [];

        // First section: Trending
        try {
          const trendingUrl = `${baseUrl}ranking/trending`;

          const res = await Network.get(trendingUrl, {
            Referer: `https://www.webtoons.com/${lang}/`,
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          });

          if (res.status === 200) {
            const document = new HtmlDocument(res.body);
            const comicElements =
              document.querySelectorAll(".webtoon_list li a");

            const comics = [];
            for (const element of comicElements) {
              const titleElement = element.querySelector(".title");
              const coverElement = element.querySelector("img");
              const authorElement = element.querySelector(".author");

              if (titleElement && coverElement) {
                const title = titleElement.text;
                const author = authorElement ? authorElement.text : "";
                const cover =
                  coverElement.attributes["src"] ||
                  coverElement.attributes["data-url"];
                const href = element.attributes["href"];
                const fullUrl = href.startsWith("http")
                  ? href
                  : `https://www.webtoons.com${href}`;

                comics.push(
                  new Comic({
                    id: this.extractWebtoonPathAndId(fullUrl),
                    title: title,
                    subTitle: author,
                    cover: cover,
                    tags: [],
                    description: "",
                  }),
                );
              }
            }

            results.push({
              title: "Trending",
              comics: comics,
              viewMore: {
                page: "category",
                attributes: {
                  category: "trending",
                  param: null,
                },
              },
            });

            document.dispose();
          }
        } catch (e) {
          console.error(["Error loading Trending section:", e]);
        }

        // Add latest updates as the last section
        try {
          const day = [
            "sunday",
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
          ][new Date().getDay()];
          const latestUrl = `${baseUrl}originals/${day}?sortOrder=UPDATE`;

          const res = await Network.get(latestUrl, {
            Referer: `https://www.webtoons.com/${lang}/`,
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          });

          if (res.status === 200) {
            const document = new HtmlDocument(res.body);
            const comicElements =
              document.querySelectorAll(".webtoon_list li a");

            const comics = [];
            for (const element of comicElements) {
              const titleElement = element.querySelector(".title");
              const coverElement = element.querySelector("img");
              const authorElement = element.querySelector(".author");

              if (titleElement && coverElement) {
                const title = titleElement.text;
                const author = authorElement ? authorElement.text : "";
                const cover =
                  coverElement.attributes["src"] ||
                  coverElement.attributes["data-url"];
                const href = element.attributes["href"];
                const fullUrl = href.startsWith("http")
                  ? href
                  : `https://www.webtoons.com${href}`;

                comics.push(
                  new Comic({
                    id: this.extractWebtoonPathAndId(fullUrl), // Use the full URL as the ID
                    title: title,
                    subTitle: author,
                    cover: cover,
                    tags: [],
                    description: "",
                  }),
                );
              }
            }

            results.push({
              title: "Latest Updates",
              comics: comics,
              viewMore: {
                page: "category",
                attributes: {
                  category: "latest",
                  param: day,
                },
              },
            });

            document.dispose();
          }
        } catch (e) {
          console.error(["Error loading Latest Updates section:", e]);
        }

        return results;
      },

      /**
       * Only use for `multiPageComicList` type.
       * `loadNext` would be ignored if `load` function is implemented.
       * @param next {string | null} - next page token, null if first page
       * @returns {Promise<{comics: Comic[], next: string?}>} - next is null if no next page.
       */
      loadNext(next) {},
    },
  ];

  // categories
  category = {
    /// title of the category page, used to identify the page, it should be unique
    title: "Webtoon",
    parts: [
      {
        // title of the part
        name: "Genre",

        // fixed or random or dynamic
        // if random, need to provide `randomNumber` field, which indicates the number of comics to display at the same time
        // if dynamic, need to provide `loader` field, which indicates the function to load comics
        type: "fixed",

        // Remove this if type is dynamic
        categories: [
          {
            label: "Romance",
            /**
             * @type {PageJumpTarget}
             */
            target: {
              page: "category",
              attributes: {
                category: "romance",
                param: null,
              },
            },
          },
          {
            label: "Action",
            /**
             * @type {PageJumpTarget}
             */
            target: {
              page: "category",
              attributes: {
                category: "action",
                param: null,
              },
            },
          },
          {
            label: "Comedy",
            /**
             * @type {PageJumpTarget}
             */
            target: {
              page: "category",
              attributes: {
                category: "comedy",
                param: null,
              },
            },
          },
          {
            label: "Fantasy",
            /**
             * @type {PageJumpTarget}
             */
            target: {
              page: "category",
              attributes: {
                category: "fantasy",
                param: null,
              },
            },
          },
          {
            label: "Drama",
            /**
             * @type {PageJumpTarget}
             */
            target: {
              page: "category",
              attributes: {
                category: "drama",
                param: null,
              },
            },
          },
          {
            label: "Slice of Life",
            /**
             * @type {PageJumpTarget}
             */
            target: {
              page: "category",
              attributes: {
                category: "slice_of_life",
                param: null,
              },
            },
          },
          {
            label: "Superhero",
            /**
             * @type {PageJumpTarget}
             */
            target: {
              page: "category",
              attributes: {
                category: "superhero",
                param: null,
              },
            },
          },
          {
            label: "Historical",
            /**
             * @type {PageJumpTarget}
             */
            target: {
              page: "category",
              attributes: {
                category: "historical",
                param: null,
              },
            },
          },
          {
            label: "Sports",
            /**
             * @type {PageJumpTarget}
             */
            target: {
              page: "category",
              attributes: {
                category: "sports",
                param: null,
              },
            },
          },
          {
            label: "Informative",
            /**
             * @type {PageJumpTarget}
             */
            target: {
              page: "category",
              attributes: {
                category: "informative",
                param: null,
              },
            },
          },
        ],

        // number of comics to display at the same time
        // randomNumber: 5,

        // load function for dynamic type
        // loader: async () => {
        //     return [
        //          // ...
        //     ]
        // }
      },
    ],
    // enable ranking page
    enableRankingPage: true,
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
      const lang = this.loadSetting("language") || "en";
      let url = "";

      // Set up cookies first to ensure proper access
      Network.setCookies("https://www.webtoons.com", [
        new Cookie({
          name: "ageGatePass",
          value: "true",
          domain: "webtoons.com",
        }),
        new Cookie({ name: "locale", value: lang, domain: "webtoons.com" }),
        new Cookie({
          name: "needGDPR",
          value: "false",
          domain: "webtoons.com",
        }),
      ]);

      // Special handling for different categories
      if (
        category === "trending" ||
        category === "popular" ||
        category === "originals" ||
        category === "canvas"
      ) {
        const rankingMap = {
          trending: "trending",
          popular: "popular",
          originals: "originals",
          canvas: "canvas",
        };
        url = `https://www.webtoons.com/${lang}/ranking/${rankingMap[category]}?page=${page}`;
      } else if (category === "latest") {
        // Handle latest updates by day
        const day =
          param ||
          [
            "sunday",
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
          ][new Date().getDay()];
        url = `https://www.webtoons.com/${lang}/originals/${day}?sortOrder=UPDATE&page=${page}`;
      } else {
        // Map category names to actual URLs
        const categoryMap = {
          romance: "romance",
          action: "action",
          comedy: "comedy",
          fantasy: "fantasy",
          drama: "drama",
          slice_of_life: "slice-of-life",
          superhero: "super-hero",
          historical: "historical",
          sports: "sports",
          informative: "informative",
        };

        const sortOption = options[0] || "POPULAR"; // Default to popular
        const sortParam = sortOption === "LATEST" ? "UPDATE" : "POPULAR";

        url = `https://www.webtoons.com/${lang}/${categoryMap[category]}?sortOrder=${sortParam}&page=${page}`;
      }

      const res = await Network.get(url, {
        Referer: `https://www.webtoons.com/${lang}/`,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      });

      if (res.status !== 200) {
        throw `Invalid status code: ${res.status}`;
      }

      const document = new HtmlDocument(res.body);
      const comicElements = document.querySelectorAll(".webtoon_list li a");

      const comics = [];
      for (const element of comicElements) {
        const titleElement = element.querySelector(".title");
        const coverElement = element.querySelector("img");
        const authorElement = element.querySelector(".author");

        if (titleElement && coverElement) {
          const title = titleElement.text;
          const author = authorElement ? authorElement.text : "";
          const cover =
            coverElement.attributes["src"] ||
            coverElement.attributes["data-url"];
          const href = element.attributes["href"];
          const fullUrl = href.startsWith("http")
            ? href
            : `https://www.webtoons.com${href}`;

          comics.push(
            new Comic({
              id: this.extractWebtoonPathAndId(fullUrl), // Use the full URL as the ID
              title: title,
              subTitle: author,
              cover: cover,
              tags: [],
              description: "",
            }),
          );
        }
      }

      // Check if there's a next page
      const hasNextPage = document.querySelector("a.pg_next") !== null;
      const maxPage = hasNextPage ? page + 1 : page;

      document.dispose();

      return {
        comics: comics,
        maxPage: maxPage,
      };
    },
    // [Optional] provide options for category comic loading
    optionList: [
      {
        // [Optional] The label will not be displayed if it is empty.
        label: "Sort",
        // For a single option, use `-` to separate the value and text, left for value, right for text
        options: ["POPULAR-Popular", "LATEST-Latest"],
        // [Optional] {string[]} - show this option only when the category not in the list
        notShowWhen: ["trending", "popular", "originals", "canvas", "latest"],
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
      if (
        ["trending", "popular", "originals", "canvas", "latest"].includes(
          category,
        )
      ) {
        return []; // No options for ranking pages and latest updates
      }

      return [
        {
          // [Optional] The label will not be displayed if it is empty.
          label: "Sort",
          // For a single option, use `-` to separate the value and text, left for value, right for text
          options: ["POPULAR-Popular", "LATEST-Latest"],
        },
      ];
    },
    ranking: {
      // For a single option, use `-` to separate the value and text, left for value, right for text
      options: ["week-Week", "month-Month", "all-All Time"],
      /**
       * load ranking comics
       * @param option {string} - option from optionList
       * @param page {number} - page number
       * @returns {Promise<{comics: Comic[], maxPage: number}>}
       */
      load: async (option, page) => {
        const lang = this.loadSetting("language") || "en";
        const periodMap = {
          week: "weekly",
          month: "monthly",
          all: "alltime",
        };

        const url = `https://www.webtoons.com/${lang}/challenge/${periodMap[option]}?genreFilter=ALL&page=${page}`;

        // Set up cookies first to ensure proper access
        Network.setCookies("https://www.webtoons.com", [
          new Cookie({
            name: "ageGatePass",
            value: "true",
            domain: "webtoons.com",
          }),
          new Cookie({ name: "locale", value: lang, domain: "webtoons.com" }),
          new Cookie({
            name: "needGDPR",
            value: "false",
            domain: "webtoons.com",
          }),
        ]);

        const res = await Network.get(url, {
          Referer: `https://www.webtoons.com/${lang}/`,
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        });

        if (res.status !== 200) {
          throw `Invalid status code: ${res.status}`;
        }

        const document = new HtmlDocument(res.body);
        const comicElements = document.querySelectorAll(
          ".challenge_list .item a",
        );

        const comics = [];
        for (const element of comicElements) {
          const titleElement = element.querySelector(".subj span");
          const coverElement = element.querySelector("img");
          const authorElement = element.querySelector(".author");

          if (titleElement && coverElement) {
            const title = titleElement.text;
            const author = authorElement ? authorElement.text : "";
            const cover =
              coverElement.attributes["src"] ||
              coverElement.attributes["data-url"];
            const href = element.attributes["href"];
            const fullUrl = href.startsWith("http")
              ? href
              : `https://www.webtoons.com${href}`;

            comics.push(
              new Comic({
                id: fullUrl, // Use the full URL as the ID
                title: title,
                subTitle: author,
                cover: cover,
                tags: [],
                description: "",
              }),
            );
          }
        }

        // Check if there's a next page
        const hasNextPage = document.querySelector("a.pg_next") !== null;
        const maxPage = hasNextPage ? page + 1 : page;

        document.dispose();

        return {
          comics: comics,
          maxPage: maxPage,
        };
      },
    },
  };

  /// search related
  search = {
    /**
     * load search result
     * @param keyword {string}
     * @param options {string[]} - options from optionList
     * @param page {number}
     * @returns {Promise<{comics: Comic[], maxPage: number}>}
     */
    load: async (keyword, options, page) => {
      const lang = this.loadSetting("language") || "en";
      const searchType = options[0] || null; // Default to ALL

      let url = `https://www.webtoons.com/${lang}/search`;
      if (searchType && searchType !== "ALL") {
        url += `/${searchType.toLowerCase()}`;
      }
      url += `?keyword=${encodeURIComponent(keyword)}&page=${page}`;

      // Set up cookies first to ensure proper access
      Network.setCookies("https://www.webtoons.com", [
        new Cookie({
          name: "ageGatePass",
          value: "true",
          domain: "webtoons.com",
        }),
        new Cookie({ name: "locale", value: lang, domain: "webtoons.com" }),
        new Cookie({
          name: "needGDPR",
          value: "false",
          domain: "webtoons.com",
        }),
      ]);

      const res = await Network.get(url, {
        Referer: `https://www.webtoons.com/${lang}/`,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      });

      if (res.status !== 200) {
        throw `Invalid status code: ${res.status}`;
      }

      const document = new HtmlDocument(res.body);
      const comicElements = document.querySelectorAll(
        ".webtoon_list li a",
      );

      const comics = [];
      for (const element of comicElements) {
        const titleElement = element.querySelector(".title");
        const coverElement = element.querySelector("img");
        const authorElement = element.querySelector(".author");

        if (titleElement && coverElement) {
          const title = titleElement.text;
          const author = authorElement ? authorElement.text : "";
          const cover =
            coverElement.attributes["src"] ||
            coverElement.attributes["data-url"];
          const href = element.attributes["href"];
          const fullUrl = href.startsWith("http")
            ? href
            : `https://www.webtoons.com${href}`;

          comics.push(
            new Comic({
              id: this.extractWebtoonPathAndId(fullUrl), // Use the full URL as the ID
              title: title,
              subTitle: author,
              cover: cover,
              tags: [],
              description: "",
            }),
          );
        }
      }

      // Check if there's a next page
      const hasNextPage = document.querySelector("a.next") !== null;
      const maxPage = hasNextPage ? page + 1 : page;

      document.dispose();

      return {
        comics: comics,
        maxPage: maxPage,
      };
    },

    /**
     * load search result with next page token.
     * The field will be ignored if `load` function is implemented.
     * @param keyword {string}
     * @param options {(string)[]} - options from optionList
     * @param next {string | null}
     * @returns {Promise<{comics: Comic[], maxPage: number}>}
     */
    loadNext: async (keyword, options, next) => {},

    // provide options for search
    optionList: [
      {
        // [Optional] default is `select`
        // type: select, multi-select, dropdown
        // For select, there is only one selected value
        // For multi-select, there are multiple selected values or none. The `load` function will receive a json string which is an array of selected values
        // For dropdown, there is one selected value at most. If no selected value, the `load` function will receive a null
        type: "select",
        // For a single option, use `-` to separate the value and text, left for value, right for text
        options: ["ALL-All", "originals-Originals", "canvas-Canvas"],
        // option label
        label: "Search Type",
        // default selected options. If not set, use the first option as default
        default: "ALL",
      },
    ],

    // enable tags suggestions
    enableTagsSuggestions: false,
  };

  /// single comic related
  comic = {
    /**
     * load comic info
     * @param id {string}
     * @returns {Promise<ComicDetails>}
     */
    loadInfo: async (id) => {
      const cacheKey = `comic.${id}.info`;
      return this._withCache(cacheKey, async () => {
        // id is xxx/xxx:title_no_number
        // Extract title_no from the URL using regex
        const titleNo = id.split(":")[1];

        if (!titleNo) {
          throw "Could not extract title_no from the provided URL";
        }

        const url = this.generateEpisodeUrl(id); // Use the passed URL directly
        const lang = url.split("/")[3] || this.loadSetting("language") || "en"; // Extract language from URL

        // Set up cookies first to ensure proper access
        Network.setCookies("https://m.webtoons.com", [
          new Cookie({
            name: "ageGatePass",
            value: "true",
            domain: "webtoons.com",
          }),
          new Cookie({
            name: "locale",
            value: lang,
            domain: "webtoons.com",
          }),
          new Cookie({
            name: "needGDPR",
            value: "false",
            domain: "webtoons.com",
          }),
        ]);

        // Get comic details from the web page
        const webRes = await Network.get(url, {
          Referer: `https://m.webtoons.com/${lang}/`,
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        });

        if (webRes.status !== 200) {
          throw `Invalid status code: ${webRes.status}`;
        }

        const webDocument = new HtmlDocument(webRes.body);

        // Extract comic details from web page
        const titleElement = webDocument.querySelector(
          "h1.subj, h3.subj, strong.subject",
        );

        const coverElement = webDocument.querySelector(".img_area img");
        const descriptionElement = webDocument.querySelector(
          ".info_area a.summary",
        );
        const genreElement = webDocument.querySelector(".tag_box .tag");
        const statusElement = webDocument.querySelector(".details_area .value");

        const title = titleElement ? titleElement.text : "Unknown Title";

        // Extract author and artist if available
        let author = "Unknown Author";
        let artist = "Unknown Artist";

        const authorArea = webDocument
          .querySelector(".author")
          .text.split(",")
          .map((x) => x.trim());
        if (authorArea) {
          author = authorArea.join(", ") || "Unknown Author";
          artist = authorArea;
        }

        const cover = coverElement
          ? coverElement.attributes["src"] ||
            coverElement.attributes["data-url"] ||
            webDocument.querySelector('head meta[property="og:image"]')
              ?.attributes["content"]
          : "";

        const description = descriptionElement ? descriptionElement.text : "";
        const genre = genreElement ? genreElement.text : "";
        const statusText = statusElement ? statusElement.text : "";

        // Determine if this is a canvas comic by checking the URL or page content
        const isCanvas = url.includes("challenge");
        const type = isCanvas ? "canvas" : "webtoon";

        // Now get chapters using the mobile API as requested
        const apiUrl = `https://m.webtoons.com/api/v1/${type}/${titleNo}/episodes?pageSize=99999`;

        const response = await fetch(apiUrl, {
          headers: {
            Referer: "https://m.webtoons.com/",
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          },
        });

        if (!response.ok) {
          throw `Invalid status code: ${response.status}`;
        }

        const data = await response.json();
        const episodeList = data.result.episodeList || [];
        const chapters = {};

        let updateTimeString;
        let updateDeteO;
        if (
          episodeList.length > 0 &&
          episodeList[episodeList.length - 1].exposureDateMillis
        ) {
          updateDeteO = new Date(
            Number(episodeList[episodeList.length - 1].exposureDateMillis),
          );
        } else {
          updateDeteO = new Date();
        }
        const year = updateDeteO.getFullYear();
        const month = String(updateDeteO.getMonth() + 1).padStart(2, "0");
        const day = String(updateDeteO.getDate()).padStart(2, "0");
        const hours = String(updateDeteO.getHours()).padStart(2, "0");
        const minutes = String(updateDeteO.getMinutes()).padStart(2, "0");
        const seconds = String(updateDeteO.getSeconds()).padStart(2, "0");
        updateTimeString = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        console.warn(updateTimeString);

        // Process episodes to extract chapter information
        episodeList.map((episode) => {
          const epId = episode.episodeNo; // Use viewerLink as the episode ID
          const epTitle = episode.episodeTitle;
          if (epId && epTitle) {
            chapters[`${epId}-${epTitle}`] = epTitle;
          }
        });

        webDocument.dispose();

        return new ComicDetails({
          title: title,
          subTitle: author,
          cover: cover,
          description: description,
          tags: genre
            ? { 标签: [genre], 作者: artist, 状态: [statusText] }
            : {},
          chapters: chapters,
          updateTime: updateTimeString,
          url: url,
        });
      });
    },

    /**
     * [Optional] load thumbnails of a comic
     *
     * To render a part of an image as thumbnail, return `${url}@x=${start}-${end}&y=${start}-${end}`
     * - If width is not provided, use full width
     * - If height is not provided, use full height
     * @param id {string}
     * @param next {string?} - next page token, null for first page
     * @returns {Promise<{thumbnails: string[], next: string?}>} - `next` is next page token, null for no more
     */
    loadThumbnails: async (id, next) => {
      // This would typically load thumbnails for a specific chapter/page
      // For Webtoon, we'll return an empty array as the chapters contain the full images
      return {
        thumbnails: [],
        next: null,
      };
    },

    /**
     * load images of a chapter
     * @param comicId {string}
     * @param epId {string?}
     * @returns {Promise<{images: string[]}>}
     */
    loadEp: async (comicId, epId) => {
      // Since comicId is now the full URL and epId is the episode viewer URL from API,
      // we can use epId directly as the viewer URL

      const viewerUrl = this.generateEpisodeUrl(comicId, epId); // epId is the viewer link from the API

      // Load the viewer page to get the images
      const viewerRes = await Network.get(viewerUrl, {
        Referer: comicId, // Use the comic URL as referer
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      });

      if (viewerRes.status !== 200) {
        throw `Invalid status code: ${viewerRes.status}`;
      }

      const document = new HtmlDocument(viewerRes.body);
      const imageElements = document.querySelectorAll("#_imageList img");

      const images = [];
      for (const element of imageElements) {
        const imageUrl =
          element.attributes["data-url"] || element.attributes["src"];
        if (imageUrl) {
          // Apply max quality setting if enabled
          if (this.loadSetting("maxQuality")) {
            // Check if the URL contains type=q90 and remove it to get higher quality
            if (imageUrl.includes("type=q90")) {
              // Remove type=q90 parameter from URL
              const cleanedUrl = imageUrl
                .replace(/[?&]type=q90/, "")
                .replace(/\?&/, "?");
              images.push(cleanedUrl);
            } else {
              images.push(imageUrl);
            }
          } else {
            images.push(imageUrl);
          }
        }
      }

      // Handle motion comics which might have different structure
      if (images.length === 0) {
        // Look for motion comic elements
        const motionElements = document.querySelectorAll(
          "div.viewer_img > img",
        );
        for (const element of motionElements) {
          const imageUrl =
            element.attributes["data-url"] || element.attributes["src"];
          if (imageUrl) {
            if (this.loadSetting("maxQuality")) {
              // Check if the URL contains type=q90 and remove it to get higher quality
              if (imageUrl.includes("type=q90")) {
                // Remove type=q90 parameter from URL
                const cleanedUrl = imageUrl
                  .replace(/[?&]type=q90/, "")
                  .replace(/\?&/, "?");
                images.push(cleanedUrl);
              } else {
                images.push(imageUrl);
              }
            } else {
              images.push(imageUrl);
            }
          }
        }
      }

      // Add author's notes if enabled
      if (this.loadSetting("showAuthorsNotes")) {
        const noteElement = document.querySelector(
          "div.creator_note p.author_text",
        );
        if (noteElement) {
          const note = noteElement.text;
          if (note && note.trim().length > 0) {
            // In a real implementation, we would handle notes differently
            console.log("Author's note:", note);
          }
        }
      }

      document.dispose();

      return {
        images: images,
      };
    },

    /**
     * [Optional] provide configs for an image loading
     * @param url
     * @param comicId
     * @param epId
     * @returns {ImageLoadingConfig | Promise<ImageLoadingConfig>}
     */
    onImageLoad: (url, comicId, epId) => {
      return new ImageLoadingConfig({
        url,
        headers: {
          Referer: "https://www.webtoons.com/",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
      });
    },

    /**
     * [Optional] provide configs for a thumbnail loading
     * @param url {string}
     * @returns {ImageLoadingConfig | Promise<ImageLoadingConfig>}
     *
     * `ImageLoadingConfig.modifyImage` and `ImageLoadingConfig.onLoadFailed` will be ignored.
     * They are not supported for thumbnails.
     */
    onThumbnailLoad: (url) => {
      return new ImageLoadingConfig({
        url,
        headers: {
          Referer: "https://www.webtoons.com/",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
      });
    },

    // enable tags translate
    enableTagsTranslate: false,
  };

  /*
    [Optional] settings related
    Use this.loadSetting to load setting
    ```
    let setting1Value = this.loadSetting('setting1')
    console.log(setting1Value)
    ```
     */
  settings = {
    language: {
      // title
      title: "Language",
      // type: input, select, switch
      type: "select",
      // options
      options: [
        {
          // value
          value: "en",
          // [Optional] text, if not set, use value as text
          text: "English",
        },
        {
          value: "zh-hant",
          text: "繁體中文",
        },
      ],
      default: "en",
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
    maxQuality: {
      title: "Maximum Image Quality",
      type: "switch",
      default: false,
    },
    showAuthorsNotes: {
      title: "Show Author's Notes",
      type: "switch",
      default: true,
    },
  };
}
