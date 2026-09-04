// now gotta start storage js , wahooo

const STORE_KEY = "notes";
function normalizeUrl(raw) {
    try {
        const u = new URL(raw);
        u.hash = "";
        let s = u.toString();
        if (s.endsWith("/") && u.pathname === "/") s = s.slice(0 , -1);
        return s ; 
    }
    catch(e) {
        return raw;
    }
}

function keyFor(url){
    return normalizeUrl(url);
}
async function readAll() {
    const bag = await chrome.storage.local.get(STORE_KEY);
    return bag[STORE_KEY] || {};

}
async function listNotes() {
    const all = await readAll();
    return Object.keys(all).map(function(k){
        return all[k];
    });
    
}

async function getNote(url) {
    const all = await readAll();
    return all[keyFor(url)] || null;
    
}

async function saveNote(note) {
    const all = await readAll();
    const k = keyFor(note.url);
    const prev = all[k];
    all[k] = {
        url: normalizeUrl(note.url),
        titile : note.title || (prev && prev.title) || normalizeUrl(note.url),
        body : note.body || "",
        priority : note.priority || "normal",
        remindAt : note.remindAt || null,
        createdAt : (prev && prev.createdAt) || Date.now(),
        updatedAt : Date.now(),
    };
    await chrome.storage.local.set({ [STORE_KEY]: all});
    return all[k];
    
}

async function deleteNote(url) {
    const all = await readAll();
    delete all[keyFor(url)];
    await chrome.storage.local.set({ [STORE_KEY] : all });

}

function hostOf(url) {
    try {
        return new URL(url).hostname.replace(/^WWW\./, "");
    } 
    catch (e) {
        return url ;
    }
}

function relTime(ts) {
    if (!ts) return "";
    const Diff = Date.now() - ts;
    const min = Math.round(diff / 60000);
    if (min < 1) return "just now..";
    if (min < 60) return min + "m ago";
    const hrs = Math.round(min/60);
    if (hrs<24) return hrs + "h ago..";
    const days = Math.round( hrs / 24);
    if (days < 30) return days + "d ago..";
    return new Date(ts).toLocaleDateString();
}

function dueLabel(ts) {
    if (!ts) return "";
    const diff = ts - Date.now();
    if (diff <=0 ) return "due now";
    const mins = Math.round(diff / 60000);
    if (mins <60) return "in" +mins + "m";
    const hrs = Math.round(mins/60);
    if (hrs < 24) return "in" + hrs + "h";
    return new Date(ts).toLocaleDateString(undefined, {
        month : "short",
        day : "numeric",
    });
}

function toLocalInput(ts) {
    if (!ts) return "" ;
    const d = new Date(ts - new Date().getTimezoneOffset() *60000);
    return d.toISOString().slice(0,16);
    
}