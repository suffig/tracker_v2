import { supabase } from './supabaseClient.js';

export async function renderStatsTab(containerId = "app") {
	console.log("renderStatsTab aufgerufen!", { containerId });
    // Lade Daten
    const [
        { data: bans = [], error: errorBans },
        { data: matches = [], error: errorMatches },
        { data: players = [], error: errorPlayers }
    ] = await Promise.all([
        supabase.from('bans').select('*'),
        supabase.from('matches').select('*'),
        supabase.from('players').select('*')
    ]);
    if (errorBans || errorMatches || errorPlayers) {
        document.getElementById(containerId).innerHTML =
            `<div class="text-red-700 dark:text-red-300 p-4">Fehler beim Laden der Statistiken: ${errorBans?.message || ''} ${errorMatches?.message || ''} ${errorPlayers?.message || ''}</div>`;
        return;
    }

    // Spielerlisten
    const aekPlayers = players.filter(p => p.team === "AEK");
    const realPlayers = players.filter(p => p.team === "Real");

    // Übersicht: Tore, Karten, etc.
    const totalMatches = matches.length;
    const totalGoals = matches.reduce((sum, m) => sum + (m.goalsa || 0) + (m.goalsb || 0), 0);
    let gelbA = 0, rotA = 0, gelbB = 0, rotB = 0;
    matches.forEach(m => {
        gelbA += m.yellowa || 0;
        rotA += m.reda || 0;
        gelbB += m.yellowb || 0;
        rotB += m.redb || 0;
    });
    const totalGelb = gelbA + gelbB;
    const totalRot = rotA + rotB;
    const avgGoalsPerMatch = totalMatches ? (totalGoals / totalMatches).toFixed(2) : "0.00";
    const avgCardsPerMatch = totalMatches ? ((gelbA+rotA+gelbB+rotB)/totalMatches).toFixed(2) : "0.00";

    // Höchster Sieg pro Team
    function getHighestWin(team) {
        let maxDiff = -1;
        let result = null;
        matches.forEach(m => {
            let diff = 0, goalsFor = 0, goalsAgainst = 0, date = m.date || "";
            if (team === "AEK") {
                diff = (m.goalsa || 0) - (m.goalsb || 0);
                goalsFor = m.goalsa || 0;
                goalsAgainst = m.goalsb || 0;
            } else {
                diff = (m.goalsb || 0) - (m.goalsa || 0);
                goalsFor = m.goalsb || 0;
                goalsAgainst = m.goalsa || 0;
            }
            if (diff > maxDiff) {
                maxDiff = diff;
                result = { goalsFor, goalsAgainst, date, diff };
            }
        });
        return (result && result.diff > 0) ? result : null;
    }
    const aekBestWin = getHighestWin("AEK");
    const realBestWin = getHighestWin("Real");

    // Sperren Stats
    const bansAek = bans.filter(b => b.team === "AEK");
    const bansReal = bans.filter(b => b.team === "Real");
    const totalBansAek = bansAek.length;
    const totalBansReal = bansReal.length;
    const avgBanDurationAek = totalBansAek ? (bansAek.reduce((s, b) => s + (b.totalgames || b.matchesserved || 0), 0) / totalBansAek).toFixed(2) : "0.00";
    const avgBanDurationReal = totalBansReal ? (bansReal.reduce((s, b) => s + (b.totalgames || b.matchesserved || 0), 0) / totalBansReal).toFixed(2) : "0.00";
    function getTopBannedPlayer(bansArr, teamPlayers) {
        const counter = {};
        bansArr.forEach(b => {
            if (!b.player_id) return;
            counter[b.player_id] = (counter[b.player_id] || 0) + 1;
        });
        const sorted = Object.entries(counter).sort((a, b) => b[1] - a[1]);
        if (sorted.length === 0) return "–";
        if (sorted.length === 1 || (sorted.length > 1 && sorted[0][1] > sorted[1][1])) {
            const p = teamPlayers.find(pl => pl.id === Number(sorted[0][0]));
            return p ? `${p.name} (${sorted[0][1]})` : "–";
        }
        return "mehrere";
    }
    const topBannedAek = getTopBannedPlayer(bansAek, aekPlayers);
    const topBannedReal = getTopBannedPlayer(bansReal, realPlayers);

    // Sperren-Tabelle
    const bansTableHtml = bans.length
        ? `
        <div class="mt-3" id="bans-table-wrap" style="display:none;">
            <b>Alle Sperren</b>
            <div style="overflow-x:auto;">
                <table class="w-full mt-2 text-xs border border-gray-600 rounded overflow-hidden bg-gray-800">
                    <thead>
                        <tr class="bg-gray-700">
                            <th class="p-1 text-left">Spieler</th>
                            <th class="p-1 text-left">Typ</th>
                            <th class="p-1 text-left">Spiele</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${bans.map(b => {
                            const p = players.find(pl => pl.id === b.player_id);
                            return `<tr>
                                <td class="p-1">${p ? p.name : "?"}</td>
                                <td class="p-1">${b.type || ""}</td>
                                <td class="p-1">${b.totalgames || ""}</td>
                            </tr>`;
                        }).join("")}
                    </tbody>
                </table>
            </div>
        </div>
        `
        : '';

    // Tore Stats
    const totalToreAek = aekPlayers.reduce((sum, p) => sum + (p.goals || 0), 0);
    const totalToreReal = realPlayers.reduce((sum, p) => sum + (p.goals || 0), 0);
    function getTopScorer(playersArr) {
        if (!playersArr.length) return null;
        const top = playersArr.slice().sort((a, b) => (b.goals || 0) - (a.goals || 0))[0];
        return (top && top.goals > 0) ? { name: top.name, goals: top.goals } : null;
    }
    const topScorerAek = getTopScorer(aekPlayers);
    const topScorerReal = getTopScorer(realPlayers);

    // Karten pro Spiel
    const avgGelbA = totalMatches ? (gelbA / totalMatches).toFixed(2) : "0.00";
    const avgRotA = totalMatches ? (rotA / totalMatches).toFixed(2) : "0.00";
    const avgGelbB = totalMatches ? (gelbB / totalMatches).toFixed(2) : "0.00";
    const avgRotB = totalMatches ? (rotB / totalMatches).toFixed(2) : "0.00";

    // Meiste Tore eines Spielers
    let maxGoalsSingle = 0, maxGoalsPlayer = null;
    matches.forEach(m => {
        if (m.goalslista) {
            m.goalslista.forEach(g => {
                if (g.count > maxGoalsSingle) {
                    maxGoalsSingle = g.count;
                    maxGoalsPlayer = aekPlayers.find(p => p.id === g.player_id) || { name: g.player };
                }
            });
        }
        if (m.goalslistb) {
            m.goalslistb.forEach(g => {
                if (g.count > maxGoalsSingle) {
                    maxGoalsSingle = g.count;
                    maxGoalsPlayer = realPlayers.find(p => p.id === g.player_id) || { name: g.player };
                }
            });
        }
    });

    // --- HTML ---
    const app = document.getElementById(containerId);
    app.innerHTML = `
        <div class="mb-4 flex items-center gap-2">
            <span class="text-3xl">📊</span>
            <h2 class="text-2xl font-bold">Statistiken</h2>
        </div>
        <div class="flex flex-col gap-6">

            <!-- Enhanced Übersicht with Visual Elements -->
            <div class="modern-card slide-up">
                <div class="font-bold text-lg mb-3 flex items-center gap-2">
                    <span class="text-3xl">📊</span>
                    <span>Übersicht</span>
                </div>
                
                <!-- Main Stats with Visual Progress -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div class="stat-card goals">
                        <div class="stat-icon">⚽</div>
                        <div class="stat-value">${totalGoals}</div>
                        <div class="stat-label">Tore gesamt</div>
                        <div class="stat-progress">
                            <div class="progress-bar" style="width: ${Math.min(100, (totalGoals / 20) * 100)}%"></div>
                        </div>
                    </div>
                    
                    <div class="stat-card warnings">
                        <div class="stat-icon">🟨</div>
                        <div class="stat-value">${totalGelb}</div>
                        <div class="stat-label">Gelbe Karten</div>
                        <div class="stat-progress warning">
                            <div class="progress-bar" style="width: ${Math.min(100, (totalGelb / 10) * 100)}%"></div>
                        </div>
                    </div>
                    
                    <div class="stat-card danger">
                        <div class="stat-icon">🟥</div>
                        <div class="stat-value">${totalRot}</div>
                        <div class="stat-label">Rote Karten</div>
                        <div class="stat-progress danger">
                            <div class="progress-bar" style="width: ${Math.min(100, (totalRot / 5) * 100)}%"></div>
                        </div>
                    </div>
                </div>
                
                <!-- Average Stats -->
                <div class="flex flex-wrap gap-4 text-base mt-4 p-3 bg-gray-700 rounded-lg">
                    <div class="stat-avg">
                        <span class="stat-avg-label">Ø Tore/Spiel:</span>
                        <span class="stat-avg-value">${avgGoalsPerMatch}</span>
                    </div>
                    <div class="stat-avg">
                        <span class="stat-avg-label">Ø Karten/Spiel:</span>
                        <span class="stat-avg-value">${avgCardsPerMatch}</span>
                    </div>
                </div>
                
                <!-- Team Best Wins -->
                <div class="team-wins mt-4">
                    <h4 class="font-semibold mb-2 text-gray-300">🏆 Beste Siege</h4>
                    <div class="flex flex-col gap-2">
                        <div class="team-win aek">
                            <span class="team-badge aek">AEK</span>
                            <span class="win-result">
                                ${aekBestWin ? `${aekBestWin.goalsFor}:${aekBestWin.goalsAgainst}` : '–'}
                            </span>
                            <span class="win-date">${aekBestWin ? `(${aekBestWin.date})` : ''}</span>
                        </div>
                        <div class="team-win real">
                            <span class="team-badge real">Real</span>
                            <span class="win-result">
                                ${realBestWin ? `${realBestWin.goalsFor}:${realBestWin.goalsAgainst}` : '–'}
                            </span>
                            <span class="win-date">${realBestWin ? `(${realBestWin.date})` : ''}</span>
                        </div>
                    </div>
                </div>
                
                ${maxGoalsSingle > 0 ? `
                <div class="highlight-stat mt-4 p-3 bg-gradient-to-r from-green-900/50 to-blue-900/50 rounded-lg border border-green-600/30">
                    <div class="flex items-center gap-2">
                        <span class="text-2xl">🎯</span>
                        <div>
                            <div class="font-semibold text-green-300">Rekord: ${maxGoalsSingle} Tore in einem Spiel</div>
                            <div class="text-sm text-gray-300">${maxGoalsPlayer?.name || "?"}</div>
                        </div>
                    </div>
                </div>
                ` : ""}
            </div>

            <!-- Sperren -->
            <div class="rounded-xl shadow border bg-gray-800 p-4 mb-2">
                <div class="flex items-center gap-2 font-bold text-lg mb-2">
                    <span class="text-xl">🚫</span>
                    <span>Sperren</span>
                </div>
                <div class="flex flex-col gap-3 text-base mb-1">
                    <div>
                        <div class="flex flex-wrap items-center gap-4">
                            <span class="inline-flex items-center bg-blue-100 text-blue-900 rounded px-3 py-1 font-bold text-base min-w-[80px]">AEK</span>
                            <span class="flex items-center gap-1"><span class="text-amber-600">🔒</span> <b>${totalBansAek}</b> Sperren</span>
                            <span class="flex items-center gap-1"><span>⏱️</span> Ø <b>${avgBanDurationAek}</b> Spiele</span>
                        </div>
                        <div class="pl-[90px] text-blue-900 text-sm italic mt-1">${topBannedAek !== "–" ? `Top: ${topBannedAek}` : ""}</div>
                    </div>
                    <div>
                        <div class="flex flex-wrap items-center gap-4 mt-2">
                            <span class="inline-flex items-center bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-200 rounded px-3 py-1 font-bold text-base min-w-[80px]">Real</span>
                            <span class="flex items-center gap-1"><span class="text-amber-600">🔒</span> <b>${totalBansReal}</b> Sperren</span>
                            <span class="flex items-center gap-1"><span>⏱️</span> Ø <b>${avgBanDurationReal}</b> Spiele</span>
                        </div>
                        <div class="pl-[90px] text-red-900 text-sm italic mt-1">${topBannedReal !== "–" ? `Top: ${topBannedReal}` : ""}</div>
                    </div>
                </div>
                ${bans.length ? `
                    <button id="show-bans-table" class="my-2 bg-gray-700 hover:bg-blue-200 transition text-blue-800 font-semibold py-2 px-4 rounded shadow-sm text-sm">
                        Alle Sperren anzeigen
                    </button>
                ` : ""}
                ${bansTableHtml}
            </div>

            <!-- Enhanced Goal Comparison -->
            <div class="modern-card slide-up">
                <div class="font-bold text-lg mb-4 flex items-center gap-2">
                    <span class="text-2xl">⚽</span>
                    <span>Torstatistiken</span>
                </div>
                
                <div class="goals-comparison">
                    <div class="team-goals-card aek">
                        <div class="team-goals-header">
                            <span class="team-badge-large aek">AEK</span>
                            <div class="goals-count">${totalToreAek}</div>
                        </div>
                        <div class="goals-bar-container">
                            <div class="goals-bar aek" style="width: ${totalToreAek || totalToreReal ? (totalToreAek / Math.max(totalToreAek, totalToreReal, 1)) * 100 : 50}%"></div>
                        </div>
                        <div class="top-scorer">
                            ${topScorerAek ? `
                                <div class="scorer-info">
                                    <span class="crown">👑</span>
                                    <span class="scorer-name">${topScorerAek.name}</span>
                                    <span class="scorer-goals">${topScorerAek.goals} ⚽</span>
                                </div>
                            ` : '<span class="no-scorer">Kein Torschütze</span>'}
                        </div>
                    </div>
                    
                    <div class="vs-divider">
                        <span class="vs-text">VS</span>
                    </div>
                    
                    <div class="team-goals-card real">
                        <div class="team-goals-header">
                            <span class="team-badge-large real">Real</span>
                            <div class="goals-count">${totalToreReal}</div>
                        </div>
                        <div class="goals-bar-container">
                            <div class="goals-bar real" style="width: ${totalToreAek || totalToreReal ? (totalToreReal / Math.max(totalToreAek, totalToreReal, 1)) * 100 : 50}%"></div>
                        </div>
                        <div class="top-scorer">
                            ${topScorerReal ? `
                                <div class="scorer-info">
                                    <span class="crown">👑</span>
                                    <span class="scorer-name">${topScorerReal.name}</span>
                                    <span class="scorer-goals">${topScorerReal.goals} ⚽</span>
                                </div>
                            ` : '<span class="no-scorer">Kein Torschütze</span>'}
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Karten (modern, mit schönen Badges & Durchschnitt) -->
            <div class="rounded-xl shadow border bg-gray-800 p-4 mb-2 flex flex-col gap-4">
                <div class="font-bold text-lg mb-2">Karten</div>
                <div class="flex flex-col sm:flex-row gap-4">
                    <div class="flex-1">
                        <div class="font-bold text-blue-900 text-base mb-1">AEK:</div>
                        <div class="flex gap-2 mb-2">
                            <span class="inline-flex items-center bg-yellow-100 text-yellow-900 rounded-full px-3 py-1 font-semibold shadow-sm border border-yellow-200">
                                <span class="mr-1">🟨</span>Gelb: <span class="ml-1">${gelbA}</span>
                            </span>
                            <span class="inline-flex items-center bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-full px-3 py-1 font-semibold shadow-sm border border-red-200 dark:border-red-600">
                                <span class="mr-1">🟥</span>Rot: <span class="ml-1">${rotA}</span>
                            </span>
                        </div>
                        <div class="flex gap-3 mt-1">
                            <span class="inline-flex items-center bg-yellow-50 text-yellow-900 rounded-full px-3 py-1 text-xs font-medium border border-yellow-100 shadow-sm">
                                Ø GK/Spiel: <b class="ml-1">${avgGelbA}</b>
                            </span>
                            <span class="inline-flex items-center bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-full px-3 py-1 text-xs font-medium border border-red-100 dark:border-red-600 shadow-sm">
                                Ø RK/Spiel: <b class="ml-1">${avgRotA}</b>
                            </span>
                        </div>
                    </div>
                    <div class="flex-1">
                        <div class="font-bold text-red-900 text-base mb-1">Real:</div>
                        <div class="flex gap-2 mb-2">
                            <span class="inline-flex items-center bg-yellow-100 text-yellow-900 rounded-full px-3 py-1 font-semibold shadow-sm border border-yellow-200">
                                <span class="mr-1">🟨</span>Gelb: <span class="ml-1">${gelbB}</span>
                            </span>
                            <span class="inline-flex items-center bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-full px-3 py-1 font-semibold shadow-sm border border-red-200 dark:border-red-600">
                                <span class="mr-1">🟥</span>Rot: <span class="ml-1">${rotB}</span>
                            </span>
                        </div>
                        <div class="flex gap-3 mt-1">
                            <span class="inline-flex items-center bg-yellow-50 text-yellow-900 rounded-full px-3 py-1 text-xs font-medium border border-yellow-100 shadow-sm">
                                Ø GK/Spiel: <b class="ml-1">${avgGelbB}</b>
                            </span>
                            <span class="inline-flex items-center bg-red-50 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-full px-3 py-1 text-xs font-medium border border-red-100 dark:border-red-600 shadow-sm">
                                Ø RK/Spiel: <b class="ml-1">${avgRotB}</b>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Button-Logik für die Sperren-Tabelle
    if (bans.length) {
        setTimeout(() => {
            const btn = document.getElementById("show-bans-table");
            const wrap = document.getElementById("bans-table-wrap");
            if (btn && wrap) {
                btn.onclick = () => {
                    wrap.style.display = wrap.style.display === "none" ? "" : "none";
                    btn.innerText = wrap.style.display === "none" ? "Alle Sperren anzeigen" : "Alle Sperren ausblenden";
                };
            }
        }, 0);
    }
}
export function resetStatsState() {}