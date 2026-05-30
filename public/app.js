/* ═══════════════════════════════════════════════════════════════
   SkillSwap — App Logic
   Debounced search · 3D tilt · Particles · Toasts · Skeletons
   ═══════════════════════════════════════════════════════════════ */

const memberGrid = document.querySelector("#memberGrid");
const requestList = document.querySelector("#requestList");
const memberTemplate = document.querySelector("#memberTemplate");
const searchInput = document.querySelector("#searchInput");
const clearSearch = document.querySelector("#clearSearch");
const requestForm = document.querySelector("#requestForm");
const formMessage = document.querySelector("#formMessage");
const memberCount = document.querySelector("#memberCount");
const toastContainer = document.querySelector("#toastContainer");

const state = {
  members: [],
  requests: []
};

/* ── Fallback Community Data ───────────────────────────────── */
const fallbackCommunity = {
  members: [
    {
      id: "mira-shah",
      name: "Mira Shah",
      neighborhood: "Green Park",
      distance: 1.2,
      availability: "Weekends",
      offers: ["Excel dashboards", "Resume review"],
      wants: ["Guitar basics"],
      bio: "Operations analyst who loves turning messy sheets into clean decisions.",
      rating: 4.9,
      swaps: 18,
      avatar: "MS",
      trust: ["Verified", "Top Swapper"],
      joinedDate: "2025-09-14"
    },
    {
      id: "arjun-mehta",
      name: "Arjun Mehta",
      neighborhood: "Lajpat Nagar",
      distance: 2.1,
      availability: "Evenings",
      offers: ["Guitar lessons", "Music theory"],
      wants: ["Basic coding"],
      bio: "Bedroom guitarist helping beginners play their first full song.",
      rating: 4.8,
      swaps: 13,
      avatar: "AM",
      trust: ["Verified"],
      joinedDate: "2025-11-02"
    },
    {
      id: "naina-kapoor",
      name: "Naina Kapoor",
      neighborhood: "Defence Colony",
      distance: 3.4,
      availability: "Flexible",
      offers: ["Basic coding", "Portfolio websites"],
      wants: ["Public speaking"],
      bio: "Frontend developer who can help you build and ship your first page.",
      rating: 5,
      swaps: 24,
      avatar: "NK",
      trust: ["Verified", "Top Swapper", "Mentor"],
      joinedDate: "2025-07-20"
    },
    {
      id: "dev-iyer",
      name: "Dev Iyer",
      neighborhood: "Hauz Khas",
      distance: 4,
      availability: "Mornings",
      offers: ["Public speaking", "Interview practice"],
      wants: ["Excel dashboards"],
      bio: "Toastmasters regular who helps neighbors sound confident and clear.",
      rating: 4.7,
      swaps: 9,
      avatar: "DI",
      trust: ["Verified"],
      joinedDate: "2026-01-10"
    }
  ],
  requests: [
    {
      id: "req-1001",
      name: "Priya S.",
      need: "Resume review",
      offer: "Hindi conversation practice",
      area: "South Delhi",
      status: "Open"
    },
    {
      id: "req-1002",
      name: "Kabir R.",
      need: "Basic coding",
      offer: "Photography basics",
      area: "Central Delhi",
      status: "Open"
    }
  ]
};

/* ── Utilities ─────────────────────────────────────────────── */

function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/* ── Toast Notification System ─────────────────────────────── */

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  const iconMap = {
    success: "✓",
    error: "✕",
    info: "ℹ"
  };

  toast.innerHTML = `
    <span class="toast-icon">${iconMap[type] || iconMap.info}</span>
    <span>${message}</span>
  `;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("fade-out");
    toast.addEventListener("animationend", () => toast.remove());
  }, 4000);
}

/* ── Particle System ───────────────────────────────────────── */

function initParticles() {
  const container = document.querySelector("#particles");
  if (!container) return;

  const colors = ["#00d4ff", "#7b2ff7", "#ff2d7c", "#fbbf24", "#10b981"];

  for (let i = 0; i < 20; i++) {
    const orb = document.createElement("div");
    orb.className = "orb";
    const size = Math.random() * 4 + 2;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const duration = Math.random() * 30 + 15;
    const delay = Math.random() * 10;
    const left = Math.random() * 100;
    const top = Math.random() * 100;

    orb.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      left: ${left}%;
      top: ${top}%;
      --duration: ${duration}s;
      --delay: -${delay}s;
    `;

    container.appendChild(orb);
  }
}

/* ── Intersection Observer (fade-in-up) ────────────────────── */

function initScrollAnimations() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("animate-in");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
  );

  document.querySelectorAll("[data-animate]").forEach((el) => {
    observer.observe(el);
  });
}

/* ── 3D Tilt Effect on Member Cards ────────────────────────── */

function init3DTilt() {
  const grid = document.querySelector(".member-grid");
  if (!grid) return;

  grid.addEventListener("mousemove", (e) => {
    const cards = grid.querySelectorAll(".member-card");
    cards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      const cardCenterX = rect.left + rect.width / 2;
      const cardCenterY = rect.top + rect.height / 2;
      const distX = e.clientX - cardCenterX;
      const distY = e.clientY - cardCenterY;
      const maxDist = 400;

      if (Math.abs(distX) < maxDist && Math.abs(distY) < maxDist) {
        const rotateY = (distX / maxDist) * 5;
        const rotateX = -(distY / maxDist) * 5;
        card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
      }

      const glow = card.querySelector(".card-glow");
      if (glow) {
        const glowX = ((e.clientX - rect.left) / rect.width) * 100;
        const glowY = ((e.clientY - rect.top) / rect.height) * 100;
        glow.style.setProperty("--glow-x", `${glowX}%`);
        glow.style.setProperty("--glow-y", `${glowY}%`);
      }
    });
  });

  grid.addEventListener("mouseleave", () => {
    const cards = grid.querySelectorAll(".member-card");
    cards.forEach((card) => {
      card.style.transform = "";
    });
  });
}

/* ── Smooth Nav ────────────────────────────────────────────── */

function initSmoothNav() {
  const navLinks = document.querySelectorAll(".nav-list a");

  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const targetId = link.getAttribute("href").replace("#", "");
      const target = document.getElementById(targetId);

      navLinks.forEach((l) => l.classList.remove("active"));
      link.classList.add("active");

      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
}

/* ── Loading Skeletons ─────────────────────────────────────── */

function showMemberSkeletons() {
  memberGrid.innerHTML = "";
  for (let i = 0; i < 4; i++) {
    const skeleton = document.createElement("div");
    skeleton.className = "skeleton skeleton-card";
    memberGrid.appendChild(skeleton);
  }
}

function showRequestSkeletons() {
  requestList.innerHTML = "";
  for (let i = 0; i < 2; i++) {
    const skeleton = document.createElement("div");
    skeleton.className = "skeleton skeleton-request";
    requestList.appendChild(skeleton);
  }
}

/* ── Dynamic Stats ─────────────────────────────────────────── */

function renderStats() {
  const members = state.members;
  if (!members.length) return;

  const avgRating = (members.reduce((sum, m) => sum + (m.rating || 0), 0) / members.length).toFixed(1);
  const totalSwaps = members.reduce((sum, m) => sum + (m.swaps || 0), 0);

  const statRating = document.querySelector("#statRating");
  const statSwaps = document.querySelector("#statSwaps");

  if (statRating) statRating.textContent = avgRating;
  if (statSwaps) statSwaps.textContent = `${totalSwaps}`;
}

/* ── Offline API Fallback ──────────────────────────────────── */

function localMatches(query) {
  const search = String(query || "").trim().toLowerCase();

  return fallbackCommunity.members.filter((member) => {
    if (!search) return true;
    return [member.name, member.neighborhood, member.bio, ...member.offers, ...member.wants]
      .join(" ")
      .toLowerCase()
      .includes(search);
  });
}

function offlineApi(path, options = {}) {
  const url = new URL(path, "http://skillswap.local");

  if (url.pathname === "/api/members") {
    return { members: localMatches(url.searchParams.get("q")) };
  }

  if (url.pathname === "/api/requests" && options.method === "POST") {
    const payload = JSON.parse(options.body || "{}");
    const request = {
      id: `local-${Date.now()}`,
      name: payload.name,
      need: payload.need,
      offer: payload.offer,
      area: payload.area,
      status: "Preview"
    };
    fallbackCommunity.requests = [request, ...fallbackCommunity.requests];
    return { request };
  }

  if (url.pathname === "/api/requests") {
    return { requests: fallbackCommunity.requests };
  }

  throw new Error("Preview data is unavailable.");
}

async function api(path, options = {}) {
  let response;

  try {
    response = await fetch(path, {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      },
      ...options
    });
  } catch {
    return offlineApi(path, options);
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }

  return data;
}

/* ── Rendering ─────────────────────────────────────────────── */

function renderTags(container, label, items) {
  container.dataset.label = label;
  container.innerHTML = "";
  items.forEach((item) => {
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = item;
    container.append(tag);
  });
}

function renderTrustBadges(container, badges) {
  container.innerHTML = "";
  if (!badges || !badges.length) return;
  badges.forEach((badge) => {
    const span = document.createElement("span");
    span.className = "trust-badge";
    const iconMap = {
      Verified: "✓",
      "Top Swapper": "★",
      Mentor: "◆"
    };
    span.textContent = `${iconMap[badge] || "●"} ${badge}`;
    container.appendChild(span);
  });
}

function renderMembers() {
  memberGrid.innerHTML = "";
  memberCount.textContent = `${state.members.length} helpers`;

  if (!state.members.length) {
    memberGrid.innerHTML = '<p class="empty-state">No matches yet. Try a broader skill like coding, Excel, guitar, or speaking.</p>';
    return;
  }

  state.members.forEach((member) => {
    const node = memberTemplate.content.cloneNode(true);
    node.querySelector(".avatar").textContent = member.avatar;
    node.querySelector("h4").textContent = member.name;
    node.querySelector(".member-meta").textContent = `${member.neighborhood} · ${member.distance} km · ${member.availability}`;
    node.querySelector(".bio").textContent = member.bio;
    node.querySelector(".rating").textContent = `★ ${member.rating} · ${member.swaps} swaps`;

    renderTags(node.querySelector(".offers"), "Offers", member.offers);
    renderTags(node.querySelector(".wants"), "Wants", member.wants);
    renderTrustBadges(node.querySelector(".trust-badges"), member.trust);

    node.querySelector("button").addEventListener("click", () => {
      document.querySelector('[name="need"]').value = member.offers[0];
      document.querySelector('[name="area"]').value = member.neighborhood;
      requestForm.scrollIntoView({ behavior: "smooth" });
      showToast(`Starting a request for ${member.name}. Add what you can offer back.`, "info");
    });

    memberGrid.append(node);
  });

  renderStats();
  init3DTilt();
}

function renderRequests() {
  requestList.innerHTML = "";

  if (!state.requests.length) {
    requestList.innerHTML = '<p class="empty-state">No open requests right now.</p>';
    return;
  }

  state.requests.forEach((request) => {
    const card = document.createElement("article");
    card.className = "request-card";
    card.innerHTML = `
      <strong>${request.name} needs ${request.need}</strong>
      <p>Can offer ${request.offer} · ${request.area} · ${request.status}</p>
    `;
    requestList.append(card);
  });
}

/* ── Data Loading ──────────────────────────────────────────── */

async function loadMembers(query = "") {
  showMemberSkeletons();
  const data = await api(`/api/members?q=${encodeURIComponent(query)}`);
  state.members = data.members;
  renderMembers();
}

async function loadRequests() {
  showRequestSkeletons();
  const data = await api("/api/requests");
  state.requests = data.requests;
  renderRequests();
}

/* ── Event Listeners ───────────────────────────────────────── */

const debouncedSearch = debounce((value) => {
  loadMembers(value).catch(() => {
    memberGrid.innerHTML = '<p class="empty-state">Could not load matches right now.</p>';
  });
}, 300);

searchInput.addEventListener("input", () => {
  debouncedSearch(searchInput.value);
});

clearSearch.addEventListener("click", () => {
  searchInput.value = "";
  loadMembers();
  searchInput.focus();
});

requestForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  formMessage.textContent = "";

  const formData = new FormData(requestForm);
  const payload = Object.fromEntries(formData.entries());

  try {
    await api("/api/requests", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    requestForm.reset();
    showToast("Request posted! Your community board is updated.", "success");
    await loadRequests();
  } catch (error) {
    showToast(error.message || "Something went wrong.", "error");
  }
});

/* ── Initialization ────────────────────────────────────────── */

async function init() {
  initParticles();
  initSmoothNav();
  initScrollAnimations();

  await Promise.all([loadMembers(), loadRequests()]);
}

init().catch(() => {
  memberGrid.innerHTML = '<p class="empty-state">Could not load the app right now.</p>';
});
