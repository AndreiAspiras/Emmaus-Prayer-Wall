// ============================================================
// Emmaus V2 — shared behavior
// Firebase powers the Prayer Wall.
// EmailJS powers the Contact form.
// ============================================================

let cachedPrayers = [];
let currentWallFilter = "All";

function initNav() {
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (!toggle || !links) return;

  toggle.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });

  links.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      links.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

function showConnectionError() {
  document.querySelectorAll("#recent-preview, #wall-grid, #admin-list").forEach((el) => {
    if (el) {
      el.innerHTML = `<div class="empty-state error-state"><strong>The wall is taking a moment.</strong><span>We couldn't connect to the prayer database. Please refresh and try again.</span></div>`;
    }
  });
}

function listenPrayers() {
  if (typeof db === "undefined") return;
  db.collection("prayers")
    .orderBy("date", "desc")
    .onSnapshot(
      (snapshot) => {
        cachedPrayers = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        renderStats();
        renderRecentPreview();
        renderWall(currentWallFilter);
        renderAdmin();
      },
      (err) => {
        console.error("Firestore read error:", err);
        showConnectionError();
      }
    );
}

function timeAgo(timestamp) {
  const date = Number(timestamp);
  if (!date) return "recently";
  const seconds = Math.max(0, Math.floor((Date.now() - date) / 1000));
  const days = Math.floor(seconds / 86400);
  if (days >= 1) return days === 1 ? "1 day ago" : `${days} days ago`;
  const hours = Math.floor(seconds / 3600);
  if (hours >= 1) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const mins = Math.floor(seconds / 60);
  if (mins >= 1) return mins === 1 ? "1 minute ago" : `${mins} minutes ago`;
  return "just now";
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = String(str ?? "");
  return div.innerHTML;
}

function renderStats() {
  const requestCount = cachedPrayers.length;
  const prayerCount = cachedPrayers.reduce((sum, p) => sum + Number(p.prayCount || 0), 0);

  ["home-request-count", "wall-request-count"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = requestCount.toLocaleString();
  });
  ["home-prayer-count", "wall-prayer-count"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = prayerCount.toLocaleString();
  });
}

function hasPrayed(id) {
  try {
    return localStorage.getItem(`emmaus-prayed-${id}`) === "true";
  } catch (_) {
    return false;
  }
}

function rememberPrayer(id) {
  try {
    localStorage.setItem(`emmaus-prayed-${id}`, "true");
  } catch (_) {}
}

function renderRecentPreview() {
  const el = document.getElementById("recent-preview");
  if (!el) return;

  const list = cachedPrayers.slice(0, 3);
  if (list.length === 0) {
    el.innerHTML = `
      <div class="empty-state empty-wide">
        <span class="empty-icon">♡</span>
        <strong>No requests yet.</strong>
        <span>Be the first person to place a prayer on the wall.</span>
        <a href="submit.html" class="text-link">Share a request →</a>
      </div>`;
    return;
  }

  el.innerHTML = list.map(cardHtml).join("");
  attachPrayButtons(el);
}

function renderWall(filter) {
  const el = document.getElementById("wall-grid");
  if (!el) return;

  currentWallFilter = filter || "All";
  let list = cachedPrayers;

  if (currentWallFilter !== "All") {
    list = list.filter((p) => p.category === currentWallFilter);
  }

  if (list.length === 0) {
    el.innerHTML = `
      <div class="empty-state empty-wide">
        <span class="empty-icon">♡</span>
        <strong>No requests in this category yet.</strong>
        <span>Be the first to share one.</span>
        <a href="submit.html" class="text-link">Place a prayer →</a>
      </div>`;
    return;
  }

  el.innerHTML = list.map(cardHtml).join("");
  attachPrayButtons(el);
}

function cardHtml(p) {
  const prayed = hasPrayed(p.id);
  const count = Number(p.prayCount || 0);

  return `
    <article class="prayer-card ${prayed ? "prayer-card-prayed" : ""}">
      <div class="prayer-card-top">
        <span class="tag">${escapeHtml(p.category || "Other")}</span>
        <span class="card-time">${escapeHtml(timeAgo(p.date))}</span>
      </div>
      <p class="prayer-text">${escapeHtml(p.text)}</p>
      <div class="prayer-card-bottom">
        <span class="prayer-author">${escapeHtml(p.name || "Anonymous")}</span>
        <button class="pray-btn ${prayed ? "is-prayed" : ""}" data-id="${escapeHtml(p.id)}" aria-pressed="${prayed}">
          <span class="pray-heart">♡</span>
          <span class="pray-label">${prayed ? "You're praying" : "I'm praying"}</span>
          <span class="pray-count">${count}</span>
        </button>
      </div>
    </article>
  `;
}

function attachPrayButtons(scope) {
  scope.querySelectorAll(".pray-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      if (!id || hasPrayed(id) || btn.disabled) return;

      btn.disabled = true;
      btn.classList.add("is-praying");
      const countEl = btn.querySelector(".pray-count");
      const labelEl = btn.querySelector(".pray-label");
      const current = Number(countEl?.textContent || 0);
      if (countEl) countEl.textContent = String(current + 1);
      if (labelEl) labelEl.textContent = "You're praying";

      db.collection("prayers").doc(id)
        .update({ prayCount: firebase.firestore.FieldValue.increment(1) })
        .then(() => {
          rememberPrayer(id);
          btn.classList.remove("is-praying");
          btn.classList.add("is-prayed");
          btn.setAttribute("aria-pressed", "true");
          renderStats();
        })
        .catch((err) => {
          console.error(err);
          btn.disabled = false;
          btn.classList.remove("is-praying");
          if (countEl) countEl.textContent = String(current);
          if (labelEl) labelEl.textContent = "I'm praying";
          alert("We couldn't record that prayer. Please check your connection and try again.");
        });
    });
  });
}

function initFilters() {
  const filterBar = document.getElementById("filter-bar");
  if (!filterBar) return;

  filterBar.addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-pill");
    if (!btn) return;

    filterBar.querySelectorAll(".filter-pill").forEach((pill) => {
      pill.setAttribute("aria-pressed", "false");
    });
    btn.setAttribute("aria-pressed", "true");
    renderWall(btn.dataset.category);
  });
}

function initRequestForm() {
  const form = document.getElementById("prayer-form");
  if (!form) return;

  const anonCheckbox = document.getElementById("anonymous");
  const nameField = document.getElementById("name-field");
  const request = document.getElementById("request");
  const requestCount = document.getElementById("request-count");
  const status = document.getElementById("prayer-form-status");

  if (anonCheckbox && nameField) {
    anonCheckbox.addEventListener("change", () => {
      nameField.hidden = anonCheckbox.checked;
      if (anonCheckbox.checked) document.getElementById("name").value = "";
    });
  }

  if (request && requestCount) {
    const updateCount = () => {
      requestCount.textContent = `${request.value.length} / 1000`;
    };
    request.addEventListener("input", updateCount);
    updateCount();
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (typeof db === "undefined") {
      status.textContent = "The prayer wall is unavailable right now. Please try again shortly.";
      status.className = "form-status error";
      return;
    }

    const name = anonCheckbox?.checked
      ? "Anonymous"
      : (document.getElementById("name").value.trim() || "Anonymous");
    const category = document.getElementById("category").value;
    const text = request.value.trim();

    if (text.length < 5) {
      status.textContent = "Please share a little more so others know what to pray for.";
      status.className = "form-status error";
      request.focus();
      return;
    }

    const submitBtn = form.querySelector("button[type='submit']");
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="spinner small"></span> Placing your prayer…`;
    status.textContent = "";

    db.collection("prayers")
      .add({
        name,
        category,
        text,
        date: Date.now(),
        prayCount: 0
      })
      .then(() => {
        form.closest(".form-card").querySelector("form").classList.add("hidden");
        document.getElementById("confirmation").classList.add("visible");
      })
      .catch((err) => {
        console.error(err);
        submitBtn.disabled = false;
        submitBtn.innerHTML = `Place my prayer <span>→</span>`;
        status.textContent = "We couldn't share your request. Please check your connection and try again.";
        status.className = "form-status error";
      });
  });
}

function initContactForm() {
  const form = document.getElementById("contact-form");
  if (!form) return;

  const status = document.getElementById("contact-status");
  const confirmation = document.getElementById("contact-confirmation");
  const config = window.EMMAUS_EMAILJS;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!config || !window.emailjs ||
        config.publicKey.startsWith("YOUR_") ||
        config.serviceId.startsWith("YOUR_") ||
        config.templateId.startsWith("YOUR_")) {
      status.textContent = "The contact form still needs its EmailJS settings. Please use the email address shown on this page for now.";
      status.className = "form-status error";
      return;
    }

    const button = form.querySelector("button[type='submit']");
    button.disabled = true;
    button.innerHTML = `<span class="spinner small"></span> Sending…`;
    status.textContent = "";

    try {
      emailjs.init({ publicKey: config.publicKey });
      await emailjs.sendForm(config.serviceId, config.templateId, form);
      form.classList.add("hidden");
      confirmation.classList.add("visible");
    } catch (err) {
      console.error("EmailJS error:", err);
      button.disabled = false;
      button.innerHTML = `Send message <span>→</span>`;
      status.textContent = "We couldn't send your message. Please try again or email us directly.";
      status.className = "form-status error";
    }
  });
}

function initAdmin() {
  const gate = document.getElementById("admin-gate");
  const panel = document.getElementById("admin-panel");
  if (!gate || !panel || typeof auth === "undefined") return;

  const loginForm = document.getElementById("admin-login-form");
  const errorMsg = document.getElementById("admin-error");
  const logoutBtn = document.getElementById("admin-logout");

  function showPanel() {
    gate.classList.add("hidden");
    panel.classList.remove("hidden");
    renderAdmin();
  }

  function showGate() {
    panel.classList.add("hidden");
    gate.classList.remove("hidden");
  }

  auth.onAuthStateChanged((user) => user ? showPanel() : showGate());

  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();
    errorMsg.textContent = "";
    const email = document.getElementById("admin-email").value.trim();
    const password = document.getElementById("admin-password").value;

    auth.signInWithEmailAndPassword(email, password).catch((err) => {
      console.error(err);
      errorMsg.textContent = "Sign-in failed. Check your email and password.";
    });
  });

  logoutBtn.addEventListener("click", () => auth.signOut());
}

function renderAdmin() {
  const el = document.getElementById("admin-list");
  if (!el || typeof auth === "undefined" || !auth.currentUser) return;

  if (cachedPrayers.length === 0) {
    el.innerHTML = `<div class="empty-state">No prayer requests stored yet.</div>`;
    return;
  }

  el.innerHTML = cachedPrayers.map(adminRowHtml).join("");

  el.querySelectorAll("[data-action='delete']").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!confirm("Delete this prayer request? This cannot be undone.")) return;
      db.collection("prayers").doc(btn.dataset.id).delete().catch((err) => {
        console.error(err);
        alert("Couldn't delete the request. Check your connection.");
      });
    });
  });

  el.querySelectorAll("[data-action='save']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const row = btn.closest(".admin-row");
      const id = btn.dataset.id;
      const name = row.querySelector("[data-field='name']").value.trim() || "Anonymous";
      const category = row.querySelector("[data-field='category']").value;
      const text = row.querySelector("[data-field='text']").value.trim();

      if (text.length < 5) {
        alert("The prayer request is too short.");
        return;
      }

      db.collection("prayers").doc(id).update({ name, category, text }).catch((err) => {
        console.error(err);
        alert("Couldn't save the changes. Check your connection.");
      });
    });
  });
}

function adminRowHtml(p) {
  const categories = ["Healing", "Family", "Guidance", "Grief", "Thanksgiving", "Other"];
  const options = categories.map((c) =>
    `<option value="${escapeHtml(c)}" ${c === p.category ? "selected" : ""}>${escapeHtml(c)}</option>`
  ).join("");

  return `
    <article class="admin-row" data-id="${escapeHtml(p.id)}">
      <div class="admin-row-top">
        <div><span class="tag">${escapeHtml(p.category || "Other")}</span><span class="admin-time">${escapeHtml(timeAgo(p.date))}</span></div>
        <span>🙏 ${Number(p.prayCount || 0)}</span>
      </div>
      <div class="admin-row-grid">
        <div class="field"><label>Name</label><input type="text" data-field="name" value="${escapeHtml(p.name || "Anonymous")}"></div>
        <div class="field"><label>Category</label><select data-field="category">${options}</select></div>
      </div>
      <div class="field"><label>Request</label><textarea data-field="text">${escapeHtml(p.text)}</textarea></div>
      <div class="admin-row-actions">
        <button class="btn btn-ghost" data-action="save" data-id="${escapeHtml(p.id)}">Save changes</button>
        <button class="btn btn-danger" data-action="delete" data-id="${escapeHtml(p.id)}">Delete</button>
      </div>
    </article>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  initNav();
  initFilters();
  initRequestForm();
  initContactForm();
  initAdmin();
  listenPrayers();
});
