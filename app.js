const DATA_URL = "./data/venues.json";
const $ = (selector) => document.querySelector(selector);
let data, map, markers = new Map(), activeId = null;
const geocodeCacheKey = "lvp-geocode-v1";

function escapeHtml(value="") {
  return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function instagramUrl(handle) { return `https://www.instagram.com/${encodeURIComponent(handle)}/`; }
function setCounts() {
  $("#verified-count").textContent = `${data.verified_venues.length} MAPPED`;
  $("#suggestion-count").textContent = `${data.suggestions.length} TO CHECK`;
}
function allEntries() {
  return [
    ...data.verified_venues.map(v => ({...v, listType:"mapped"})),
    ...data.suggestions.map(v => ({...v, listType:"pending"}))
  ];
}
function visibleEntries() {
  const q = $("#search").value.trim().toLowerCase();
  const region = $("#region-filter").value;
  const status = $("#status-filter").value;
  return allEntries().filter(v => {
    if (status === "mapped" && v.listType !== "mapped") return false;
    if (status === "pending" && v.listType !== "pending") return false;
    if (region !== "all" && v.region !== region) return false;
    const haystack = [v.name, v.address, v.neighbourhood, v.instagram, v.region].filter(Boolean).join(" ").toLowerCase();
    return !q || haystack.includes(q);
  });
}
function renderList() {
  const entries = visibleEntries();
  const pendingMode = $("#status-filter").value === "pending";
  $("#list-title").textContent = pendingMode ? "ACCOUNTS TO CHECK" : $("#status-filter").value === "all" ? "ALL ENTRIES" : "MAPPED PLACES";
  $("#result-count").textContent = entries.length;
  const list = $("#venue-list");
  if (!entries.length) {
    list.innerHTML = '<div class="empty">Nothing matches that search.</div>';
    return;
  }
  list.innerHTML = entries.map(v => {
    const isPending = v.listType === "pending";
    const name = v.name || `@${v.instagram}`;
    const sub = isPending ? `${v.region} · @${v.instagram}` : `${v.neighbourhood || v.region} · ${v.vegan_status}`;
    const links = isPending
      ? `<a href="${instagramUrl(v.instagram)}" target="_blank" rel="noopener noreferrer">OPEN INSTAGRAM ↗</a>`
      : `<a href="${instagramUrl(v.instagram)}" target="_blank" rel="noopener noreferrer">INSTAGRAM ↗</a>${v.website ? `<a href="${escapeHtml(v.website)}" target="_blank" rel="noopener noreferrer">WEBSITE ↗</a>` : ""}`;
    return `<article class="venue-card ${activeId===v.id?"selected":""}" tabindex="0" data-id="${escapeHtml(v.id)}">
      <div class="card-top"><div><h3>${escapeHtml(name)}</h3><p>${escapeHtml(sub)}</p></div><span class="tag">${isPending?"TO CHECK":"VERIFIED"}</span></div>
      ${!isPending ? `<p style="margin-top:7px">${escapeHtml(v.address)}</p>` : ""}
      <div class="card-links">${links}</div>
    </article>`;
  }).join("");
  list.querySelectorAll(".venue-card").forEach(card => {
    const activate = () => selectEntry(card.dataset.id);
    card.addEventListener("click", e => { if (!e.target.closest("a")) activate(); });
    card.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); activate(); }});
  });
}
function selectEntry(id) {
  activeId = id;
  const v = data.verified_venues.find(x => x.id === id);
  if (v && markers.has(id)) {
    const marker = markers.get(id);
    map.setView(marker.getLatLng(), Math.max(map.getZoom(), 15), {animate:true});
    marker.openPopup();
  }
  renderList();
}
function loadCache() {
  try { return JSON.parse(localStorage.getItem(geocodeCacheKey) || "{}"); } catch { return {}; }
}
function saveCache(cache) {
  try { localStorage.setItem(geocodeCacheKey, JSON.stringify(cache)); } catch {}
}
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function geocodeAddress(address, cache) {
  if (cache[address]) return cache[address];
  // Nominatim public service: sequential, throttled requests; cache successful lookups locally.
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&country=United%20Kingdom&q=${encodeURIComponent(address)}`;
  try {
    const response = await fetch(url, {headers: {"Accept":"application/json"}});
    if (!response.ok) throw new Error(`Geocoder returned ${response.status}`);
    const results = await response.json();
    if (results.length) {
      cache[address] = [Number(results[0].lat), Number(results[0].lon)];
      saveCache(cache);
      return cache[address];
    }
  } catch (err) {
    console.warn("Could not locate address:", address, err);
  }
  return null;
}
async function buildMarkers() {
  const cache = loadCache();
  let located = 0;
  for (const venue of data.verified_venues) {
    const coords = await geocodeAddress(venue.address, cache);
    if (coords) {
      const [lat, lon] = coords;
      const marker = L.circleMarker([lat, lon], {
        radius:7, color:"#fff", weight:2, fillColor:"#111", fillOpacity:1
      });
      const sourceLinks = (venue.source_urls || []).map(url => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">source</a>`).join(" · ");
      marker.bindPopup(`<div class="popup-title">${escapeHtml(venue.name)}</div><div>${escapeHtml(venue.address)}</div><div class="popup-muted">${escapeHtml(venue.vegan_status)} · ${escapeHtml(venue.category)}</div><p>${escapeHtml(venue.verification_note || "")}</p><div><a href="${instagramUrl(venue.instagram)}" target="_blank" rel="noopener noreferrer">Instagram ↗</a>${venue.website ? ` · <a href="${escapeHtml(venue.website)}" target="_blank" rel="noopener noreferrer">Website ↗</a>` : ""}</div><small>${sourceLinks}</small>`);
      marker.addTo(map);
      markers.set(venue.id, marker);
      marker.on("click", () => { activeId = venue.id; renderList(); });
      located++;
    }
    $("#map-status").textContent = `${located} / ${data.verified_venues.length} LOCATIONS FOUND`;
    await wait(1100);
  }
  if (located) {
    const group = L.featureGroup([...markers.values()]);
    map.fitBounds(group.getBounds().pad(0.16), {maxZoom:13});
  } else {
    $("#map-status").textContent = "ADDRESSES COULD NOT BE LOCATED";
  }
}
async function init() {
  const response = await fetch(DATA_URL);
  if (!response.ok) throw new Error("Could not load venue data");
  data = await response.json();
  setCounts();
  map = L.map("map", {scrollWheelZoom:false}).setView([51.5074,-0.1278], 11);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom:19, attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);
  $("#search").addEventListener("input", renderList);
  $("#region-filter").addEventListener("change", renderList);
  $("#status-filter").addEventListener("change", renderList);
  renderList();
  buildMarkers();
}
init().catch(err => {
  console.error(err);
  $("#map-status").textContent = "COULD NOT LOAD MAP DATA";
  $("#venue-list").innerHTML = '<div class="empty">The directory data could not be loaded. Check that the project files are in the repository root.</div>';
});
