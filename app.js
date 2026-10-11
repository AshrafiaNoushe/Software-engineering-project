/* =====================================================
   MUSLIMS USUAL DAY TRACKING SYSTEM
   Main JavaScript Application
===================================================== */

"use strict";

/* ---------- 1. HELPER FUNCTIONS ---------- */

const $ = (id) => document.getElementById(id);

function toast(message) {
  const element = $("toast");

  if (element) {
    element.textContent = message;
    element.classList.add("show");

    setTimeout(() => element.classList.remove("show"), 3000);
  } else {
    console.log(message);
  }
}

/* ---------- 2. PRAYER TIMES ---------- */

async function loadPrayerTimes() {
  const cityInput = $("city");
  const status = $("prayerStatus");
  const grid = $("prayerGrid");

  if (!status || !grid) return;

  const city = cityInput?.value.trim() || "Dhaka";

  status.textContent = `Loading prayer times for ${city}...`;
  grid.replaceChildren();

  try {
    const url =
      `https://api.aladhan.com/v1/timingsByCity` +
      `?city=${encodeURIComponent(city)}` +
      `&country=Bangladesh&method=1`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const result = await response.json();

    if (result.code !== 200 || !result.data?.timings) {
      throw new Error("Prayer times were not returned by the API.");
    }

    const timings = result.data.timings;

    const prayers = [
      ["Fajr", timings.Fajr],
      ["Sunrise", timings.Sunrise],
      ["Dhuhr", timings.Dhuhr],
      ["Asr", timings.Asr],
      ["Maghrib", timings.Maghrib],
      ["Isha", timings.Isha]
    ];

    prayers.forEach(([name, time]) => {
      const card = document.createElement("article");
      card.className = "prayer-card";

      const heading = document.createElement("h3");
      heading.textContent = name;

      const timeText = document.createElement("p");
      timeText.textContent = time;

      card.append(heading, timeText);
      grid.appendChild(card);
    });

    status.textContent =
      `Prayer times for ${city} — ${result.data.date.readable}`;

  } catch (error) {
    console.error("Prayer time error:", error);

    status.textContent =
      "Could not load prayer times. Check your internet connection and try again.";
  }
}

$("updatePrayer")?.addEventListener("click", loadPrayerTimes);

$("city")?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") loadPrayerTimes();
});

/* ---------- 3. SUPABASE AUTHENTICATION ---------- */

// config.js should initialize supabaseClient.
// For example:
// const supabaseClient = window.supabase.createClient(URL, KEY);

let authMode = "login";

function setAuthMessage(message, isError = false) {
  const element = $("authMessage");

  if (element) {
    element.textContent = message;
    element.style.color = isError ? "#b42318" : "";
  }
}

function openAuth(mode = "login") {
  authMode = mode;
  updateAuthDialog();

  const dialog = $("authDialog");

  if (dialog && !dialog.open) {
    dialog.showModal();
  }
}

function updateAuthDialog() {
  const isSignup = authMode === "signup";

  if ($("authTitle")) {
    $("authTitle").textContent = isSignup
      ? "Create your account"
      : "Log in to your account";
  }

  if ($("authSubmit")) {
    $("authSubmit").textContent = isSignup ? "Sign up" : "Log in";
  }

  if ($("nameField")) {
    $("nameField").hidden = !isSignup;
  }

  if ($("authPassword")) {
    $("authPassword").autocomplete = isSignup
      ? "new-password"
      : "current-password";
  }

  if ($("authSwitch")) {
    $("authSwitch").firstChild.textContent = isSignup
      ? "Already have an account? "
      : "New here? ";
  }

  if ($("switchAuth")) {
    $("switchAuth").textContent = isSignup
      ? "Log in"
      : "Create an account";
  }

  setAuthMessage("");
}

async function refreshAuthUI() {
  const client = window.supabaseClient;

  if (!client) {
    if ($("loginOpen")) $("loginOpen").hidden = false;
    if ($("signupOpen")) $("signupOpen").hidden = false;
    if ($("userMenu")) $("userMenu").hidden = true;
    return;
  }

  try {
    const { data, error } = await client.auth.getSession();

    if (error) throw error;

    const user = data.session?.user;

    if ($("loginOpen")) $("loginOpen").hidden = !!user;
    if ($("signupOpen")) $("signupOpen").hidden = !!user;
    if ($("userMenu")) $("userMenu").hidden = !user;

    if ($("userLabel")) {
      $("userLabel").textContent =
        user?.user_metadata?.display_name ||
        user?.email ||
        "";
    }
  } catch (error) {
    console.error("Session error:", error);
  }
}

$("loginOpen")?.addEventListener("click", () => openAuth("login"));
$("signupOpen")?.addEventListener("click", () => openAuth("signup"));

$("closeAuth")?.addEventListener("click", () => {
  $("authDialog")?.close();
});

$("switchAuth")?.addEventListener("click", () => {
  authMode = authMode === "login" ? "signup" : "login";
  updateAuthDialog();
});

$("authForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const client = window.supabaseClient;

  if (!client) {
    setAuthMessage(
      "Supabase is not configured. Check your config.js file.",
      true
    );
    return;
  }

  const email = $("authEmail")?.value.trim();
  const password = $("authPassword")?.value;
  const displayName = $("displayName")?.value.trim();

  if (!email || !password) {
    setAuthMessage("Please enter your email and password.", true);
    return;
  }

  const submitButton = $("authSubmit");
  if (submitButton) submitButton.disabled = true;

  try {
    let result;

    if (authMode === "signup") {
      result = await client.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName || "" }
        }
      });
    } else {
      result = await client.auth.signInWithPassword({
        email,
        password
      });
    }

    if (result.error) throw result.error;

    if (
      authMode === "signup" &&
      !result.data.session
    ) {
      setAuthMessage(
        "Account created! Check your email if confirmation is required."
      );
      return;
    }

    setAuthMessage(
      authMode === "signup"
        ? "Account created successfully!"
        : "Login successful!"
    );

    await refreshAuthUI();

    setTimeout(() => $("authDialog")?.close(), 800);

  } catch (error) {
    console.error("Authentication error:", error);
    setAuthMessage(error.message || "Authentication failed.", true);
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
});

$("logoutBtn")?.addEventListener("click", async () => {
  const client = window.supabaseClient;

  if (!client) return toast("Supabase is not configured.");

  try {
    const { error } = await client.auth.signOut();

    if (error) throw error;

    await refreshAuthUI();
    toast("You have logged out.");
  } catch (error) {
    console.error("Logout error:", error);
    toast("Could not log out. Please try again.");
  }
});

/* ---------- 4. COMMUNITY QUESTIONS ---------- */

const STORAGE_KEY = "muslims_day_questions_v1";

let questions = [];

try {
  questions = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

  if (!Array.isArray(questions)) questions = [];
} catch {
  questions = [];
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(questions));
  } catch (error) {
    console.error("Could not save questions:", error);
    toast("Unable to save data in this browser.");
  }
}

function render() {
  const container = $("questions");
  const empty = $("empty");

  if (!container) return;

  container.replaceChildren();

  const searchTerm = $("search")?.value.trim().toLowerCase() || "";
  const category = $("category")?.value || "All";

  const filtered = questions.filter((question) => {
    const matchesSearch =
      (question.title || "").toLowerCase().includes(searchTerm) ||
      (question.details || "").toLowerCase().includes(searchTerm);

    const matchesCategory =
      category === "All" || question.category === category;

    return matchesSearch && matchesCategory;
  });

  filtered.forEach((question) => {
    const card = document.createElement("article");
    card.className = "question-card";

    const categoryLabel = document.createElement("p");
    categoryLabel.className = "eyebrow";
    categoryLabel.textContent = question.category || "Faith";

    const heading = document.createElement("h3");
    heading.textContent = question.title;

    const details = document.createElement("p");
    details.textContent = question.details || "Shared with the community.";

    const date = document.createElement("small");
    date.textContent = question.date
      ? new Date(question.date).toLocaleDateString()
      : "";

    card.append(categoryLabel, heading, details, date);
    container.appendChild(card);
  });

  if (empty) empty.hidden = filtered.length > 0;
}

function openQuestion() {
  const client = window.supabaseClient;

  if (!client) {
    openAuth("signup");
    setAuthMessage(
      "You can browse the demo now. Configure Supabase to create an account."
    );
    return;
  }

  openQuestionDialog();
}

function openQuestionDialog() {
  const title = prompt("Write your anonymous question:");

  if (title === null) return;

  if (title.trim().length < 8) {
    toast("Your question must be at least 8 characters.");
    return;
  }

  questions.unshift({
    id: "q" + Date.now(),
    title: title.trim(),
    category: "Faith",
    details: "",
    answers: [],
    votes: 0,
    date: Date.now()
  });

  save();
  render();

  toast("Question saved in this browser.");
}

$("askBtn")?.addEventListener("click", openQuestion);

// Optional button: only attach a handler if it exists.
$("askTop")?.addEventListener("click", openQuestion);

$("search")?.addEventListener("input", render);
$("category")?.addEventListener("change", render);

/* ---------- 5. DEMO ISLAMIC GUIDANCE ---------- */

const guidanceResponses = [
  {
    keywords: ["quran", "read", "translation"],
    answer:
      "You can explore Quran translations at Quran.com. Compare translations and consult reliable scholarship when a verse needs deeper explanation."
  },
  {
    keywords: ["prayer", "salah", "routine", "namaz"],
    answer:
      "Try building a consistent routine around the five daily prayers. Use reliable local prayer times and make gradual, sustainable changes."
  },
  {
    keywords: ["reference", "source", "hadith", "verify"],
    answer:
      "Check the original reference, collection, and grading where available. Consult qualified scholars rather than relying only on social media posts."
  }
];

function getGuidanceResponse(message) {
  const text = message.toLowerCase();

  for (const item of guidanceResponses) {
    if (item.keywords.some((keyword) => text.includes(keyword))) {
      return item.answer;
    }
  }

  return "Thank you for your question. This demo cannot provide a verified religious ruling. Please consult reliable Islamic resources or a qualified scholar for guidance.";
}

function addMessage(message, className) {
  const container = $("messages");
  if (!container) return;

  const paragraph = document.createElement("p");
  paragraph.className = className;
  paragraph.textContent = message;

  container.appendChild(paragraph);
  container.scrollTop = container.scrollHeight;
}

$("chatForm")?.addEventListener("submit", (event) => {
  event.preventDefault();

  const input = $("chatInput");
  const message = input?.value.trim();

  if (!message) return;

  addMessage(message, "user");
  addMessage(getGuidanceResponse(message), "bot");

  input.value = "";
});

document.querySelectorAll("[data-prompt]").forEach((button) => {
  button.addEventListener("click", () => {
    const input = $("chatInput");
    if (!input) return;

    input.value = button.dataset.prompt || "";
    input.focus();
  });
});

/* ---------- 6. MODERATION DEMO ---------- */

const reportedItems = [];

function renderReports() {
  const container = $("reports");
  const count = $("reportCount");

  if (count) count.textContent = reportedItems.length;
  if (!container) return;

  container.replaceChildren();

  if (reportedItems.length === 0) {
    container.textContent = "No reported content.";
    return;
  }

  reportedItems.forEach((report) => {
    const item = document.createElement("p");
    item.textContent = report;
    container.appendChild(item);
  });
}

$("modBtn")?.addEventListener("click", () => {
  renderReports();
  $("moderationDialog")?.showModal();
});

$("closeMod")?.addEventListener("click", () => {
  $("moderationDialog")?.close();
});

$("clearReports")?.addEventListener("click", () => {
  reportedItems.length = 0;
  renderReports();
  toast("Demo reports cleared.");
});

/* ---------- 7. MOBILE NAVIGATION ---------- */

$("mobileMenu")?.addEventListener("click", () => {
  const nav = document.querySelector("header nav");

  if (nav) {
    nav.classList.toggle("open");
  }
});

document.querySelectorAll("header nav a").forEach((link) => {
  link.addEventListener("click", () => {
    document.querySelector("header nav")?.classList.remove("open");
  });
});

/* ---------- 8. FOOTER YEAR ---------- */

if ($("year")) {
  $("year").textContent = new Date().getFullYear();
}

/* ---------- 9. INITIALIZE APPLICATION ---------- */

document.addEventListener("DOMContentLoaded", async () => {
  render();
  renderReports();

  // Prayer times do not depend on Supabase authentication.
  await loadPrayerTimes();

  // Initialize the authentication UI.
  await refreshAuthUI();

  const client = window.supabaseClient;

  if (client) {
    client.auth.onAuthStateChange(() => {
      refreshAuthUI();
    });
  }
});