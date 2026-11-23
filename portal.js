// 1. REPLACE THESE TWO VALUES WITH YOUR SUPABASE PROJECT URL & PUBLISHABLE KEY
const SUPABASE_URL = "https://tqnwtdrddnzxqrdzjvoa.supabase.co";
const SUPABASE_KEY = "sb_publishable_t3YEm3v_JRJytkEVpouwig_cT63SlNl";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const pageType = document.body.dataset.page || "home";
const loginSection = document.getElementById("login-section");
const dashboardSection = document.getElementById("dashboard-section");
const logoutBtn = document.getElementById("logout-btn");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const driverEmailSpan = document.getElementById("driver-email");
const docSearchInput = document.getElementById("doc-search-input");

let allDocs = [];
let activeDocId = null;

// 2. Check session & protect all sub-pages
async function checkSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    showDashboard(session.user);
  } else {
    if (pageType !== "home") {
      window.location.href = "portal.html";
      return;
    }
    showLogin();
  }
}

function showLogin() {
  if (loginSection) loginSection.style.display = "block";
  if (dashboardSection) dashboardSection.style.display = "none";
  if (logoutBtn) logoutBtn.style.display = "none";
}

function showDashboard(user) {
  if (loginSection) loginSection.style.display = "none";
  if (dashboardSection) dashboardSection.style.display = "block";
  if (logoutBtn) logoutBtn.style.display = "inline-block";

  if (driverEmailSpan) driverEmailSpan.textContent = user.email;

  if (pageType === "home") {
    loadLatestConvoy();
    loadAnnouncements();
  } else if (pageType === "disciplinaries") {
    loadDisciplinaries(user);
  } else if (pageType === "docs") {
    loadDocs();
  }
}

// 3. Login & Logout handlers
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.textContent = "Signing in...";

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      loginError.textContent = error.message;
    } else {
      loginError.textContent = "";
      showDashboard(data.user);
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    if (pageType !== "home") {
      window.location.href = "portal.html";
    } else {
      showLogin();
    }
  });
}

// 4. Dashboard Home: Convoy & Announcements
async function loadLatestConvoy() {
  const convoyContainer = document.getElementById("latest-convoy-card");
  if (!convoyContainer) return;

  const { data: convoys, error } = await supabaseClient
    .from("convoys")
    .select("*")
    .order("id", { ascending: false })
    .limit(1);

  if (error) {
    convoyContainer.innerHTML = `<p style="color:#ef4444;">Error loading convoy: ${error.message}</p>`;
    return;
  }

  if (!convoys || convoys.length === 0) {
    convoyContainer.innerHTML = `<p style="color: var(--text-muted);">No upcoming convoy scheduled yet.</p>`;
    return;
  }

  const c = convoys[0];
  convoyContainer.innerHTML = `
    <span style="display:inline-block; font-size:0.75rem; font-weight:700; text-transform:uppercase; color:var(--accent); margin-bottom:0.35rem;">
      Official VTC Convoy
    </span>
    <h3 style="margin:0;">${c.route}</h3>
    <div style="display:flex; flex-wrap:wrap; gap:1.25rem; margin:0.75rem 0 1rem 0;">
      <span><strong>📅 Date:</strong> ${c.convoy_date}</span>
      <span><strong>⏰ Departure:</strong> ${c.departure_time}</span>
      <span><strong>🌐 Server:</strong> ${c.server_name}</span>
    </div>
    <p style="font-style: italic; font-size: 0.92rem; color: var(--text-muted);">${c.notes || ""}</p>
  `;
}

async function loadAnnouncements() {
  const annContainer = document.getElementById("announcements-list");
  if (!annContainer) return;

  const { data: announcements, error } = await supabaseClient
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    annContainer.innerHTML = `<p style="color:#ef4444;">Error loading announcements: ${error.message}</p>`;
    return;
  }

  if (!announcements || announcements.length === 0) {
    annContainer.innerHTML = `<p style="color:var(--text-muted);">No announcements posted yet.</p>`;
    return;
  }

  annContainer.innerHTML = announcements.map(item => `
    <div class="card">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem; flex-wrap:wrap; gap:0.5rem;">
        <h3 style="margin:0;">${item.title}</h3>
        <span style="font-size:0.85rem; color:var(--text-muted);">Posted by ${item.author} • ${new Date(item.created_at).toLocaleDateString()}</span>
      </div>
      <p style="white-space: pre-line;">${item.body}</p>
    </div>
  `).join("");
}

// 5. Private Disciplinaries Page (Strictly filtered to logged-in user's Discord ID)
async function loadDisciplinaries(user) {
  const listContainer = document.getElementById("disciplinaries-list");
  if (!listContainer) return;

  const linkedDiscordId = user.user_metadata && user.user_metadata.discord_id;
  if (!linkedDiscordId) {
    listContainer.innerHTML = `
      <div class="card">
        <p style="color: #f59e0b; margin: 0;">
          Your Discord account is not linked to your portal login yet. Contact management to link your Discord User ID.
        </p>
      </div>
    `;
    return;
  }

  const { data: records, error } = await supabaseClient
    .from("disciplinaries")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    listContainer.innerHTML = `<p style="color:#ef4444;">Error loading records: ${error.message}</p>`;
    return;
  }

  const items = records || [];
  const activeItems = items.filter(r => r.active);

  const driverWarnEl = document.getElementById("count-driver-warn");
  const driverStrikeEl = document.getElementById("count-driver-strike");
  const staffWarnEl = document.getElementById("count-staff-warn");
  const staffStrikeEl = document.getElementById("count-staff-strike");

  if (driverWarnEl) driverWarnEl.textContent = activeItems.filter(r => r.infraction_type === "Driver Warning").length;
  if (driverStrikeEl) driverStrikeEl.textContent = activeItems.filter(r => r.infraction_type === "Driver Strike").length;
  if (staffWarnEl) staffWarnEl.textContent = activeItems.filter(r => r.infraction_type === "Staff Warning").length;
  if (staffStrikeEl) staffStrikeEl.textContent = activeItems.filter(r => r.infraction_type === "Staff Strike").length;

  if (items.length === 0) {
    listContainer.innerHTML = `
      <div class="card">
        <p style="color: #22c55e; margin: 0;">✅ Clean record — you have no warnings or strikes.</p>
      </div>
    `;
    return;
  }

  listContainer.innerHTML = items.map(r => {
    const isStrike = r.infraction_type.toLowerCase().includes("strike");
    const badgeColor = isStrike ? "#ef4444" : "#f59e0b";
    return `
      <div class="card" style="border-left: 4px solid ${badgeColor}; opacity: ${r.active ? "1" : "0.6"};">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem; margin-bottom:0.5rem;">
          <strong style="color:${badgeColor}; text-transform:uppercase; font-size:0.9rem;">
            ${r.infraction_type} ${r.active ? "" : "(Expired / Removed)"}
          </strong>
          <span style="font-size:0.85rem; color:var(--text-muted);">
            Issued by ${r.issued_by} • ${new Date(r.created_at).toLocaleDateString()}
          </span>
        </div>
        <p style="margin:0;">${r.reason}</p>
      </div>
    `;
  }).join("");
}

// 6. Policies & Documentation Page
async function loadDocs() {
  const sidebarList = document.getElementById("docs-sidebar-list");
  const readerPane = document.getElementById("doc-reader-pane");
  if (!sidebarList || !readerPane) return;

  const { data: policies, error } = await supabaseClient
    .from("policies")
    .select("*")
    .order("category", { ascending: true });

  if (error) {
    sidebarList.innerHTML = `<p style="color:#ef4444;">Error: ${error.message}</p>`;
    return;
  }

  allDocs = policies || [];

  if (allDocs.length === 0) {
    sidebarList.innerHTML = `<p style="color:var(--text-muted);">No articles added yet.</p>`;
    readerPane.innerHTML = `<p style="color:var(--text-muted);">No documentation available.</p>`;
    return;
  }

  renderSidebar(allDocs);
  openDocArticle(allDocs[0].id);
}

function renderSidebar(docsToRender) {
  const sidebarList = document.getElementById("docs-sidebar-list");
  if (!sidebarList) return;

  if (docsToRender.length === 0) {
    sidebarList.innerHTML = `<p style="color:var(--text-muted); font-size:0.9rem;">No matching articles found.</p>`;
    return;
  }

  const grouped = {};
  docsToRender.forEach(doc => {
    if (!grouped[doc.category]) grouped[doc.category] = [];
    grouped[doc.category].push(doc);
  });

  let html = "";
  for (const [category, items] of Object.entries(grouped)) {
    html += `<div class="doc-category-label">${category}</div>`;
    items.forEach(doc => {
      const isActive = doc.id === activeDocId ? "active" : "";
      html += `<button class="doc-nav-item ${isActive}" onclick="openDocArticle(${doc.id})">${doc.title}</button>`;
    });
  }

  sidebarList.innerHTML = html;
}

function openDocArticle(docId) {
  const doc = allDocs.find(d => d.id === docId);
  if (!doc) return;

  activeDocId = doc.id;
  const currentQuery = docSearchInput ? docSearchInput.value.toLowerCase().trim() : "";
  renderSidebar(filterDocs(currentQuery));

  const readerPane = document.getElementById("doc-reader-pane");
  if (!readerPane) return;

  readerPane.innerHTML = `
    <span style="display:inline-block; font-size:0.78rem; font-weight:700; text-transform:uppercase; color:var(--accent); letter-spacing:0.05em;">
      ${doc.category}
    </span>
    <h2 style="text-align:left; font-size:1.8rem; margin:0.35rem 0 0.5rem 0;">${doc.title}</h2>
    ${doc.summary
      ? `<p style="color:var(--text-muted); font-size:0.95rem; border-bottom:1px solid var(--border); padding-bottom:1rem;">${doc.summary}</p>`
      : `<hr style="border:0; border-top:1px solid var(--border); margin:1rem 0;">`}
    <div class="doc-reader-body">${doc.content}</div>
  `;
}

function filterDocs(query) {
  if (!query) return allDocs;
  return allDocs.filter(doc =>
    doc.title.toLowerCase().includes(query) ||
    doc.category.toLowerCase().includes(query) ||
    doc.content.toLowerCase().includes(query) ||
    (doc.summary && doc.summary.toLowerCase().includes(query))
  );
}

if (docSearchInput) {
  docSearchInput.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase().trim();
    renderSidebar(filterDocs(query));
  });
}

checkSession();