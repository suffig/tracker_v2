import { POSITIONEN, savePlayer as dataSavePlayer, deletePlayer as dataDeletePlayer } from './data.js';
import { showModal, hideModal, showSuccessAndCloseModal } from './modal.js';
import { supabaseDb, supabase } from './supabaseClient.js';
import { isDatabaseAvailable } from './connectionMonitor.js';
import { ErrorHandler } from './utils.js';

let aekAthen = [];
let realMadrid = [];
let ehemalige = [];
let finances = {
    aekAthen: { balance: 0 },
    realMadrid: { balance: 0 }
};
let transactions = [];

const POSITION_ORDER = {
    "TH": 0, "IV": 1, "LV": 2, "RV": 3, "ZDM": 4, "ZM": 5,
    "ZOM": 6, "LM": 7, "RM": 8, "LF": 9, "RF": 10, "ST": 11
};

// --- ACCORDION Panel Zustand ---
let openPanel = null; // "aek", "real", "ehemalige" oder null

// --- Positions-Badge Klasse (für Redesign) ---
function getPositionBadgeClass(pos) {
    if (pos === "TH") return "position-badge badge-th";
    if (["IV", "LV", "RV", "ZDM"].includes(pos)) return "position-badge badge-def";
    if (["ZM", "ZOM", "LM", "RM"].includes(pos)) return "position-badge badge-mid";
    if (["LF", "RF", "ST"].includes(pos)) return "position-badge badge-att";
    return "position-badge bg-gray-700 text-gray-200 border-gray-600";
}

async function loadPlayersAndFinances(renderFn = renderPlayerLists) {
    try {
        const loadingDiv = document.createElement('div');
        loadingDiv.innerHTML = '<div class="text-center py-4"><i class="fas fa-spinner fa-spin"></i> Lade Daten...</div>';
        const appDiv = document.getElementById('app');
        if (appDiv) appDiv.appendChild(loadingDiv);

        const [playersResult, finResult, transResult] = await Promise.allSettled([
            supabaseDb.select('players', '*'),
            supabaseDb.select('finances', '*'),
            supabaseDb.select('transactions', '*', { 
                order: { column: 'id', ascending: false } 
            })
        ]);

        if (playersResult.status === 'fulfilled' && playersResult.value.data) {
            const players = playersResult.value.data;
            aekAthen = players.filter(p => p.team === "AEK");
            realMadrid = players.filter(p => p.team === "Real");
            ehemalige = players.filter(p => p.team === "Ehemalige");
        }
        if (finResult.status === 'fulfilled' && finResult.value.data) {
            const finData = finResult.value.data;
            finances = {
                aekAthen: finData.find(f => f.team === "AEK") || { balance: 0 },
                realMadrid: finData.find(f => f.team === "Real") || { balance: 0 }
            };
        }
        if (transResult.status === 'fulfilled' && transResult.value.data) {
            transactions = transResult.value.data;
        }

        if (loadingDiv.parentNode) {
            loadingDiv.parentNode.removeChild(loadingDiv);
        }

        renderFn();
    } catch (error) {
        console.error('Error loading data:', error);
        const errorDiv = document.createElement('div');
        errorDiv.innerHTML = `
            <div class="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-200 px-4 py-3 rounded mb-4">
                <strong>Fehler beim Laden der Daten.</strong> 
                ${isDatabaseAvailable() ? 'Bitte versuchen Sie es erneut.' : 'Keine Datenbankverbindung.'}
                <button onclick="this.parentElement.remove()" class="float-right font-bold text-red-700 dark:text-red-200 hover:text-red-900 dark:hover:text-red-100">×</button>
            </div>
        `;
        const appDiv = document.getElementById('app');
        if (appDiv) appDiv.insertBefore(errorDiv, appDiv.firstChild);
        renderFn();
    }
}

export function renderKaderTab(containerId = "app") {
    const app = document.getElementById(containerId);
    loadPlayersAndFinances(renderPlayerLists);

    app.innerHTML = `
        <div class="fade-in">
            <div class="page-header">
                <h1 class="page-title">Team Management</h1>
                <p class="page-subtitle">Verwalten Sie Ihre FIFA-Teams und Spieler</p>
            </div>
            
            <div class="space-y-6">
                ${accordionPanelHtml('AEK Athen', 'aek', 'from-blue-500 to-blue-600', 'AEK')}
                ${accordionPanelHtml('Real Madrid', 'real', 'from-red-500 to-red-600', 'Real')}
                ${accordionPanelHtml('Ehemalige Spieler', 'ehemalige', 'from-gray-500 to-gray-600', 'Ehemalige')}
            </div>
        </div>
    `;
    ['aek', 'real', 'ehemalige'].forEach(team => {
        document.getElementById(`panel-toggle-${team}`)?.addEventListener('click', () => {
            openPanel = openPanel === team ? null : team;
            renderKaderTab(containerId); // Neu rendern, damit Panel-Inhalt sichtbar wird
        });
    });
}

function accordionPanelHtml(team, key, gradientClass, teamKey) {
    const isOpen = openPanel === key;
    return `
        <div class="modern-card">
            <button id="panel-toggle-${key}" class="flex justify-between items-center w-full p-0 transition-all">
                <div class="flex items-center gap-4 p-4 flex-1">
                    <div class="w-12 h-12 bg-gradient-to-r ${gradientClass} rounded-lg flex items-center justify-center">
                        <i class="fas fa-users text-white text-lg"></i>
                    </div>
                    <div class="text-left">
                        <h3 class="font-semibold text-lg">${team}</h3>
                        <p class="text-sm text-gray-500">
                            ${teamKey !== 'Ehemalige' ? `Marktwert: <span id="${key}-marktwert">0M €</span>` : 'Ehemalige Spieler'}
                        </p>
                    </div>
                </div>
                <div class="p-4">
                    <i class="fas fa-chevron-${isOpen ? 'up' : 'down'} text-gray-400"></i>
                </div>
            </button>
            
            ${isOpen ? `
                <div id="panel-content-${key}" class="border-t border-gray-100 p-4 slide-up">
                    <button id="add-player-${key}" class="btn btn-primary w-full mb-4">
                        <i class="fas fa-plus"></i>
                        <span>Neuen Spieler hinzufügen</span>
                    </button>
                    <div id="team-${key}-players" class="grid gap-4 ${key === 'ehemalige' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : ''}"></div>
                </div>
            ` : ''}
        </div>
    `;
}

function renderPlayerLists() {
    // Always update market values in accordion headers, regardless of panel state
    const aekMwSpan = document.getElementById('aek-marktwert');
    if (aekMwSpan) aekMwSpan.innerText = getKaderMarktwert(aekAthen).toLocaleString('de-DE') + "M €";
    
    const realMwSpan = document.getElementById('real-marktwert');
    if (realMwSpan) realMwSpan.innerText = getKaderMarktwert(realMadrid).toLocaleString('de-DE') + "M €";

    // Only render player lists if panels are open
    if (openPanel === 'aek' && document.getElementById('team-aek-players')) {
        renderPlayerList('team-aek-players', aekAthen, "AEK");
    }
    if (openPanel === 'real' && document.getElementById('team-real-players')) {
        renderPlayerList('team-real-players', realMadrid, "Real");
    }
    if (openPanel === 'ehemalige' && document.getElementById('team-ehemalige-players')) {
        renderEhemaligeList('team-ehemalige-players');
    }
    // Add Player-Button Handler nur im offenen Panel
    if (openPanel === 'aek' && document.getElementById('add-player-aek')) document.getElementById('add-player-aek').onclick = () => openPlayerForm('AEK');
    if (openPanel === 'real' && document.getElementById('add-player-real')) document.getElementById('add-player-real').onclick = () => openPlayerForm('Real');
    if (openPanel === 'ehemalige' && document.getElementById('add-player-ehemalige')) document.getElementById('add-player-ehemalige').onclick = () => openPlayerForm('Ehemalige');
}

function renderPlayerList(containerId, arr, team) {
    const c = document.getElementById(containerId);
    if (!c) return;
    arr = arr.slice().sort((a, b) => {
        const posA = POSITION_ORDER[a.position] ?? 99;
        const posB = POSITION_ORDER[b.position] ?? 99;
        return posA - posB;
    });
    c.innerHTML = "";
    arr.forEach(player => {
        const marktwert = typeof player.value === 'number'
            ? player.value
            : (player.value ? parseFloat(player.value) : 0);

        const d = document.createElement("div");
        d.className = "modern-card";
        d.innerHTML = `
            <div class="card-header">
                <div class="flex items-center gap-3">
                    <span class="${getPositionBadgeClass(player.position)}">${player.position || 'N/A'}</span>
                    <h3 class="card-title">${player.name}</h3>
                </div>
                <div class="text-xl font-bold text-green-600">${marktwert}M €</div>
            </div>
            <div class="card-content">
                <p class="text-sm text-gray-500">Team: ${team === 'AEK' ? 'AEK Athen' : team === 'Real' ? 'Real Madrid' : 'Ehemalige'}</p>
                <p class="text-sm text-gray-500">Marktwert: ${marktwert}M €</p>
            </div>
            <div class="card-actions">
                <button class="btn btn-secondary btn-sm edit-btn">
                    <i class="fas fa-edit"></i>
                    <span>Bearbeiten</span>
                </button>
                <button class="btn btn-secondary btn-sm move-btn">
                    <i class="fas fa-arrow-right"></i>
                    <span>Zu Ehemalige</span>
                </button>
            </div>
        `;
        d.querySelector('.edit-btn').onclick = () => openPlayerForm(team, player.id);
        d.querySelector('.move-btn').onclick = () => movePlayerWithTransaction(player.id, "Ehemalige");
        c.appendChild(d);
    });
}


function renderEhemaligeList(containerId = "ehemalige-players") {
    const c = document.getElementById(containerId);
    if (!c) return;
    const sorted = ehemalige.slice().sort((a, b) => {
        const posA = POSITION_ORDER[a.position] ?? 99;
        const posB = POSITION_ORDER[b.position] ?? 99;
        return posA - posB;
    });
    c.innerHTML = "";
    sorted.forEach((player) => {
        const marktwert = typeof player.value === 'number'
            ? player.value
            : (player.value ? parseFloat(player.value) : 0);

        const d = document.createElement("div");
        d.className = "modern-card";
        d.innerHTML = `
            <div class="card-header">
                <div class="flex items-center gap-3">
                    <span class="${getPositionBadgeClass(player.position)}">${player.position || 'N/A'}</span>
                    <h3 class="card-title">${player.name}</h3>
                </div>
                <div class="text-xl font-bold text-gray-600">${marktwert ? marktwert + 'M €' : 'N/A'}</div>
            </div>
            <div class="card-content">
                <p class="text-sm text-gray-500">Status: Ehemaliger Spieler</p>
                <p class="text-sm text-gray-500">Marktwert: ${marktwert ? marktwert + 'M €' : 'Nicht bewertet'}</p>
            </div>
            <div class="card-actions">
                <button class="btn btn-secondary btn-sm edit-btn">
                    <i class="fas fa-edit"></i>
                    <span>Bearbeiten</span>
                </button>
                <button class="btn btn-danger btn-sm delete-btn">
                    <i class="fas fa-trash"></i>
                    <span>Löschen</span>
                </button>
                <button class="btn btn-primary btn-sm move-aek-btn" style="background: linear-gradient(135deg, var(--accent-blue), #60A5FA);">
                    <i class="fas fa-arrow-left"></i>
                    <span>Zu AEK</span>
                </button>
                <button class="btn btn-primary btn-sm move-real-btn" style="background: linear-gradient(135deg, var(--accent-red), #F87171);">
                    <i class="fas fa-arrow-right"></i>
                    <span>Zu Real</span>
                </button>
            </div>
        `;
        d.querySelector('.edit-btn').onclick = () => openPlayerForm('Ehemalige', player.id);
        d.querySelector('.delete-btn').onclick = () => deletePlayerDb(player.id);
        d.querySelector('.move-aek-btn').onclick = () => movePlayerWithTransaction(player.id, 'AEK');
        d.querySelector('.move-real-btn').onclick = () => movePlayerWithTransaction(player.id, 'Real');
        c.appendChild(d);
    });
}

function getKaderMarktwert(arr) {
    return arr.reduce((sum, p) => {
        let v = (typeof p.value === "number" ? p.value : (p.value ? parseFloat(p.value) : 0));
        return sum + v;
    }, 0);
}

async function savePlayer(player) {
    try {
        await dataSavePlayer(player);
    } catch (error) {
        ErrorHandler.showUserError(error.message, "error");
        throw error;
    }
}

async function deletePlayerDb(id) {
    try {
        await dataDeletePlayer(id);
    } catch (error) {
        ErrorHandler.showUserError(error.message, "error");
        throw error;
    }
}

async function movePlayerWithTransaction(id, newTeam) {
    let all = [...aekAthen, ...realMadrid, ...ehemalige];
    const player = all.find(p => p.id === id);
    if (!player) return;

    const oldTeam = player.team;
    const value = typeof player.value === "number" ? player.value : parseFloat(player.value) || 0;
    const abloese = value * 1000000;
    const now = new Date().toISOString().slice(0, 10);

    // Von TEAM zu Ehemalige: VERKAUF
    if ((oldTeam === "AEK" || oldTeam === "Real") && newTeam === "Ehemalige") {
        await supabase.from('transactions').insert([{
            date: now,
            type: "Spielerverkauf",
            team: oldTeam,
            amount: abloese,
            info: `Verkauf von ${player.name} (${player.position})`
        }]);
        let finKey = oldTeam === "AEK" ? "aekAthen" : "realMadrid";
        await supabase.from('finances').update({
            balance: (finances[finKey].balance || 0) + abloese
        }).eq('team', oldTeam);
        await movePlayerToTeam(id, newTeam);
        return;
    }

    // Von Ehemalige zu TEAM: KAUF
    if (oldTeam === "Ehemalige" && (newTeam === "AEK" || newTeam === "Real")) {
        let finKey = newTeam === "AEK" ? "aekAthen" : "realMadrid";
        const konto = finances[finKey].balance || 0;
        if (konto < abloese) {
            ErrorHandler.showUserError("Kontostand zu gering für diesen Transfer!", "warning");
            return;
        }
        await supabase.from('transactions').insert([{
            date: now,
            type: "Spielerkauf",
            team: newTeam,
            amount: -abloese,
            info: `Kauf von ${player.name} (${player.position})`
        }]);
        await supabase.from('finances').update({
            balance: konto - abloese
        }).eq('team', newTeam);
        await movePlayerToTeam(id, newTeam);
        return;
    }

    // Innerhalb Teams oder Ehemalige zu Ehemalige: Nur Move
    await movePlayerToTeam(id, newTeam);
}

async function movePlayerToTeam(id, newTeam) {
    const { error } = await supabase.from('players').update({ team: newTeam }).eq('id', id);
    if (error) ErrorHandler.showUserError(`Fehler beim Verschieben: ${error.message}`, "error");
}

async function saveTransactionAndFinance(team, type, amount, info = "") {
    const now = new Date().toISOString().slice(0, 10);
    await supabase.from('transactions').insert([{ date: now, type, team, amount, info }]);
    const finKey = team === "AEK" ? "aekAthen" : "realMadrid";
    let updateObj = {};
    updateObj.balance = (finances[finKey].balance || 0) + amount;
    await supabase.from('finances').update(updateObj).eq('team', team);
}

function openPlayerForm(team, id) {
    let player = null;
    let edit = false;
    if (id) {
        let all = [...aekAthen, ...realMadrid, ...ehemalige];
        player = all.find(p => p.id === id);
        if (player) edit = true;
    }
    showModal(`
        <form id="player-form" class="space-y-4 w-full">
            <div class="space-y-4">
                <input type="text" name="name" class="border border-slate-600 bg-slate-700 text-slate-100 rounded-lg p-3 w-full text-base placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:border-transparent" placeholder="Name" value="${player ? player.name : ""}" required>
                <select name="position" class="border border-slate-600 bg-slate-700 text-slate-100 rounded-lg p-3 w-full text-base focus:ring-2 focus:ring-sky-500 focus:border-transparent" required>
                    <option value="">Position wählen</option>
                    ${POSITIONEN.map(pos => `<option${player && player.position === pos ? " selected" : ""}>${pos}</option>`).join("")}
                </select>
                <input type="number" min="0" step="0.1" name="value" class="border border-slate-600 bg-slate-700 text-slate-100 rounded-lg p-3 w-full text-base placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:border-transparent" placeholder="Marktwert (M)" value="${player && player.value !== undefined ? player.value : ""}" required>
            </div>
            <div class="flex gap-3 pt-4">
                <button type="submit" class="bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white w-full px-4 py-3 rounded-lg text-base font-semibold transition-all duration-200 flex gap-2 items-center justify-center shadow-lg hover:shadow-xl active:scale-95">
                  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                  ${edit ? "Speichern" : "Anlegen"}
                </button>
                <button type="button" class="bg-slate-600 hover:bg-slate-700 text-slate-100 w-full px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 active:scale-95" onclick="window.hideModal()">Abbrechen</button>
            </div>
        </form>
    `);
    document.getElementById("player-form").onsubmit = (e) => submitPlayerForm(e, team, player ? player.id : null);
}

async function submitPlayerForm(event, team, id) {
    event.preventDefault();
    const form = event.target;
    const name = form.name.value;
    const position = form.position.value;
    const value = parseFloat(form.value.value);

    try {
        if (!id && (team === "AEK" || team === "Real")) {
            let fin = team === "AEK" ? finances.aekAthen : finances.realMadrid;
            if (fin.balance < value * 1000000) {
                ErrorHandler.showUserError("Kontostand zu gering für diesen Spielerkauf!", "warning");
                return;
            }
            try {
                await saveTransactionAndFinance(team, "Spielerkauf", -value * 1000000, `Kauf von ${name} (${position})`);
            } catch (error) {
                console.warn("Transaction save failed (demo mode):", error);
                // Continue with player save even if transaction fails in demo mode
            }
        }
        if (id) {
            await savePlayer({ id, name, position, value, team });
            showSuccessAndCloseModal(`Spieler ${name} erfolgreich aktualisiert`);
        } else {
            await savePlayer({ name, position, value, team });
            showSuccessAndCloseModal(`Spieler ${name} erfolgreich hinzugefügt`);
        }
    } catch (error) {
        console.error("Error submitting player form:", error);
        ErrorHandler.showUserError(`Fehler beim Speichern des Spielers: ${error.message}`, "error");
    }
}

export { deletePlayerDb };

export function resetKaderState() {
    aekAthen = [];
    realMadrid = [];
    ehemalige = [];
    finances = { aekAthen: { balance: 0 }, realMadrid: { balance: 0 } };
    transactions = [];
    openPanel = null;
}