const memberGrid = document.querySelector("#memberGrid");
const requestList = document.querySelector("#requestList");
const memberTemplate = document.querySelector("#memberTemplate");
const searchInput = document.querySelector("#searchInput");
const clearSearch = document.querySelector("#clearSearch");
const requestForm = document.querySelector("#requestForm");
const formMessage = document.querySelector("#formMessage");
const memberCount = document.querySelector("#memberCount");

const state = {
  members: [],
  requests: []
};

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
      avatar: "MS"
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
      avatar: "AM"
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
      avatar: "NK"
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
      avatar: "DI"
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

    node.querySelector("button").addEventListener("click", () => {
      document.querySelector('[name="need"]').value = member.offers[0];
      document.querySelector('[name="area"]').value = member.neighborhood;
      requestForm.scrollIntoView({ behavior: "smooth" });
      formMessage.textContent = `Starting a request for ${member.name}. Add what you can offer back.`;
    });

    memberGrid.append(node);
  });
}

function renderRequests() {
  requestList.innerHTML = "";

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

async function loadMembers(query = "") {
  const data = await api(`/api/members?q=${encodeURIComponent(query)}`);
  state.members = data.members;
  renderMembers();
}

async function loadRequests() {
  const data = await api("/api/requests");
  state.requests = data.requests;
  renderRequests();
}

searchInput.addEventListener("input", () => {
  loadMembers(searchInput.value).catch(() => {
    memberGrid.innerHTML = '<p class="empty-state">Could not load matches right now.</p>';
  });
});

clearSearch.addEventListener("click", () => {
  searchInput.value = "";
  loadMembers();
  searchInput.focus();
});

requestForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  formMessage.textContent = "Posting request...";

  const formData = new FormData(requestForm);
  const payload = Object.fromEntries(formData.entries());

  try {
    await api("/api/requests", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    requestForm.reset();
    formMessage.textContent = "Request posted. Your community board is updated.";
    await loadRequests();
  } catch (error) {
    formMessage.textContent = error.message;
  }
});

async function init() {
  await Promise.all([loadMembers(), loadRequests()]);
}

init().catch(() => {
  memberGrid.innerHTML = '<p class="empty-state">Could not load the app right now.</p>';
});
