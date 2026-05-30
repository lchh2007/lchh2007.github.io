/* ============================================================
THEME TOGGLE — Telegram-style circular reveal
============================================================ */
(function() {
const html = document.documentElement;
const toggleBtn = document.getElementById("theme-toggle");
const ripple = document.getElementById("theme-ripple");

const supportsViewTransition = typeof document.startViewTransition === "function";
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function applyTheme(isDark) {
if (isDark) html.setAttribute("data-theme", "dark");
else html.removeAttribute("data-theme");
}

function fallbackRipple(isDark, originX, originY) {
if (!ripple) { applyTheme(isDark); return; }
const maxDist = Math.hypot(
Math.max(originX, window.innerWidth - originX),
Math.max(originY, window.innerHeight - originY)
);
const size = maxDist * 2 + 20;
const color = isDark ? "#080c1a" : "#f5f3f0";

const circle = document.createElement("div");
circle.className = "ripple-circle";
circle.style.cssText = `width:${size}px;height:${size}px;left:${originX-size/2}px;top:${originY-size/2}px;background:${color};transition:transform 0.65s cubic-bezier(0.4,0,0.2,1),opacity 0.45s ease 0.35s;`;
ripple.appendChild(circle);
void circle.offsetWidth;
circle.style.transform = "scale(1)";
setTimeout(() => applyTheme(isDark), 280);
setTimeout(() => { circle.style.opacity = "0"; }, 480);
setTimeout(() => { circle.remove(); }, 900);
}

function viewTransitionRipple(isDark, originX, originY) {
const maxRadius = Math.hypot(
Math.max(originX, window.innerWidth - originX),
Math.max(originY, window.innerHeight - originY)
);
const xPct = (originX / window.innerWidth) * 100;
const yPct = (originY / window.innerHeight) * 100;
html.style.setProperty("--theme-x", xPct + "%");
html.style.setProperty("--theme-y", yPct + "%");
html.style.setProperty("--theme-r", maxRadius + "px");

if (isDark) {
html.classList.add("theme-transition-in");
html.classList.remove("theme-transition-out");
} else {
html.classList.add("theme-transition-out");
html.classList.remove("theme-transition-in");
}

const transition = document.startViewTransition(() => { applyTheme(isDark); });
transition.finished.catch(() => {}).finally(() => {
html.classList.remove("theme-transition-in", "theme-transition-out");
});
}

function setTheme(theme, animate, originX, originY) {
const isDark = theme === "dark";
if (!animate || prefersReducedMotion) { applyTheme(isDark); return; }
if (supportsViewTransition) { viewTransitionRipple(isDark, originX, originY); }
else { fallbackRipple(isDark, originX, originY); }
}

const savedTheme = localStorage.getItem("theme") || "light";
applyTheme(savedTheme === "dark");

let isAnimating = false;
toggleBtn.addEventListener("click", (e) => {
if (isAnimating) return;
isAnimating = true;
const isDark = html.hasAttribute("data-theme");
const newTheme = isDark ? "light" : "dark";
localStorage.setItem("theme", newTheme);
const rect = toggleBtn.getBoundingClientRect();
setTheme(newTheme, true, rect.left + rect.width / 2, rect.top + rect.height / 2);
setTimeout(() => { isAnimating = false; }, 700);
});
})();

/* ============================================================
SEARCH — DOM REFS + LOGIC
============================================================ */
const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");
const suggestionList = document.getElementById("suggestion-list");
const engineTabs = document.querySelectorAll(".engine-tab");
const searchBox = document.querySelector(".search-box");
const glare = document.getElementById("glare");

/* ─── Glare Tracking ─── */
searchBox.addEventListener("mousemove", (e) => {
const rect = searchBox.getBoundingClientRect();
glare.style.setProperty("--gx", ((e.clientX - rect.left) / rect.width * 100) + "%");
glare.style.setProperty("--gy", ((e.clientY - rect.top) / rect.height * 100) + "%");
});

/* ─── Engine Tabs + Glare ─── */
engineTabs.forEach(tab => {
const tg = document.createElement("div");
tg.className = "tab-glare";
tab.appendChild(tg);
tab.addEventListener("mousemove", (e) => {
const rect = tab.getBoundingClientRect();
tg.style.setProperty("--gx", ((e.clientX - rect.left) / rect.width * 100) + "%");
tg.style.setProperty("--gy", ((e.clientY - rect.top) / rect.height * 100) + "%");
});
tab.addEventListener("click", () => {
engineTabs.forEach(t => { t.classList.remove("active"); t.setAttribute("aria-selected", "false"); });
tab.classList.add("active");
tab.setAttribute("aria-selected", "true");
});
});

/* ─── Search Execution ─── */
function getCurrentEngine() {
const active = document.querySelector(".engine-tab.active");
return active ? active.dataset.value : "https://www.baidu.com/s?wd=";
}

function performSearch(queryOverride) {
const query = (queryOverride || searchInput.value).trim();
const engineBaseUrl = getCurrentEngine();
if (query) { window.open(engineBaseUrl + encodeURIComponent(query), "_blank"); }
}

searchBtn.addEventListener("click", () => performSearch());
searchInput.addEventListener("keypress", e => { if (e.key === "Enter") performSearch(); });

/* ─── Suggestions ─── */
let suggestionDebounce = null;
let keyboardIndex = -1;

function showSuggestions(suggestions) {
suggestionList.innerHTML = "";
keyboardIndex = -1;
if (!suggestions || suggestions.length === 0) { hideSuggestions(); return; }
const items = suggestions.slice(0, 7);
items.forEach(item => {
const li = document.createElement("li");
li.textContent = item;
li.setAttribute("role", "option");
li.addEventListener("click", () => selectSuggestion(item));
suggestionList.appendChild(li);
});
suggestionList.classList.add("visible");
searchInput.setAttribute("aria-expanded", "true");
}

function hideSuggestions() {
suggestionList.classList.remove("visible");
searchInput.setAttribute("aria-expanded", "false");
keyboardIndex = -1;
}

function selectSuggestion(text) {
searchInput.value = text;
hideSuggestions();
performSearch(text);
}

function updateKeyboardHighlight() {
const items = suggestionList.querySelectorAll("li");
items.forEach((li, i) => {
li.classList.toggle("keyboard-active", i === keyboardIndex);
if (i === keyboardIndex) li.scrollIntoView({ block: "nearest" });
});
}

searchInput.addEventListener("input", function() {
const query = this.value.trim();
if (suggestionDebounce) clearTimeout(suggestionDebounce);
if (!query) { hideSuggestions(); return; }
suggestionDebounce = setTimeout(() => {
const oldScript = document.querySelector(".suggestion-script");
if (oldScript) oldScript.remove();
const script = document.createElement("script");
script.className = "suggestion-script";
script.src = `https://suggestion.baidu.com/su?wd=${encodeURIComponent(query)}&cb=window.showSuggestions`;
document.body.appendChild(script);
script.remove();
}, 200);
});

searchInput.addEventListener("keydown", function(e) {
const items = suggestionList.querySelectorAll("li");
if (items.length === 0) return;
switch (e.key) {
case "ArrowDown":
e.preventDefault();
keyboardIndex = Math.min(keyboardIndex + 1, items.length - 1);
updateKeyboardHighlight();
break;
case "ArrowUp":
e.preventDefault();
keyboardIndex = Math.max(keyboardIndex - 1, 0);
updateKeyboardHighlight();
break;
case "Enter":
if (keyboardIndex >= 0 && keyboardIndex < items.length) {
e.preventDefault();
selectSuggestion(items[keyboardIndex].textContent);
}
break;
case "Escape": hideSuggestions(); break;
}
});

const observer = new MutationObserver(() => {
if (!suggestionList.classList.contains("visible")) keyboardIndex = -1;
});
observer.observe(suggestionList, { attributes: true, attributeFilter: ["class"] });

window.showSuggestions = function(data) { showSuggestions(data && data.s ? data.s : []); };

document.addEventListener("click", e => {
if (!e.target.closest(".search-wrapper")) hideSuggestions();
});
document.addEventListener("touchstart", e => {
if (!e.target.closest(".search-wrapper")) hideSuggestions();
}, { passive: true });