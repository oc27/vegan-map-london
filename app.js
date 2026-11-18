const DATA_URL = "./data/venues.json";
const $ = (selector) => document.querySelector(selector);
let data, map, markers = new Map(), activeId = null;

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function instagramUrl(handle) { return `https://www.instagram.com/${encodeURIComponent(handle)}/`; }
function allEntries() {
  return [
    ...data.verified_venues.map(v => ({...v, listType:"mapped"})),
    ...data.suggestions.map(v => ({...v, listType:"account"}))
  ];
}
function visibleEntries() {
  const q = $("#search").value.trim().toLowerCase();
  const region = $("#region-filter").value;
  const status = $("#status-filter").value;
  return allEntries().filter(v => {
    if (status === "mapped" && v.listType !== "mapped") return false;
    if (status === "accounts" && v.listType !== "account") return false;
    if (region !== "all" && v.region !== region) return false;
    const haystack = [v.name, v.address, v.neighbourhood, v.instagram, v.region].filter(Boolean).join(" ").toLowerCase();
    return !q || haystack.includes(q);
  });
}
function syncMarkers(entries) {
  const visibleIds = new Set(entries.filter(v => v.listType === "mapped").map(v => v.id));
  markers.forEach((marker, id) => {
    if (visibleIds.has(id)) marker.addTo(map);
    else map.removeLayer(marker);
  });
}
function renderList() {
  const entries = visibleEntries();
  const mode = $("#status-filter").value;
  $("#list-title").textContent = mode === "mapped" ? "PLACES WITH MAP PINS" : mode === "accounts" ? "INSTAGRAM ACCOUNTS" : "ALL ENTRIES";
  $("#result-count").textContent = entries.length;
  const list = $("#venue-list");
  if (!entries.length) list.innerHTML = '<div class="empty">Nothing matches that search.</div>';
  else list.innerHTML = entries.map(v => {
    const isAccount = v.listType === "account";
    const name = v.name || `@${v.instagram}`;
    const sub = isAccount ? `${v.region} · Instagram account` : `${v.neighbourhood || v.region} · ${v.vegan_status}`;
    const links = isAccount
      ? `<a href="${instagramUrl(v.instagram)}" target="_blank" rel="noopener noreferrer">OPEN INSTAGRAM ↗</a>`
      : `<a href="${instagramUrl(v.instagram)}" target="_blank" rel="noopener noreferrer">INSTAGRAM ↗</a>${v.website ? `<a href="${escapeHtml(v.website)}" target="_blank" rel="noopener noreferrer">WEBSITE ↗</a>` : ""}`;
    return `<article class="venue-card ${activeId===v.id?"selected":""}" tabindex="0" data-id="${escapeHtml(v.id)}">
      <div class="card-top"><div><h3>${escapeHtml(name)}</h3><p>${escapeHtml(sub)}</p></div><span class="tag">${isAccount?"ACCOUNT":"MAPPED"}</span></div>
      ${!isAccount ? `<p class="card-address">${escapeHtml(v.address)}</p>` : ""}
      <div class="card-links">${links}</div>
    </article>`;
  }).join("");
  list.querySelectorAll(".venue-card").forEach(card => {
    const activate = () => selectEntry(card.dataset.id);
    card.addEventListener("click", e => { if (!e.target.closest("a")) activate(); });
    card.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activate(); }});
  });
  if (map) syncMarkers(entries);
}
function selectEntry(id) {
  activeId = id;
  const venue = data.verified_venues.find(v => v.id === id);
  if (venue && markers.has(id)) {
    const marker = markers.get(id);
    marker.addTo(map);
    map.setView(marker.getLatLng(), Math.max(map.getZoom(), 15), {animate:true});
    marker.openPopup();
  }
  renderList();
}
function makePopup(venue) {
  const sourceLinks = (venue.source_urls || []).map(url => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">source</a>`).join(" · ");
  return `<div class="popup-title">${escapeHtml(venue.name)}</div>
    <div>${escapeHtml(venue.address)}</div>
    <div class="popup-muted">${escapeHtml(venue.vegan_status)} · ${escapeHtml(venue.category)}</div>
    <p>${escapeHtml(venue.verification_note || "")}</p>
    <div><a href="${instagramUrl(venue.instagram)}" target="_blank" rel="noopener noreferrer">Instagram ↗</a>${venue.website ? ` · <a href="${escapeHtml(venue.website)}" target="_blank" rel="noopener noreferrer">Website ↗</a>` : ""}</div>
    <small>${sourceLinks}</small>
    <p class="popup-disclaimer">Guide only — please check details with the venue before visiting.</p>`;
}
function buildMarkers() {
  let located = 0;
  data.verified_venues.forEach(venue => {
    if (!Number.isFinite(venue.lat) || !Number.isFinite(venue.lng)) return;
    const marker = L.circleMarker([venue.lat, venue.lng], {
      radius:8, color:"#fff", weight:2, fillColor:"#111", fillOpacity:1
    });
    marker.bindPopup(makePopup(venue));
    marker.on("click", () => { activeId = venue.id; renderList(); });
    markers.set(venue.id, marker);
    located++;
  });
  if (located) {
    const group = L.featureGroup([...markers.values()]);
    group.addTo(map);
    map.fitBounds(group.getBounds().pad(0.18), {maxZoom:13});
    $("#map-status").textContent = `${located} MAP PINS`;
  } else {
    $("#map-status").textContent = "NO MAP COORDINATES AVAILABLE";
  }
}
async function init() {
  if (!window.L) throw new Error("Leaflet did not load. Check the map library connection.");
  const response = await fetch(DATA_URL, {cache:"no-cache"});
  if (!response.ok) throw new Error(`Could not load venue data (${response.status}). Check the data folder is deployed alongside index.html.`);
  data = await response.json();
  if (!Array.isArray(data.verified_venues) || !Array.isArray(data.suggestions)) throw new Error("Venue data has an unexpected format.");
  $("#verified-count").textContent = `${data.verified_venues.length} MAPPED`;
  $("#suggestion-count").textContent = `${data.suggestions.length} LISTED ACCOUNTS`;
  map = L.map("map", {scrollWheelZoom:false}).setView([51.5074,-0.1278], 11);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom:19, attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);
  buildMarkers();
  ["#search", "#region-filter", "#status-filter"].forEach(selector => {
    $(selector).addEventListener(selector === "#search" ? "input" : "change", renderList);
  });
  renderList();
  setTimeout(() => map.invalidateSize(), 100);
}
init().catch(err => {
  console.error("London Vegan Places failed to initialise:", err);
  const status = $("#map-status");
  if (status) status.textContent = "MAP COULD NOT LOAD — SEE ERROR DETAILS";
  const list = $("#venue-list");
  if (list) list.innerHTML = `<div class="empty">${escapeHtml(err.message)}. Try refreshing the page. If the problem continues, check the browser console.</div>`;
});
