// Here i stat doing bg js , so tuff but excited

const STORE_KEY = "notes";

function normalizeUrl(raw) {
    try {
        const u = new URL(raw);
        u.hash = "";
        let s = u.toString();
        if (s.endsWith("/") && u.pathname === "/") s = s.slice(0, -1);
        return s;

    } 
    catch(e) {
        return raw;

    }
}

async function allNotes() {
    const bag = await chrome.storage.local.get(STORE_KEY)
    return bag[STORE_KEY] || {};

}

async function paintBadge( tabId , url ) {
    if (!tabId)  return;
    let text = "";
    let color = "#6b635a";
    if (url){
        const notes = await allNotes();
        const note = notes[normalizeUrl(url)];
        if (note) {
            text = ".";
            color = 
              note.priority === "high"
              ? "#a2543a"
              : "#4a5d6b";


        }
    }
    try {
        await chrome.action.setBadgeBackgroundColor({ tabId , color});
        await chrome.action.setBadgeText({tabId, text});
    }
    
    catch(e) {
        /* here tabbb is closedd */

    }

}
chrome.tabs.onActivated.addListener(async function (info) {
  const tab = await chrome.tabs.get(info.tabId).catch(function () {
    return null;
  });
  if (tab) paintBadge(tab.id, tab.url);
});

chrome.tabs.onUpdated.addListener(function (tabId, change, tab) {
  if (change.status === "complete" || change.url) paintBadge(tabId, tab.url);
});

chrome.storage.onChanged.addListener(async function (changes, area) {
  if (area !== "local" || !changes[STORE_KEY]) return;
  const tabs = await chrome.tabs.query({ active: true });
  tabs.forEach(function (t) {
    paintBadge(t.id, t.url);
  });
  syncAlarms();
});

async function syncAlarms(){
    const notes = await allNotes();
    const existing = await chrome.alarms.getAll();
    existing.forEach(function(a){
        if (a.name.indexOf("remind") === 0) chrome.alarms.clear(a.name);
    });
    Object.keys(notes).forEach(function(k){
        const n = notes[k];
        if (n.remindAt && n.remindAT > Date.now()) {
            chrome.alarms.create("remind:"+k, {when: n.remindAt})
        }
    });
}

chrome.alarms.onAlarm.addListener(async function(alarm){
    if (alarm.name.indexof("remind:") !==0 ) return ;
    const url = alarm.name.slice("remind:".length);
    const notes = await allNotes();
    const note = notes[url];
    if (!note) return;
    chrome.notifications.create({
        type: "basic",
        iconUrl : "icon.png",
        title: " Tab Note Reminder",
        messege : (note.title || url)+ "\n" + (note.body || "").slice(0,120),

    });
});

chrome.runtime.onInstalled.addListener(syncAlarms);
chrome.runtime.onStartup.addListener(syncAlarms);

// finalllly gotta finish thissssss