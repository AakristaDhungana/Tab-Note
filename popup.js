const el = {
  title: document.getElementById("pageTitle"),
  host: document.getElementById("pageHost"),
  body: document.getElementById("body"),
  priority: document.getElementById("priority"),
  remind: document.getElementById("remind"),
  save: document.getElementById("save"),
  del: document.getElementById("delete"),
  stamp: document.getElementById("stamp"),
  status: document.getElementById("status"),
  dash: document.getElementById("openDash"),
};

let tab = null;
let existing = null;

function say(msg) {
  el.status.textContent = msg;
  if (msg) setTimeout(function () {
    if (el.status.textContent === msg) el.status.textContent = "";
  }, 2600);
}

async function init() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  tab = tabs[0];
  if (!tab || !tab.url || !/^https?:/.test(tab.url)) {
    el.title.textContent = "No web page here";
    el.host.textContent = "Open a http(s) page to take a note.";
    el.body.disabled = el.priority.disabled = el.remind.disabled = true;
    el.save.disabled = true;
    return;
  }

  el.title.textContent = tab.title || tab.url;
  el.host.textContent = hostOf(tab.url);

  existing = await getNote(tab.url);
  if (existing) {
    el.body.value = existing.body;
    el.priority.value = existing.priority;
    el.remind.value = toLocalInput(existing.remindAt);
    el.del.hidden = false;
    el.stamp.hidden = false;
    el.stamp.textContent = "saved " + relTime(existing.updatedAt);
    el.save.textContent = "Update note";
  }
  el.body.focus();
}

el.save.addEventListener("click", async function () {
  if (!tab) return;
  if (!el.body.value.trim()) {
    say("Write something first — even one line.");
    el.body.focus();
    return;
  }
  await saveNote({
    url: tab.url,
    title: tab.title,
    body: el.body.value.trim(),
    priority: el.priority.value,
    remindAt: el.remind.value ? new Date(el.remind.value).getTime() : null,
  });
  say("Saved for " + hostOf(tab.url) + ".");
  el.del.hidden = false;
  el.save.textContent = "Update note";
  el.stamp.hidden = false;
  el.stamp.textContent = "saved just now";
});

el.del.addEventListener("click", async function () {
  if (!tab) return;
  await deleteNote(tab.url);
  el.body.value = "";
  el.priority.value = "normal";
  el.remind.value = "";
  el.del.hidden = true;
  el.stamp.hidden = true;
  el.save.textContent = "Save note";
  say("Note removed.");
});

document.querySelectorAll(".chip").forEach(function (btn) {
  btn.addEventListener("click", function () {
    const mins = Number(btn.dataset.in);
    el.remind.value = mins ? toLocalInput(Date.now() + mins * 60000) : "";
  });
});

el.body.addEventListener("keydown", function (e) {
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") el.save.click();
});

el.dash.addEventListener("click", function (e) {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

init();
