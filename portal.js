// 1. REPLACE THESE TWO VALUES WITH YOUR SUPABASE PROJECT URL & PUBLISHABLE KEY
const SUPABASE_URL = "https://tqnwtdrddnzxqrdzjvoa.supabase.co";
const SUPABASE_KEY = "sb_publishable_t3YEm3v_JRJytkEVpouwig_cT63SlNl";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const pageType = document.body.dataset.page || "home";
const loginSection = document.getElementById("login-section");
const dashboardSection = document.getElementById("dashboard-section");
const openSettingsBtn = document.getElementById("open-settings-btn");
const logoutBtn = document.getElementById("logout-btn");
const loginForm = document.getElementById("login-form");
const forgotPasswordBtn = document.getElementById("forgot-password-btn");
const loginError = document.getElementById("login-error");
const driverEmailSpan = document.getElementById("driver-email");
const docSearchInput = document.getElementById("doc-search-input");

// Right-Side Account Settings Drawer elements
const settingsBackdrop = document.getElementById("settings-drawer-backdrop");
const settingsDrawer = document.getElementById("settings-drawer");
const closeSettingsBtn = document.getElementById("close-settings-btn");
const profileSettingsForm = document.getElementById("profile-settings-form");
const changePasswordForm = document.getElementById("change-password-form");

let allDocs = [];
let activeDocId = null;
let isPasswordRecovery = false;

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
  if (openSettingsBtn) openSettingsBtn.style.display = "none";
  if (logoutBtn) logoutBtn.style.display = "none";
  if (settingsBackdrop) settingsBackdrop.style.display = "none";
  if (settingsDrawer) settingsDrawer.classList.remove("open");
}

async function showDashboard(user) {
  if (loginSection) loginSection.style.display = "none";
  if (dashboardSection) dashboardSection.style.display = "block";
  if (openSettingsBtn) openSettingsBtn.style.display = "inline-block";
  if (logoutBtn) logoutBtn.style.display = "inline-block";

  let currentUser = user;
  const { data: freshData } = await supabaseClient.auth.getUser();
  if (freshData && freshData.user) {
    currentUser = freshData.user;
  }

  const displayName =
    (currentUser.user_metadata &&
      (currentUser.user_metadata.username || currentUser.user_metadata.haulmp_username)) ||
    currentUser.email;

  if (driverEmailSpan) driverEmailSpan.textContent = displayName;

  if (pageType === "home") {
    loadLatestConvoy();
    loadAnnouncements();
  } else if (pageType === "disciplinaries") {
    loadDisciplinaries(currentUser);
  } else if (pageType === "docs") {
    loadDocs();
  }
}

// 3. Login, Forgot Password & Logout handlers
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (loginError) {
      loginError.style.color = "#94a3b8";
      loginError.textContent = "Signing in...";
    }

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (loginError) {
        loginError.style.color = "#ef4444";
        loginError.textContent = error.message;
      }
    } else {
      if (loginError) loginError.textContent = "";
      showDashboard(data.user);
    }
  });
}

if (forgotPasswordBtn) {
  forgotPasswordBtn.addEventListener("click", async () => {
    const emailInput = document.getElementById("email");
    const email = emailInput ? emailInput.value.trim() : "";

    if (!email) {
      if (loginError) {
        loginError.style.color = "#f59e0b";
        loginError.textContent = "Enter your driver email above first, then click Forgot your password.";
      }
      return;
    }

    if (loginError) {
      loginError.style.color = "#94a3b8";
      loginError.textContent = "Sending password reset email...";
    }

    const basePath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf("/") + 1);
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${basePath}portal.html`,
    });

    if (error) {
      if (loginError) {
        loginError.style.color = "#ef4444";
        loginError.textContent = error.message;
      }
    } else {
      if (loginError) {
        loginError.style.color = "#22c55e";
        loginError.textContent = "Password reset link sent! Check your inbox (and spam folder).";
      }
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

supabaseClient.auth.onAuthStateChange((event, session) => {
  if (event === "PASSWORD_RECOVERY" && session) {
    isPasswordRecovery = true;
    showDashboard(session.user);
    openSettingsDrawer();

    const currentGroup = document.getElementById("current-password-group");
    const currentInput = document.getElementById("current-password");
    if (currentGroup) currentGroup.style.display = "none";
    if (currentInput) currentInput.required = false;

    const passwordStatus = document.getElementById("password-status-msg");
    if (passwordStatus) {
      passwordStatus.style.color = "#3b82f6";
      passwordStatus.textContent = "Enter and save your new password below.";
    }
  }
});

// 3b. Account Settings Right-Side Drawer & Forms
async function loadAccountSettings() {
  const { data: { user }, error } = await supabaseClient.auth.getUser();
  if (error || !user) return;

  const emailInput = document.getElementById("settings-email");
  const usernameInput = document.getElementById("settings-username");
  const discordInput = document.getElementById("settings-discord");

  if (emailInput) emailInput.value = user.email || "";
  if (user.user_metadata) {
    if (usernameInput) usernameInput.value = user.user_metadata.username || "";
    if (discordInput) discordInput.value = user.user_metadata.discord_id || "Not linked";
  }
}

function openSettingsDrawer() {
  if (!settingsBackdrop || !settingsDrawer) return;
  settingsBackdrop.style.display = "flex";
  requestAnimationFrame(() => {
    settingsDrawer.classList.add("open");
  });

  const profileStatus = document.getElementById("profile-status-msg");
  const passwordStatus = document.getElementById("password-status-msg");
  if (profileStatus) profileStatus.textContent = "";
  if (passwordStatus) passwordStatus.textContent = "";
  loadAccountSettings();
}

function closeSettingsDrawer() {
  if (!settingsBackdrop || !settingsDrawer) return;
  settingsDrawer.classList.remove("open");
  setTimeout(() => {
    if (!settingsDrawer.classList.contains("open")) {
      settingsBackdrop.style.display = "none";
    }
  }, 250);
}

if (openSettingsBtn) {
  openSettingsBtn.addEventListener("click", openSettingsDrawer);
}

if (closeSettingsBtn) {
  closeSettingsBtn.addEventListener("click", closeSettingsDrawer);
}

if (settingsBackdrop) {
  let pointerDownOnBackdrop = false;

  settingsBackdrop.addEventListener("mousedown", (e) => {
    pointerDownOnBackdrop = e.target === settingsBackdrop;
  });

  settingsBackdrop.addEventListener("click", (e) => {
    const selectedText = window.getSelection ? window.getSelection().toString() : "";
    if (pointerDownOnBackdrop && e.target === settingsBackdrop && !selectedText) {
      closeSettingsDrawer();
    }
    pointerDownOnBackdrop = false;
  });
}

if (profileSettingsForm) {
  profileSettingsForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const statusMsg = document.getElementById("profile-status-msg");
    const username = document.getElementById("settings-username").value.trim();

    if (statusMsg) {
      statusMsg.textContent = "Saving...";
      statusMsg.style.color = "#94a3b8";
    }

    const { error } = await supabaseClient.auth.updateUser({
      data: { username }
    });

    if (statusMsg) {
      if (error) {
        statusMsg.textContent = `Error: ${error.message}`;
        statusMsg.style.color = "#ef4444";
      } else {
        statusMsg.textContent = "Profile details updated!";
        statusMsg.style.color = "#22c55e";
        if (driverEmailSpan && username) driverEmailSpan.textContent = username;
      }
    }
  });
}

if (changePasswordForm) {
  changePasswordForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const statusMsg = document.getElementById("password-status-msg");
    const currentPasswordInput = document.getElementById("current-password");
    const currentPassword = currentPasswordInput ? currentPasswordInput.value : "";
    const newPassword = document.getElementById("new-password").value;
    const confirmPassword = document.getElementById("confirm-password").value;

    if (newPassword !== confirmPassword) {
      if (statusMsg) {
        statusMsg.textContent = "New passwords do not match.";
        statusMsg.style.color = "#ef4444";
      }
      return;
    }

    if (statusMsg) {
      statusMsg.textContent = "Verifying and updating password...";
      statusMsg.style.color = "#94a3b8";
    }

    if (!isPasswordRecovery && currentPasswordInput) {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user || !user.email) {
        if (statusMsg) {
          statusMsg.textContent = "Session error. Please log in again.";
          statusMsg.style.color = "#ef4444";
        }
        return;
      }

      const { error: verifyError } = await supabaseClient.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (verifyError) {
        if (statusMsg) {
          statusMsg.textContent = "Current password is incorrect.";
          statusMsg.style.color = "#ef4444";
        }
        return;
      }
    }

    const { error } = await supabaseClient.auth.updateUser({
      password: newPassword
    });

    if (statusMsg) {
      if (error) {
        statusMsg.textContent = `Error: ${error.message}`;
        statusMsg.style.color = "#ef4444";
      } else {
        statusMsg.textContent = "Password updated successfully!";
        statusMsg.style.color = "#22c55e";
        changePasswordForm.reset();

        isPasswordRecovery = false;
        const currentGroup = document.getElementById("current-password-group");
        if (currentGroup) currentGroup.style.display = "flex";
        if (currentPasswordInput) currentPasswordInput.required = true;
      }
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

// 7. Smooth Page Transition Between Portal Tabs
(function initPageTransitions() {
  const progressBar = document.createElement("div");
  progressBar.className = "portal-progress-bar";
  document.body.appendChild(progressBar);

  window.addEventListener("pageshow", () => {
    document.body.classList.remove("page-leaving");
  });

  document.querySelectorAll(".portal-tab").forEach((tab) => {
    tab.addEventListener("click", (e) => {
      const targetUrl = tab.getAttribute("href");
      if (!targetUrl || tab.classList.contains("active")) return;

      e.preventDefault();
      document.body.classList.add("page-leaving");

      setTimeout(() => {
        window.location.href = targetUrl;
      }, 550);
    });
  });
})();

// 8. Sidebar Selection Guard & Animated Close Menu Button
(function initSidebarControls() {
  const sidebarEl =
    document.getElementById("sidebar-panel") ||
    document.getElementById("docs-sidebar") ||
    document.querySelector(".docs-sidebar, .sidebar-panel, aside.sidebar");

  if (!sidebarEl) return;

  const backdropEl =
    sidebarEl.closest(".sidebar-backdrop, .drawer-backdrop, #sidebar-backdrop") || null;

  if (!document.getElementById("vortex-sidebar-close-style")) {
    const styleEl = document.createElement("style");
    styleEl.id = "vortex-sidebar-close-style";
    styleEl.textContent = `
      .vortex-sidebar-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        padding-bottom: 0.65rem;
        margin-bottom: 0.75rem;
        border-bottom: 1px solid var(--border, #262d3d);
      }
      .vortex-sidebar-title {
        font-size: 0.8rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--text-muted, #94a3b8);
      }
      .vortex-close-menu-btn {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        border: 1px solid rgba(148, 163, 184, 0.25);
        background: rgba(30, 41, 59, 0.75);
        color: #cbd5e1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition:
          background-color 0.22s ease,
          border-color 0.22s ease,
          color 0.22s ease,
          transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
      }
      .vortex-close-menu-btn .vortex-close-x {
        display: inline-block;
        font-size: 1.3rem;
        line-height: 1;
        transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
      }
      .vortex-close-menu-btn:hover {
        background: rgba(239, 68, 68, 0.16);
        border-color: rgba(239, 68, 68, 0.55);
        color: #f87171;
        transform: scale(1.06);
      }
      .vortex-close-menu-btn:hover .vortex-close-x {
        transform: rotate(90deg);
      }
      .vortex-close-menu-btn:active,
      .vortex-close-menu-btn.is-closing {
        transform: scale(0.88) rotate(90deg);
        opacity: 0.65;
      }
      .vortex-sidebar-collapsed {
        display: none !important;
      }
    `;
    document.head.appendChild(styleEl);
  }

  function hideSidebarWithAnimation() {
    const closeBtn = sidebarEl.querySelector(".vortex-close-menu-btn");
    if (closeBtn) closeBtn.classList.add("is-closing");

    sidebarEl.style.transition = "opacity 0.28s ease, transform 0.28s ease";
    sidebarEl.style.opacity = "0";
    sidebarEl.style.transform = "translateX(-12px)";

    setTimeout(() => {
      if (backdropEl) {
        backdropEl.classList.remove("open");
        backdropEl.style.display = "none";
      } else {
        sidebarEl.classList.add("vortex-sidebar-collapsed");
      }
      sidebarEl.style.opacity = "";
      sidebarEl.style.transform = "";
      if (closeBtn) closeBtn.classList.remove("is-closing");
    }, 280);
  }

  if (!sidebarEl.querySelector(".vortex-close-menu-btn")) {
    const headerBar = document.createElement("div");
    headerBar.className = "vortex-sidebar-header";

    const label = document.createElement("span");
    label.className = "vortex-sidebar-title";
    label.textContent = "Menu";

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "vortex-close-menu-btn";
    closeBtn.setAttribute("aria-label", "Close menu");
    closeBtn.title = "Close menu";
    closeBtn.innerHTML = `<span class="vortex-close-x" aria-hidden="true">&times;</span>`;

    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      hideSidebarWithAnimation();
    });

    headerBar.appendChild(label);
    headerBar.appendChild(closeBtn);
    sidebarEl.insertBefore(headerBar, sidebarEl.firstChild);
  }

  sidebarEl.addEventListener("mousedown", (e) => {
    e.stopPropagation();
  });

  if (backdropEl) {
    let downOnBackdrop = false;
    backdropEl.addEventListener("mousedown", (e) => {
      downOnBackdrop = e.target === backdropEl;
    });
    backdropEl.addEventListener("click", (e) => {
      const hasSelection = window.getSelection && window.getSelection().toString().length > 0;
      if (downOnBackdrop && e.target === backdropEl && !hasSelection) {
        hideSidebarWithAnimation();
      }
      downOnBackdrop = false;
    });
  }
})();

checkSession();