(function () {
  document.addEventListener("DOMContentLoaded", function () {
    const section = document.getElementById("about-like-section");
    const button = document.getElementById("about-like-button");
    const countEl = document.getElementById("about-like-count");

    if (!section || !button || !countEl) {
      return;
    }

    const iconEl = button.querySelector(".about-like-button__icon i");
    section.dataset.likeService = "";

    const namespace = "wenyaxie023_github_io";
    const key = "about_like";
    const storageKey = "about-like-liked";
    const counterApiBase = "https://api.counterapi.dev/v1";
    const countApiBase = "https://api.countapi.xyz";
    const encodedNamespace = encodeURIComponent(namespace);
    const encodedKey = encodeURIComponent(key);

    let isLiked = false;
    let activeServiceIndex = 0;

    const formatCount = (value) => {
      try {
        return new Intl.NumberFormat("zh-CN").format(value);
      } catch (error) {
        return String(value);
      }
    };

    const extractValue = (data) => {
      if (typeof data === "number" && Number.isFinite(data)) {
        return data;
      }

      if (!data || typeof data !== "object") {
        return null;
      }

      const candidates = ["value", "count", "data"];
      for (const candidate of candidates) {
        const raw = data[candidate];
        if (typeof raw === "number" && Number.isFinite(raw)) {
          return raw;
        }
        if (typeof raw === "string") {
          const parsed = Number.parseInt(raw, 10);
          if (Number.isFinite(parsed)) {
            return parsed;
          }
        }
      }

      return null;
    };

    const counterApiService = {
      name: "counterapi",
      async getCount() {
        const response = await fetch(`${counterApiBase}/${encodedNamespace}/${encodedKey}`, {
          method: "GET",
          cache: "no-store",
          credentials: "omit",
        });

        if (!response.ok) {
          throw new Error(`counterapi get failed with status ${response.status}`);
        }

        const data = await response.json();
        const value = extractValue(data);
        if (value === null) {
          throw new Error("counterapi get returned an unexpected payload");
        }

        return value;
      },
      async increment() {
        const response = await fetch(`${counterApiBase}/${encodedNamespace}/${encodedKey}/up`, {
          method: "POST",
          cache: "no-store",
          credentials: "omit",
        });

        if (!response.ok) {
          throw new Error(`counterapi increment failed with status ${response.status}`);
        }

        const data = await response.json();
        const value = extractValue(data);
        if (value === null) {
          throw new Error("counterapi increment returned an unexpected payload");
        }

        return value;
      },
    };

    const countApiService = (() => {
      let initialized = false;

      const ensureInitialized = async () => {
        if (initialized) {
          return;
        }

        initialized = true;

        try {
          await fetch(`${countApiBase}/create?namespace=${encodedNamespace}&key=${encodedKey}&value=0`, {
            cache: "no-store",
            credentials: "omit",
          });
        } catch (error) {
          console.warn("CountAPI initialize failed (likely already exists):", error);
        }
      };

      return {
        name: "countapi",
        async getCount() {
          await ensureInitialized();

          const response = await fetch(`${countApiBase}/get/${encodedNamespace}/${encodedKey}`, {
            method: "GET",
            cache: "no-store",
            credentials: "omit",
          });

          if (!response.ok) {
            throw new Error(`countapi get failed with status ${response.status}`);
          }

          const data = await response.json();
          const value = extractValue(data);
          if (value === null) {
            throw new Error("countapi get returned an unexpected payload");
          }

          return value;
        },
        async increment() {
          await ensureInitialized();

          const response = await fetch(`${countApiBase}/hit/${encodedNamespace}/${encodedKey}`, {
            method: "GET",
            cache: "no-store",
            credentials: "omit",
          });

          if (!response.ok) {
            throw new Error(`countapi increment failed with status ${response.status}`);
          }

          const data = await response.json();
          const value = extractValue(data);
          if (value === null) {
            throw new Error("countapi increment returned an unexpected payload");
          }

          return value;
        },
      };
    })();

    const services = [counterApiService, countApiService];

    const setCountMessage = (message, state = "success") => {
      countEl.textContent = message;
      if (state) {
        countEl.dataset.state = state;
      } else {
        countEl.removeAttribute("data-state");
      }
    };

    const updateCountText = (value) => {
      const safeValue = Number.isFinite(value) && value >= 0 ? Math.trunc(value) : 0;
      setCountMessage(`已有 ${formatCount(safeValue)} 人点赞`, "success");
    };

    const setButtonState = (liked) => {
      isLiked = liked;
      button.classList.toggle("liked", liked);
      button.disabled = liked;
      button.setAttribute("aria-pressed", liked ? "true" : "false");
      button.dataset.state = liked ? "liked" : "idle";

      if (iconEl) {
        iconEl.className = `${liked ? "fa-solid" : "fa-regular"} fa-thumbs-up`;
        iconEl.setAttribute("aria-hidden", "true");
      }
    };

    const triggerConfetti = () => {
      if (typeof window.confetti !== "function") {
        return;
      }

      if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
      }

      const rect = button.getBoundingClientRect();
      const originX = (rect.left + rect.width / 2) / (window.innerWidth || 1);
      const originY = (rect.top + rect.height / 2) / (window.innerHeight || 1);
      const colors = ["#f472b6", "#38bdf8", "#facc15", "#f97316", "#a855f7", "#4ade80"];
      const defaults = {
        startVelocity: 36,
        gravity: 0.92,
        ticks: 120,
        zIndex: 1000,
      };

      window.confetti({
        ...defaults,
        particleCount: 55,
        spread: 70,
        origin: { x: originX, y: originY },
        colors,
      });

      window.confetti({
        ...defaults,
        particleCount: 45,
        spread: 120,
        decay: 0.92,
        scalar: 0.85,
        origin: { x: originX, y: Math.max(originY - 0.05, 0) },
        colors,
      });
    };

    const attemptServiceAction = async (action) => {
      const attempts = services.length;

      for (let offset = 0; offset < attempts; offset += 1) {
        const index = (activeServiceIndex + offset) % attempts;
        const service = services[index];

        try {
          const value = await service[action]();
          activeServiceIndex = index;
          section.dataset.likeService = service.name;
          return value;
        } catch (error) {
          console.error(`Like service ${service.name} ${action} failed:`, error);
        }
      }

      throw new Error(`All like services failed to ${action}`);
    };

    const initializeCount = async () => {
      setCountMessage("正在加载点赞人数…", "loading");

      try {
        const value = await attemptServiceAction("getCount");
        updateCountText(value);
      } catch (error) {
        console.error("Unable to load like count:", error);
        setCountMessage("点赞服务暂时不可用", "error");
      }
    };

    const incrementLike = async () => {
      try {
        const value = await attemptServiceAction("increment");
        updateCountText(value);
        setButtonState(true);

        try {
          localStorage.setItem(storageKey, "true");
        } catch (storageError) {
          console.warn("Unable to persist like preference:", storageError);
        }

        triggerConfetti();
      } catch (error) {
        console.error("Unable to record like:", error);
        setButtonState(false);
        setCountMessage("点赞失败，请稍后再试", "error");
      }
    };

    let storedPreference = null;
    try {
      storedPreference = localStorage.getItem(storageKey);
    } catch (storageError) {
      console.warn("Local storage is not accessible:", storageError);
    }

    if (storedPreference === "true") {
      setButtonState(true);
    } else {
      setButtonState(false);
    }

    initializeCount();

    button.addEventListener("click", () => {
      if (isLiked) {
        return;
      }

      button.disabled = true;
      button.dataset.state = "pending";
      incrementLike();
    });
  });
})();
