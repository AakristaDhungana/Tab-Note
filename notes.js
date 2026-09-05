// gotta start tough one for dashboard 

const ui = {
  list: document.getElementById("list"),
  search: document.getElementById("search"),
  sort: document.getElementById("sort"),
  filters: document.getElementById("filters"),
  empty: document.getElementById("empty"),
  emptyTitle: document.getElementById("emptyTitle"),
  emptyBody: document.getElementById("emptyBody"),
  counts: document.getElementById("counts"),
};

let notes = [];
let filter = "all";
let editing = null;

const RANK = { high: 0, normal: 1, low: 2 };

function esc(s) {
  return String(s).replace(/[&<>"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
  });
}

function highlight(text, q) {
  const safe = esc(text);
  if (!q) return safe;
  const rx = new RegExp("(" + q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi");
  return safe.replace(rx, "<mark>$1</mark>");
}

function visible() {
  const q = ui.search.value.trim().toLowerCase();
  let out = notes.filter(function (n) {
    if (filter === "due" && !n.remindAt) return false;
    if (filter !== "all" && filter !== "due" && n.priority !== filter) return false;
    if (!q) return true;
    return (
      (n.title || "").toLowerCase().indexOf(q) > -1 ||
      (n.body || "").toLowerCase().indexOf(q) > -1 ||
      n.url.toLowerCase().indexOf(q) > -1
    );
  });
  const mode = ui.sort.value;
  out.sort(function (a, b) {
    if (mode === "created") return a.createdAt - b.createdAt;
    if (mode === "priority")
      return RANK[a.priority] - RANK[b.priority] || b.updatedAt - a.updatedAt;
    if (mode === "site") return hostOf(a.url).localeCompare(hostOf(b.url));
    return b.updatedAt - a.updatedAt;
  });
  return out;
}

function render() {
  const q = ui.search.value.trim();
  const rows = visible();

  const high = notes.filter(function (n) {
    return n.priority === "high";
  }).length;
  const due = notes.filter(function (n) {
    return n.remindAt;
  }).length;
  ui.counts.textContent =
    notes.length + " note" + (notes.length === 1 ? "" : "s") +
    " · " + high + " high · " + due + " with reminders";

  ui.list.innerHTML = "";
  rows.forEach(function (n) {
    const li = document.createElement("li");
    li.className = "item";
    li.innerHTML =
      '<div class="title"><a href="' + esc(n.url) + '" target="_blank" rel="noreferrer">' +
      highlight(n.title || n.url, q) + "</a></div>" +
      '<div class="actions">' +
      '<button class="quiet edit">Edit</button>' +
      '<button class="quiet del">Delete</button></div>' +
      '<p class="note">' + highlight(n.body, q) + "</p>" +
      '<div class="meta"><span class="tag" data-p="' + n.priority + '">' + n.priority +
      "</span><span>" + esc(hostOf(n.url)) + "</span><span>edited " +
      esc(relTime(n.updatedAt)) + "</span>" +
      (n.remindAt ? '<span class="due">reminder ' + esc(dueLabel(n.remindAt)) + "</span>" : "") +
      "</div>";

    li.querySelector(".del").addEventListener("click", async function () {
      await deleteNote(n.url);
      await load();
    });
    li.querySelector(".edit").addEventListener("click", function () {
      editing = editing === n.url ? null : n.url;
      render();
    });

    if (editing === n.url) li.appendChild(editorFor(n));
    ui.list.appendChild(li);
  });

  const nothing = rows.length === 0;
  ui.empty.hidden = !nothing;
  if (nothing) {
    if (notes.length === 0) {
      ui.emptyTitle.textContent = "No notes yet.";
      ui.emptyBody.textContent =
        "Open any page, click the Tab Note icon in your toolbar and write a line about why it matters. It will show up here.";
    } else {
      ui.emptyTitle.textContent = "Nothing matches that.";
      ui.emptyBody.textContent =
        "Try a shorter search or switch the priority filter back to All.";
    }
  }
}

function editorFor(n) {
  const box = document.createElement("div");
  box.className = "editor";
  box.innerHTML =
    '<textarea rows="4"></textarea>' +
    '<div class="erow">' +
    '<label><span class="eyebrow">Priority</span><select class="p">' +
    '<option value="low">Low</option><option value="normal">Normal</option>' +
    '<option value="high">High</option></select></label>' +
    '<label><span class="eyebrow">Reminder</span><input class="r" type="datetime-local" /></label>' +
    '<button class="primary ok">Save</button>' +
    '<button class="cancel">Cancel</button></div>';

  const ta = box.querySelector("textarea");
  const p = box.querySelector(".p");
  const r = box.querySelector(".r");
  ta.value = n.body;
  p.value = n.priority;
  r.value = toLocalInput(n.remindAt);

  box.querySelector(".ok").addEventListener("click", async function () {
    await saveNote({
      url: n.url,
      title: n.title,
      body: ta.value.trim(),
      priority: p.value,
      remindAt: r.value ? new Date(r.value).getTime() : null,
    });
    editing = null;
    await load();
  });
  box.querySelector(".cancel").addEventListener("click", function () {
    editing = null;
    render();
  });
  return box;
}

ui.filters.addEventListener("click", function (e) {
  const btn = e.target.closest(".f");
  if (!btn) return;
  filter = btn.dataset.p;
  ui.filters.querySelectorAll(".f").forEach(function (b) {
    b.classList.toggle("on", b === btn);
  });
  render();
});

ui.search.addEventListener("input", render);
ui.sort.addEventListener("change", render);

async function load() {
  notes = await listNotes();
  render();
}

load();
