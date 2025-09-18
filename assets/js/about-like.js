(function () {
  document.addEventListener("DOMContentLoaded", function () {
    const section = document.getElementById("about-like-section");
    const button = document.getElementById("about-like-button");
    const countEl = document.getElementById("about-like-count");

    if (!section || !button || !countEl) {
      return;
    }

    const iconEl = button.querySelector(".about-like-button__icon");
    const labelEl = button.querySelector(".about-like-button__label");

    const namespace = "wenyaxie023_github_io";
    const key = "about_like";
    const storageKey = "about-like-liked";
    const countApiBase = "https://api.countapi.xyz";

    let isLiked = false;

    const updateCountText = (value) => {
      const safeValue = typeof value === "number" && Number.isFinite(value) ? value : 0;
      countEl.textContent = `已有 ${safeValue} 人点赞`;
    };

    const setButtonState = (liked) => {
      isLiked = liked;
      button.classList.toggle("liked", liked);
      button.disabled = liked;
      button.setAttribute("aria-pressed", liked ? "true" : "false");
      if (labelEl) {
        labelEl.textContent = liked ? "已点赞" : "为我点赞";
      }
      if (iconEl) {
        iconEl.textContent = liked ? "💖" : "👍";
      }
    };

    const triggerConfetti = () => {
      if (typeof window.confetti !== "function") {
        return;
      }

      const duration = 1200;
      const animationEnd = Date.now() + duration;
      const colors = ["#f472b6", "#38bdf8", "#facc15", "#4ade80", "#a78bfa"];

      (function frame() {
        window.confetti({
          particleCount: 40,
          spread: 65,
          startVelocity: 35,
          gravity: 0.9,
          scalar: 0.9,
          ticks: 90,
          origin: {
            x: Math.random() * 0.6 + 0.2,
            y: Math.random() * 0.2 + 0.1,
          },
          colors,
        });

        if (Date.now() < animationEnd) {
          requestAnimationFrame(frame);
        }
      })();
    };

    const initializeCount = async () => {
      try {
        await fetch(`${countApiBase}/create?namespace=${namespace}&key=${key}&value=0`);
      } catch (error) {
        // Ignore errors due to the counter already existing.
      }

      try {
        const response = await fetch(`${countApiBase}/get/${namespace}/${key}`);
        if (!response.ok) {
          throw new Error("Failed to fetch like count");
        }
        const data = await response.json();
        updateCountText(data.value);
      } catch (error) {
        console.error("Unable to load like count:", error);
        countEl.textContent = "点赞服务暂时不可用";
      }
    };

    const incrementLike = async () => {
      try {
        const response = await fetch(`${countApiBase}/hit/${namespace}/${key}`);
        if (!response.ok) {
          throw new Error("Failed to increment like count");
        }
        const data = await response.json();
        updateCountText(data.value);
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
        countEl.textContent = "点赞失败，请稍后再试";
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
      incrementLike();
    });
  });
})();
