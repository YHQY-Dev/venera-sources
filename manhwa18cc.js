class Manhwa18cc extends ComicSource {
  // Required metadata
  name = "Manhwa18cc";
  key = "manhwa18cc";
  version = "1.0.8";
  minAppVersion = "1.0.0"; // 请根据实际情况更新
  url =
    "https://gh-proxy.com/https://raw.githubusercontent.com/Y-Ymeow/venera-configs/main/manhwa18cc.js";

  ua =
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";

  init() {
    // 初始化逻辑，例如加载设置或数据
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
    // 探索页配置
    {
      type: "multiPageComicList",
      title: "Manhwa 18",
      load: async (page) => {
        // 加载韩文漫画列表
        const baseUrl = this.loadSetting("baseUrl") || "https://manhwa18.cc";
        const url = `${baseUrl}/raw/${page}`;

        const response = await Network.get(url);
        if (response.status !== 200) {
          throw new Error(`Failed to load Korean comics: ${response.status}`);
        }

        const html = response.body;
        const doc = new HtmlDocument(html);

        // Parse manga items
        const comics = [];
        const mangaItems = doc.querySelectorAll("div.manga-item");

        for (const item of mangaItems) {
          const linkElement = item.querySelector("div.data a");
          if (!linkElement) continue;

          const href = linkElement.attributes.href;
          const title = linkElement.text.trim();
          const coverImg = item.querySelector("img");
          let cover = "";
          if (coverImg) {
            cover =
              coverImg.attributes.src || coverImg.attributes["data-src"] || "";
            // Ensure the cover URL is absolute
            if (cover.startsWith("//")) {
              cover = "https" + cover;
            } else if (cover.startsWith("/")) {
              const baseUrl =
                this.loadSetting("baseUrl") || "https://manhwa18.cc";
              cover = baseUrl + cover;
            }
          }

          if (href && title) {
            // Extract comic ID from URL
            const match = href.match(/\/(webtoon|raw)\/([^\/\?]+)/);
            const comicId = match ? match[2] : href;

            comics.push(
              new Comic({
                id: comicId,
                title: title,
                cover: cover,
                url: href,
              }),
            );
          }
        }

        // Check if there are more pages
        const hasNext = !!doc.querySelector("ul.pagination li.next a");

        return {
          comics: comics,
          maxPage: hasNext ? page + 1 : 1,
        };
      },
    },
  ];

  search = {
    optionList: [],
    load: async (keyword, options, page) => {
      // 搜索韩文漫画
      const baseUrl = this.loadSetting("baseUrl") || "https://manhwa18.cc";
      let url;

      // Since Korean content is only in /raw and cannot be searched separately
      if (!keyword || keyword.trim() === "") {
        // If no keyword, return to Korean manga (page 1)
        url = `${baseUrl}/raw/1`;
      } else {
        // Search for Korean content with keyword
        url = `${baseUrl}/search?q=${encodeURIComponent(keyword)}&page=${page}`;
      }

      const response = await Network.get(url);
      if (response.status !== 200) {
        throw new Error(`Failed to search: ${response.status}`);
      }

      const html = response.body;
      const doc = new HtmlDocument(html);

      // Parse search results
      const comics = [];
      const mangaItems = doc.querySelectorAll("div.manga-item");

      for (const item of mangaItems) {
        const linkElement = item.querySelector("div.data a");
        if (!linkElement) continue;

        const href = linkElement.attributes.href;
        const title = linkElement.text.trim();
        const coverImg = item.querySelector("img");
        let cover = "";
        if (coverImg) {
          cover =
            coverImg.attributes.src || coverImg.attributes["data-src"] || "";
          // Ensure the cover URL is absolute
          if (cover.startsWith("//")) {
            cover = "https:" + cover;
          } else if (cover.startsWith("/")) {
            const baseUrl =
              this.loadSetting("baseUrl") || "https://manhwa18.cc";
            cover = baseUrl + cover;
          }
        }

        if (href && title) {
          // Extract comic ID from URL
          const match = href.match(/\/(webtoon|raw)\/([^\/\?]+)/);
          const comicId = match ? match[2] : href;

          comics.push(
            new Comic({
              id: comicId,
              title: title,
              cover: cover,
              url: href,
            }),
          );
        }
      }

      // Check if there are more pages
      const hasNext = !!doc.querySelector("ul.pagination li.next a");

      return {
        comics: comics,
        maxPage: hasNext ? page + 1 : 1,
      };
    },
  };

  comic = {
    loadInfo: async (comicId) => {
      const cacheKey = `comic.${comicId}.info`;
      return this._withCache(cacheKey, async () => {
        // 加载漫画详情
        const baseUrl = this.loadSetting("baseUrl") || "https://manhwa18.cc";
        const url = `${baseUrl}/webtoon/${comicId}`;

        const response = await Network.get(url);
        if (response.status !== 200) {
          throw new Error(`Failed to load comic info: ${response.status}`);
        }

        const html = response.body;
        const doc = new HtmlDocument(html);

        // Extract comic details
        const titleElement = doc.querySelector(".post-title h1");
        const span = titleElement.querySelector("span");
        const title = titleElement.text.replace(span.text, "").trim();

        const subTitleElement = doc.querySelector(
          ".post-content > .post-content_item",
        );
        const subtitle = subTitleElement
          .querySelector(".summary-content")
          ?.text.trim();

        let cover = "";
        const coverElement = doc.querySelector(".centernav .summary_image img");
        if (coverElement) {
          cover = coverElement.attributes.src;
          // Ensure the cover URL is absolute
          if (cover.startsWith("//")) {
            cover = "https:" + cover;
          } else if (cover.startsWith("/")) {
            const baseUrl =
              this.loadSetting("baseUrl") || "https://manhwa18.cc";
            cover = baseUrl + cover;
          }
        }

        const descriptionElement = doc.querySelector(
          "div.panel-story-description div.dsct",
        );
        const description = descriptionElement
          ? descriptionElement.text.trim()
          : "";

        // Extract authors
        const authors = [];
        const authorElements = doc.querySelectorAll(".author-content a");
        for (const authorEl of authorElements) {
          authors.push(authorEl.text.trim());
        }

        // Extract tags
        const tags = [];
        const tagElements = doc.querySelectorAll(
          ".genres-content a, .artist-content a",
        );
        for (const tagEl of tagElements) {
          tags.push(tagEl.text.trim());
        }

        // Extract chapters
        const chapters = new Map();
        const chapterElements = doc.querySelectorAll("li.a-h").reverse();

        let updateTime = doc
          .querySelector("li.a-h span.chapter-time")
          .text.trim();

        let updateTimeDate = new Date(updateTime);
        updateTimeDate.setDate(updateTimeDate.getDate() + 1);
        updateTime = updateTimeDate.toISOString().slice(0, 10);

        for (let i = 0; i < chapterElements.length; i++) {
          const chapterEl = chapterElements[i];
          const linkElement = chapterEl.querySelector("a");
          if (!linkElement) continue;

          const href = linkElement.attributes.href;
          const chapterTitle = linkElement.text.trim() || `Chapter ${i + 1}`;

          // Extract chapter ID from URL
          const chapterMatch = href.match(/\/chapter\/([^\/\?]+)/);
          const chapterId = chapterMatch ? chapterMatch[1] : href;

          // Extract date if available
          let date = "";
          const dateElement = chapterEl.querySelector("span.chapter-time");
          if (dateElement) {
            date = dateElement.text.trim();
          }

          chapters.set(chapterId, chapterTitle);
        }

        return new ComicDetails({
          id: comicId,
          title: title,
          subtitle,
          description: description,
          cover: cover,
          chapters: chapters,
          tags: {
            作者: authors,
            标签: tags,
          },
          updateTime,
          // Artist is typically not separately listed
        });
      });
    },
    loadEp: async (comicId, chapterId) => {
      // 加载章节图片
      const baseUrl = this.loadSetting("baseUrl") || "https://manhwa18.cc";
      const url = `${baseUrl}/${chapterId}`;

      const response = await Network.get(url);
      // if (response.status !== 200) {
      //   throw new Error(`Failed to load chapter images: ${response.status}`);
      // }

      const html = response.body;
      const doc = new HtmlDocument(html);

      // Extract images from the chapter
      const images = [];
      const imageElements = doc.querySelectorAll("div.read-content img");

      for (const imgEl of imageElements) {
        let src = imgEl.attributes.src || imgEl.attributes["data-src"] || "";

        // Ensure the image URL is absolute
        if (src.startsWith("//")) {
          src = "https:" + src;
        } else if (src.startsWith("/")) {
          src = baseUrl + src;
        }

        if (src) {
          images.push(src);
        }
      }

      return { images };
    },

    onImageLoad: (url, comicId, epId) => {
      return {
        url,
        url: url,
        headers: {
          Referer: this.loadSetting("baseUrl") || "https://manhwa18.cc",
          "User-Agent": this.ua,
          Pragma: "no-cache",
        },
      };
    },
  };

  settings = {
    baseUrl: {
      title: "基础 URL",
      type: "input",
      default: "https://manhwa18.cc",
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
}
