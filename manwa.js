/** @type {import('./_venera_.js')} */
class Manwa extends ComicSource {
  name = "漫蛙";
  key = "manwa";
  version = "1.1.6";
  minAppVersion = "1.4.0";

  url =
    "https://gh-proxy.com/https://raw.githubusercontent.com/Y-Ymeow/venera-configs/main/manwa.js";

  static ua =
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";

  #domain_key = "manwa_domain";
  #defaultDomains = [
    "https://manwapr.cc",
    "https://manwass.cc",
    "https://manwatg.cc",
    "https://manwa.me",
    "https://manwast.cc",
    "https://manwasy.cc",
  ];

  // 获取域名配置
  get domain() {
    return this.loadData(this.#domain_key) || this.#defaultDomains[0];
  }

  // 获取User-Agent
  get ua() {
    return this.loadSetting("ua") || Manwa.ua;
  }

  // 构建完整URL
  buildUrl(path) {
    return `${this.domain}/${path}`;
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

  settings = {
    domainSelector: {
      title: "选择域名",
      type: "callback",
      buttonText: "点击更新并选择",
      callback: async () => {
        const loadingId = UI.showLoading();
        let domains = [...this.#defaultDomains]; // Start with default domains

        try {
          // Fetch latest domains from the source
          const res = await Network.get("https://fuww.cc/mw666", {
            "User-Agent": this.ua,
          });
          if (res.status === 200) {
            // Find the base64 encoded domain list from the JavaScript variable
            const match = res.body.match(/atob\('([A-Za-z0-9+/=]+)'\)/);
            if (match && match[1]) {
              const base64 = match[1];
              const decodedString = Convert.decodeUtf8(
                Convert.decodeBase64(base64),
              );
              const json = JSON.parse(decodedString);
              domains = json.map((domain) => domain.trimEnd("/"));

              // Save the new domain list
              this.saveData("domains", JSON.stringify(domains));
            }
          }
        } catch (e) {
          console.warn("Could not fetch latest domains, using defaults:", e);
          // Load domains from saved data if available
          try {
            const savedDomains = await this.loadData("domains");
            if (savedDomains) {
              const savedDomainList = JSON.parse(savedDomains);
              if (
                Array.isArray(savedDomainList) &&
                savedDomainList.length > 0
              ) {
                domains = savedDomainList;
              }
            }
          } catch (loadError) {
            console.warn("Could not load saved domains:", loadError);
          }
        } finally {
          UI.cancelLoading(loadingId);
        }

        if (domains.length === 0) {
          UI.showMessage("未找到可用域名。");
          return;
        }

        const currentDomain =
          this.loadData(this.#domain_key) || this.#defaultDomains[0];
        const initialIndex = domains.findIndex((d) => d === currentDomain);

        const newDomains = ["https://manwa.me", ...domains];
        const selectedIndex = await UI.showSelectDialog(
          "选择一个可用域名",
          newDomains,
          initialIndex,
        );

        if (selectedIndex != null) {
          const selectedDomain = newDomains[selectedIndex];
          this.saveData(this.#domain_key, selectedDomain);
          UI.showMessage(`已切换域名至: ${selectedDomain}`);
        }
      },
    },
    imageSource: {
      type: "select",
      title: "图片源",
      options: [
        { value: "", text: "默认" },
        { value: "?v=20220724", text: "图源1" },
        { value: "?v=20220725", text: "图源2" },
        { value: "?v=20220726", text: "图源3" },
      ],
      default: "",
    },
    ua: {
      type: "input",
      title: "User-Agent",
      default: Manwa.ua,
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

  // 解析漫画元素
  parseComic(element) {
    const linkElement = element;
    const title =
      element.attributes["title"] ||
      linkElement.querySelector("img")?.attributes["alt"] ||
      "";
    const url = linkElement.attributes["href"] || "";
    const id = url.split("/").pop() || "";
    const cover =
      linkElement.querySelector("img")?.attributes["data-original"] ||
      linkElement.querySelector("img")?.attributes["src"] ||
      "";
    const subTitle =
      linkElement.querySelector("p.manga-list-2-title")?.text ||
      linkElement.querySelector("p.book-list-info-title")?.text ||
      "";

    return {
      id: id,
      title: title,
      cover: cover,
      subTitle: subTitle,
    };
  }

  search = {
    /**
     * load search result
     * @param keyword {string}
     * @param options {string[]} - options from optionList
     * @param page {number}
     * @returns {Promise<{comics: Comic[], maxPage: number}>}
     */
    load: async (keyword, options, page) => {
      const sortOption = options[0] || "0";
      const searchUrl = `${this.buildUrl("/search")}?keyword=${encodeURIComponent(keyword)}&page=${page}`;

      const res = await Network.get(searchUrl, {
        "User-Agent": Manwa.ua,
      });
      if (res.status !== 200) {
        throw new Error(`Failed to load search results: ${res.status}`);
      }

      const document = new HtmlDocument(res.body);

      // Select elements using selector from Kotlin source
      const lis = document.querySelectorAll("ul.book-list > li");
      const comics = lis.map((li) => {
        const titleElement = li.querySelector("p.book-list-info-title");
        const linkElement = li.querySelector("a");
        const imgElement = li.querySelector("img");

        const title = titleElement?.text || "";
        const url = linkElement?.attributes["href"] || "";
        const id = url.split("/").pop() || "";
        const cover =
          imgElement?.attributes["data-original"] ||
          imgElement?.attributes["src"] ||
          "";

        return new Comic({
          id: id,
          title: title,
          cover: cover,
          url: url, // Adding url to comic object in case it's needed
        });
      });

      // Check for pagination
      const paginationElements = document.querySelectorAll(
        "ul.pagination2 > li",
      );
      const lastPaginationElement =
        paginationElements[paginationElements.length - 1];
      const hasNextPage = lastPaginationElement?.text === "下一页";
      const maxPage = hasNextPage ? page + 1 : page;

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
        options: ["0-time", "1-popular"],
        // option label
        label: "sort",
        // default selected options. If not set, use the first option as default
        default: null,
      },
    ],

    // enable tags suggestions
    enableTagsSuggestions: false,
  };

  explore = [
    {
      title: "漫蛙",
      type: "multiPartPage",
      load: async () => {
        /** 读取推荐 */
        const res = await Network.get(this.buildUrl("rank"), {
          "User-Agent": Manwa.ua,
        });
        if (res.status !== 200) {
          throw new Error(`Failed to load recommendations: ${res.status}`);
        }

        const document = new HtmlDocument(res.body);
        const comicElements = document.querySelectorAll("#rankList_2 > a");
        const comics = comicElements.map((element) => this.parseComic(element));

        // Return as a single category
        return [
          {
            title: "推荐",
            comics: comics,
          },
        ];
      },
    },
  ];

  comic = {
    /**
     * load comic info
     * @param id {string}
     * @returns {Promise<ComicDetails>}
     */
    loadInfo: async (id) => {
      const cacheKey = `comic.${id}.info`;
      return this._withCache(cacheKey, async () => {
        const res = await Network.get(this.buildUrl(`book/${id}`), {
          "User-Agent": Manwa.ua,
        });
        if (res.status !== 200) {
          throw new Error(`Failed to load comic info: ${res.status}`);
        }

        const document = new HtmlDocument(res.body);

        // Extract comic details
        const title =
          document.querySelector(".detail-main-info-title")?.text || "";
        const cover =
          document.querySelector("div.detail-main-cover > img")?.attributes[
            "data-original"
          ] || "";
        const author = document
          .querySelectorAll(
            "p.detail-main-info-author > span.detail-main-info-value",
          )[1]
          .querySelectorAll("a");
        let authorTexts = author.map((e) => e.text.trim());
        const subtitle =
          document
            .querySelectorAll(
              "p.detail-main-info-author > span.detail-main-info-value",
            )[3]
            ?.text?.trim() || "";
        const statusText =
          document
            .querySelectorAll(
              "p.detail-main-info-author > span.detail-main-info-value",
            )[2]
            ?.text?.trim() || "未知";
        const tags = document
          .querySelectorAll("div.detail-main-info-class > a.info-tag")
          .map((e) => e.text.trim());
        const description =
          document.querySelector("#detail > p.detail-desc")?.text || "";

        const updateTime = document
          .querySelector(".detail-list-title-3")
          .text.replace("更新", "")
          .trim();

        // Extract chapters
        const chapterElements = document.querySelectorAll(
          "ul#detail-list-select > li > a",
        );
        const chapters = new Map();
        chapterElements.forEach((element, index) => {
          const url = element.attributes["href"];
          const name = element.text.trim();
          // Extract chapter ID from URL
          const chapterId = url.split("/").pop() || `${index}`;
          chapters.set(chapterId, name);
        });

        return new ComicDetails({
          title: title,
          cover: cover,
          subtitle: `最新章节: ${subtitle}`,
          description: description,
          tags: {
            作者: authorTexts,
            状态: [statusText],
            标签: tags,
          },
          chapters: chapters,
          updateTime,
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
      // This is optional and not typically needed for this source
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
      // Get the image source setting
      const imageSourceParam = this.loadSetting("imageSource") || "";

      const res = await Network.get(
        this.buildUrl(`chapter/${epId}${imageSourceParam}`),
        {
          "User-Agent": Manwa.ua,
        },
      );

      if (res.status !== 200) {
        throw new Error(`Failed to load chapter images: ${res.status}`);
      }

      const document = new HtmlDocument(res.body);
      const imageElements = document.querySelectorAll(
        "#cp_img > div.img-content > img[data-r-src]",
      );
      const images = imageElements.map(
        (element) => element.attributes["data-r-src"],
      );

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
      // console.warn(`Image URL: ${url}`);

      const isEncrypted = url.includes("?v=20220724");

      if (isEncrypted) {
        return {
          url: url,
          headers: {
            Referer: this.domain + "/",
            "User-Agent": Manwa.ua,
            "Sec-GPC": 1,
            Pragma: "no-cache",
          },
          onResponse: (data) => {
            const keyStr = "my2ecret782ecret";
            const key = Convert.encodeUtf8(keyStr);
            return Convert.decryptAesCbc(data, key, key);
          },
        };
      }

      return {
        url: url,
        headers: {
          Referer: this.domain,
          "User-Agent": Manwa.ua,
          Pragma: "no-cache",
        },
      };
    },
    /**
     * [Optional] Handle tag click event
     * @param namespace {string}
     * @param tag {string}
     * @returns {PageJumpTarget}
     */
    onClickTag: (namespace, tag) => {
      return {
        action: "search",
        keyword: tag,
      };
    },

    enableTagsTranslate: false,
  };

  async refreshDomainCallback() {
    const res = await Network.get("https://fuwt.cc/mw666", {
      "User-Agent": this.ua,
    });
    if (res.status !== 200) {
      throw new Error("Failed to refresh domain");
    }

    // Find the base64 encoded domain list from the JavaScript variable
    const match = res.body.match(/atob\('([A-Za-z0-9+/=]+)'\)/);
    if (!match || !match[1]) {
      throw new Error("No domain list found in response");
    }

    const base64 = match[1];
    const decodedString = Convert.decodeUtf8(Convert.decodeBase64(base64));
    const json = JSON.parse(decodedString);
    const domains = json.map((domain) => domain.trimEnd("/"));

    // Save the new domain list
    this.saveData("domains", JSON.stringify(domains));

    // Show success message
    UI.showMessage("域名列表已刷新");
  }

  async init() {
    // Load domains from saved data if available - this is kept for backward compatibility
    try {
      const savedDomains = await this.loadData("domains");
      if (savedDomains) {
        const domains = JSON.parse(savedDomains);
        if (Array.isArray(domains) && domains.length > 0) {
          // Update the default domains list with saved domains
          this.#defaultDomains.length = 0; // Clear the array
          domains.forEach((domain) => this.#defaultDomains.push(domain)); // Add new domains
        }
      }
    } catch (e) {
      // If there's an error loading saved domains, continue with defaults
      console.warn("Could not load saved domains, using defaults:", e);
    }
  }

  category = {
    /// title of the category page, used to identify the page, it should be unique
    title: "漫蛙分类",
    parts: [
      {
        // Single "All" category
        name: "分类",
        type: "fixed",
        categories: [
          {
            label: "全部",
            target: {
              page: "category",
              attributes: {
                category: "all",
                param: "",
              },
            },
          },
        ],
      },
      {
        name: "地区",
        type: "fixed",
        categories: [
          {
            label: "全部",
            target: {
              page: "category",
              attributes: {
                category: "area",
                param: "",
              },
            },
          },
          {
            label: "韩国",
            target: {
              page: "category",
              attributes: {
                category: "area",
                param: "2",
              },
            },
          },
          {
            label: "日漫",
            target: {
              page: "category",
              attributes: {
                category: "area",
                param: "3",
              },
            },
          },
          {
            label: "国漫",
            target: {
              page: "category",
              attributes: {
                category: "area",
                param: "4",
              },
            },
          },
          {
            label: "台漫",
            target: {
              page: "category",
              attributes: {
                category: "area",
                param: "5",
              },
            },
          },
          {
            label: "其他",
            target: {
              page: "category",
              attributes: {
                category: "area",
                param: "6",
              },
            },
          },
          {
            label: "未分类",
            target: {
              page: "category",
              attributes: {
                category: "area",
                param: "1",
              },
            },
          },
        ],
      },
      {
        name: "类型",
        type: "fixed",
        categories: [
          {
            label: "全部",
            target: {
              page: "category",
              attributes: {
                category: "gender",
                param: "-1",
              },
            },
          },
          {
            label: "一般向",
            target: {
              page: "category",
              attributes: {
                category: "gender",
                param: "2",
              },
            },
          },
          {
            label: "BL向",
            target: {
              page: "category",
              attributes: {
                category: "gender",
                param: "0",
              },
            },
          },
          {
            label: "禁漫",
            target: {
              page: "category",
              attributes: {
                category: "gender",
                param: "1",
              },
            },
          },
          {
            label: "TL向",
            target: {
              page: "category",
              attributes: {
                category: "gender",
                param: "3",
              },
            },
          },
        ],
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
      // Build URL with filters - following the original Kotlin source code
      let url = `${this.domain}booklist?page=${page}`;

      // Track which filters have been applied via category to avoid conflicts with options
      let hasCategoryStatus = false;
      let hasCategoryGender = false;
      let hasCategoryArea = false;
      let status,
        gender,
        area,
        sort = null;
      status = options[0];
      // Apply the filters from the category
      if (category === "end") {
        [gender, area, sort] = options;
        status = param;
        hasCategoryStatus = true;
      } else if (category === "gender") {
        [status, area, sort] = options;
        gender = param;
        hasCategoryGender = true;
      } else if (category === "area") {
        [status, gender, sort] = options;
        area = param;
        hasCategoryArea = true;
      } else if (category === "tag") {
        if (param !== "") {
          url += `&tag=${param}`;
        } else {
          // For "全部" tag, don't add a tag parameter
        }
      }

      if (status) {
        url += `&end=${status}`;
      }
      if (gender) {
        url += `&gender=${gender}`;
      }
      if (area) {
        url += `&area=${area}`;
      }
      if (sort) {
        url += `&sort=${sort}`;
      }

      // url replace all _1 to -1
      url = url.replaceAll("_1", "-1");

      const res = await Network.get(url);
      if (res.status !== 200) {
        throw new Error(`Failed to load category comics: ${res.status}`);
      }

      const html = new HtmlDocument(res.body);

      const parseComic = (element) => {
        const titleElement =
          element.querySelector("p.manga-list-2-title") ||
          element.querySelector("p.book-list-info-title");
        const title = titleElement?.text?.trim() || "";

        const linkElement = element.querySelector("a");
        const url = linkElement.attributes["href"] || "";
        const id = url.split("/").pop() || "";

        const coverElement = element.querySelector("img");
        const cover = coverElement.attributes["src"];

        const tags = Array.from(
          element.querySelectorAll("div.manga-list-2-class > a.info-tag") ||
            element.querySelectorAll("div.book-list-info-class > a.info-tag") ||
            [],
        ).map((tag) => tag.text.trim());

        const descElement =
          element.querySelector("p.manga-list-2-desc") ||
          element.querySelector("p.book-list-info-desc");
        const description = descElement?.text?.trim() || "";

        const authorElement =
          element.querySelector("p.manga-list-2-author > span") ||
          element.querySelector("p.book-list-info-author > span");
        const author = authorElement?.text?.trim() || "";

        return new Comic({
          id: id,
          title: title,
          subTitle: author,
          cover: cover,
          tags: tags,
          description: description,
        });
      };

      const comicElements = html.querySelectorAll("ul.manga-list-2 > li");
      const comics = Array.from(comicElements).map(parseComic);

      // Check for next page - using the Chinese text for next page
      const paginationElements = html.querySelectorAll("ul.pagination2 > li");
      const next =
        paginationElements.length > 0
          ? paginationElements[paginationElements.length - 1].text.trim() ===
            "下一页"
          : false;
      const maxPage = next ? page + 1 : page;

      return {
        comics: comics,
        maxPage: maxPage,
      };
    },
    // [Optional] provide options for category comic loading
    optionList: [
      {
        label: "状态",
        options: ["-全部", "2-连载中", "1-完结"],
      },
      {
        label: "类型",
        options: ["_1-全部", "2-一般向", "0-BL向", "1-禁漫", "3-TL向"],
        notShowWhen: ["gender"], // Hide when gender category is selected
      },
      {
        label: "地区",
        options: [
          "-全部",
          "2-韩国",
          "3-日漫",
          "4-国漫",
          "5-台漫",
          "6-其他",
          "1-未分类",
        ],
        notShowWhen: ["area"], // Hide when area category is selected
      },
      {
        label: "排序",
        options: ["_1-最新", "0-最旧", "1-收藏", "2-新漫"],
      },
    ],
    ranking: {
      // For a single option, use `-` to separate the value and text, left for value, right for text
      options: ["day-日榜", "week-周榜", "month-月榜"],
      /**
       * load ranking comics
       * @param option {string} - option from optionList
       * @param page {number} - page number
       * @returns {Promise<{comics: Comic[], maxPage: number}>}
       */
      load: async (option, page) => {
        // Build ranking URL based on option
        let url = `${this.domain}rank`;

        const res = await Network.get(url);
        if (res.status !== 200) {
          throw new Error(`Failed to load ranking comics: ${res.status}`);
        }

        const html = new HtmlDocument(res.body);

        function parseComic(element) {
          const title = element.attributes["title"] || "";
          const id = element.href || "";
          const coverElement = element.querySelector("img");
          const cover = coverElement?.attributes["data-original"] || "";
          const description = element.parent.parent
            .querySelector(".manga-list-2-tip")
            .text.trim();

          return new Comic({
            id: id,
            title: title,
            subTitle: description,
            description,
            cover: cover,
          });
        }

        const comicElements = html.querySelectorAll("#rankList_2 > a");
        const comics = Array.from(comicElements).map(parseComic);

        // For ranking, we'll assume a fixed max page for simplicity
        return {
          comics: comics,
          maxPage: 1,
        };
      },
    },
  };
}
