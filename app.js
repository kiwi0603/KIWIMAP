const DEFAULT_CATEGORIES = ["한식", "중식", "일식", "양식", "디저트", "카페"];
const CATEGORY_COLOR = {
  "한식": "#A6E3A1",
  "중식": "#F9E2AF",
  "일식": "#F38BA8",
  "양식": "#89B4FA",
  "디저트": "#FAB387",
  "카페": "#CBA6F7",
};

const state = {
  places: [],
  filtered: [],
  selected: null,
  filters: {
    search: "",
    categories: new Set(DEFAULT_CATEGORIES),
    openNow: false,
    hasRecommend: false,
  },
  map: null,
  markers: [],
};

function getCategorySymbol(category) {
  const map = {
    "한식": "한",
    "중식": "중",
    "일식": "일",
    "양식": "양",
    "디저트": "디",
    "카페": "카",
  };
  return map[category] || "?";
}

function setTheme(theme) {
  const app = document.getElementById("app");
  app.classList.toggle("theme-dark", theme === "dark");
  app.classList.toggle("theme-light", theme !== "dark");
  localStorage.setItem("kiwi-theme", theme);
}

function initTheme() {
  const saved = localStorage.getItem("kiwi-theme") || "light";
  setTheme(saved);
}

function toggleSettings(open) {
  const panel = document.getElementById("settings");
  panel.classList.toggle("hidden", !open);
}

function loadData() {
  return fetch("data/places.json")
    .then((res) => res.json())
    .then((data) => {
      state.places = Array.isArray(data) ? data : [];
      state.filtered = [...state.places];
    });
}

function renderCategoryFilters() {
  const container = document.getElementById("category-filters");
  container.innerHTML = "";
  DEFAULT_CATEGORIES.forEach((category) => {
    const chip = document.createElement("button");
    chip.className = "chip active";
    chip.textContent = category;
    chip.addEventListener("click", () => {
      if (state.filters.categories.has(category)) {
        state.filters.categories.delete(category);
        chip.classList.remove("active");
      } else {
        state.filters.categories.add(category);
        chip.classList.add("active");
      }
      applyFilters();
    });
    container.appendChild(chip);
  });
}

function applyFilters() {
  const query = state.filters.search.trim().toLowerCase();
  const categories = state.filters.categories;
  state.filtered = state.places.filter((place) => {
    if (!categories.has(place.category)) {
      return false;
    }
    if (state.filters.openNow && !isOpenNow(place)) {
      return false;
    }
    if (state.filters.hasRecommend && !hasRecommend(place)) {
      return false;
    }
    if (!query) {
      return true;
    }
    const hay = [
      place.name,
      place.address,
      place.intro,
      place.category,
      ...(place.tags || []),
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(query);
  });
  renderList();
  updateMarkers();
}

function renderList() {
  const list = document.getElementById("list");
  const count = document.getElementById("result-count");
  list.innerHTML = "";
  count.textContent = String(state.filtered.length);

  state.filtered.forEach((place) => {
    const item = document.createElement("div");
    item.className = "list-item";
    item.addEventListener("click", () => openDetail(place));

    const title = document.createElement("div");
    title.className = "list-title";

    const icon = document.createElement("div");
    icon.className = "category-icon";
    icon.style.background = CATEGORY_COLOR[place.category] || "#ddd";
    icon.textContent = getCategorySymbol(place.category);

    const name = document.createElement("span");
    name.textContent = place.name;

    title.appendChild(icon);
    title.appendChild(name);

    const intro = document.createElement("div");
    intro.textContent = place.intro || "";
    intro.className = "muted";

    const rating = document.createElement("div");
    rating.className = "rating";
    rating.appendChild(renderRating(place.rating || 0));

    item.appendChild(title);
    item.appendChild(intro);
    item.appendChild(rating);
    list.appendChild(item);
  });
}

function renderRating(value) {
  const wrapper = document.createElement("div");
  wrapper.className = "rating";
  const full = Math.floor(value);
  const hasHalf = value - full >= 0.5;
  const total = 5;

  for (let i = 0; i < full; i += 1) {
    const icon = document.createElement("span");
    icon.className = "kiwi";
    wrapper.appendChild(icon);
  }

  if (hasHalf) {
    const icon = document.createElement("span");
    icon.className = "kiwi half";
    wrapper.appendChild(icon);
  }

  const remain = total - full - (hasHalf ? 1 : 0);
  for (let i = 0; i < remain; i += 1) {
    const icon = document.createElement("span");
    icon.className = "kiwi empty";
    wrapper.appendChild(icon);
  }

  return wrapper;
}

function openDetail(place) {
  state.selected = place;
  const panel = document.getElementById("detail");
  panel.classList.remove("hidden");

  const image = document.getElementById("detail-image");
  const photos = place.photos || [];
  if (photos.length > 0 && photos[0].url) {
    image.src = photos[0].url;
    image.alt = photos[0].alt || place.name;
  } else {
    image.src = "assets/kiwi.png";
    image.alt = "kiwi";
  }

  document.getElementById("detail-name").textContent = place.name || "";
  const rating = document.getElementById("detail-rating");
  rating.innerHTML = "";
  rating.appendChild(renderRating(place.rating || 0));

  document.getElementById("detail-intro").textContent = place.intro || "";

  renderMenus(place);
  renderHours(place);
  renderContact(place);
  renderLinks(place);
}

function closeDetail() {
  const panel = document.getElementById("detail");
  panel.classList.add("hidden");
}

function renderMenus(place) {
  const container = document.getElementById("detail-menus");
  container.innerHTML = "";
  const menus = place.menus || [];
  menus.forEach((menu) => {
    const row = document.createElement("div");
    row.className = "menu-item";
    const name = document.createElement("span");
    name.textContent = `${menu.name || ""} · ${menu.price || ""}`;
    row.appendChild(name);

    if (menu.is_recommend) {
      const badge = document.createElement("span");
      badge.className = "menu-badge";
      badge.textContent = "키위 추천";
      row.appendChild(badge);
    }
    container.appendChild(row);
  });
}

function renderHours(place) {
  const container = document.getElementById("detail-hours");
  const hours = place.hours || {};
  const openNow = isOpenNow(place);
  const dayMap = {
    mon: "월",
    tue: "화",
    wed: "수",
    thu: "목",
    fri: "금",
    sat: "토",
    sun: "일",
  };

  const rows = Object.keys(dayMap).map((key) => {
    const label = dayMap[key];
    const value = hours[key] || "";
    return `${label}: ${value}`;
  });

  const status = openNow ? "영업중" : "영업종료";
  container.textContent = `${status} · ${rows.join(" | ")}`;
}

function renderContact(place) {
  const container = document.getElementById("detail-contact");
  const items = [];
  if (place.address) items.push(place.address);
  if (place.phone) items.push(place.phone);
  container.textContent = items.join(" · ");
}

function renderLinks(place) {
  const container = document.getElementById("detail-links");
  container.innerHTML = "";
  if (place.naver_place) {
    const link = document.createElement("a");
    link.href = place.naver_place;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = "네이버 플레이스";
    container.appendChild(link);
  }
}

function hasRecommend(place) {
  const menus = place.menus || [];
  return menus.some((menu) => menu.is_recommend);
}

function isOpenNow(place) {
  if (place.temp_closed) return false;

  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const kst = new Date(utc + 9 * 3600000);
  const dayIndex = kst.getDay();
  const dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const dayKey = dayKeys[dayIndex];

  if (isHoliday(place, dayKey, dayIndex)) return false;

  const hours = place.hours || {};
  const value = hours[dayKey];
  if (!value || value === "휴무") return false;

  const range = value.split("-");
  if (range.length !== 2) return false;
  const start = toMinutes(range[0]);
  const end = toMinutes(range[1]);
  const current = kst.getHours() * 60 + kst.getMinutes();

  if (Number.isNaN(start) || Number.isNaN(end)) return false;
  if (start <= end) {
    return current >= start && current < end;
  }
  return current >= start || current < end;
}

function isHoliday(place, dayKey, dayIndex) {
  const holiday = place.holiday;
  const koDays = ["일", "월", "화", "수", "목", "금", "토"];
  if (Array.isArray(holiday)) {
    return holiday.includes(dayKey) || holiday.includes(koDays[dayIndex]);
  }
  if (typeof holiday === "string" && holiday.trim() !== "") {
    return holiday.includes(dayKey) || holiday.includes(koDays[dayIndex]);
  }
  return false;
}

function toMinutes(value) {
  const parts = value.split(":");
  if (parts.length !== 2) return NaN;
  return Number(parts[0]) * 60 + Number(parts[1]);
}

function loadNaverMapScript(clientId, keyParam) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const param = keyParam || "ncpClientId";
    script.src = `https://openapi.map.naver.com/openapi/v3/maps.js?${param}=${clientId}`;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function initMap() {
  const cfg = window.KIWI_MAP_CONFIG || {};
  if (!cfg.naverMapClientId) return;
  const keyParam = cfg.naverMapKeyParam || "ncpClientId";

  loadNaverMapScript(cfg.naverMapClientId, keyParam)
    .then(() => {
      const mapEl = document.getElementById("map");
      const center = new window.naver.maps.LatLng(36.5, 127.8);
      state.map = new window.naver.maps.Map(mapEl, {
        center,
        zoom: 7,
      });
      document.getElementById("map-placeholder").style.display = "none";
      updateMarkers();
    })
    .catch(() => {
      console.warn("네이버 지도 로딩 실패");
    });
}

function updateMarkers() {
  if (!state.map || !window.naver || !window.naver.maps) return;
  state.markers.forEach((marker) => marker.setMap(null));
  state.markers = [];

  state.filtered.forEach((place) => {
    if (!place.lat || !place.lng) return;
    const pos = new window.naver.maps.LatLng(place.lat, place.lng);
    const marker = new window.naver.maps.Marker({
      position: pos,
      map: state.map,
      icon: {
        content: `<div class="marker">${getCategorySymbol(place.category)}</div>`,
      },
    });
    window.naver.maps.Event.addListener(marker, "click", () => openDetail(place));
    state.markers.push(marker);
  });
}

function bindEvents() {
  document.getElementById("search").addEventListener("input", (event) => {
    state.filters.search = event.target.value;
    applyFilters();
  });

  document.getElementById("open-now").addEventListener("change", (event) => {
    state.filters.openNow = event.target.checked;
    applyFilters();
  });

  document.getElementById("has-recommend").addEventListener("change", (event) => {
    state.filters.hasRecommend = event.target.checked;
    applyFilters();
  });

  document.getElementById("detail-close").addEventListener("click", closeDetail);
  document.getElementById("open-settings").addEventListener("click", () => toggleSettings(true));
  document.getElementById("close-settings").addEventListener("click", () => toggleSettings(false));
  document.getElementById("theme-light").addEventListener("click", () => setTheme("light"));
  document.getElementById("theme-dark").addEventListener("click", () => setTheme("dark"));
}

function start() {
  initTheme();
  renderCategoryFilters();
  bindEvents();
  loadData().then(() => {
    applyFilters();
    initMap();
  });
}

start();
