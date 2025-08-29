import { supabase } from './supabaseClient.js';
import { analyticsEngine } from './analytics.js';
import { chartRenderer } from './charts.js';

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

    // Enhanced Analytics Section
    html += await renderEnhancedAnalytics(matches, players, bans);

    // Set the container content
    document.getElementById(containerId).innerHTML = html;

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

    // Initialize interactive elements
    initializeStatsInteractions();
}

/**
 * Render enhanced analytics section with charts and insights
 */
async function renderEnhancedAnalytics(matches, players, bans) {
    try {
        // Load finances data
        const { data: finances = [] } = await supabase.from('finances').select('*');
        const { data: sdsData = [] } = await supabase.from('spieler_des_spiels').select('*');

        // Calculate team statistics
        const teamStats = analyticsEngine.calculateTeamStats(matches, players, finances);
        const insights = analyticsEngine.generateInsights(null, teamStats);

        return `
        <!-- Enhanced Analytics Section -->
        <div class="mt-8 space-y-6">
            <div class="flex items-center justify-between">
                <h2 class="text-2xl font-bold text-gray-100 flex items-center">
                    <i class="fas fa-chart-line mr-3 text-blue-400"></i>
                    Erweiterte Analysen
                </h2>
                <div class="flex space-x-2">
                    <button onclick="exportAnalytics('json')" class="btn btn-secondary btn-sm">
                        <i class="fas fa-download mr-1"></i> JSON Export
                    </button>
                    <button onclick="exportAnalytics('csv')" class="btn btn-secondary btn-sm">
                        <i class="fas fa-file-csv mr-1"></i> CSV Export
                    </button>
                </div>
            </div>

            <!-- Team Performance Comparison -->
            <div class="bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-700">
                <h3 class="text-xl font-semibold text-gray-100 mb-4 flex items-center">
                    <i class="fas fa-balance-scale mr-2 text-green-400"></i>
                    Team-Vergleich
                </h3>
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                        <h4 class="text-lg font-medium text-gray-200 mb-3">Performance-Metriken</h4>
                        <div id="team-comparison-chart" class="bg-slate-900 rounded-lg p-4"></div>
                    </div>
                    <div>
                        <h4 class="text-lg font-medium text-gray-200 mb-3">Vergleichstabelle</h4>
                        ${renderTeamComparisonTable(teamStats)}
                    </div>
                </div>
            </div>

            <!-- Performance Trends -->
            <div class="bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-700">
                <h3 class="text-xl font-semibold text-gray-100 mb-4 flex items-center">
                    <i class="fas fa-chart-area mr-2 text-purple-400"></i>
                    Performance-Trends
                </h3>
                <div id="performance-trend-chart" class="bg-slate-900 rounded-lg p-4"></div>
            </div>

            <!-- Player Analytics -->
            <div class="bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-700">
                <h3 class="text-xl font-semibold text-gray-100 mb-4 flex items-center">
                    <i class="fas fa-user-chart mr-2 text-yellow-400"></i>
                    Spieler-Analysen
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    ${await renderTopPerformers(matches, players, sdsData)}
                </div>
            </div>

            <!-- Insights and Recommendations -->
            ${insights.length > 0 ? `
            <div class="bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-700">
                <h3 class="text-xl font-semibold text-gray-100 mb-4 flex items-center">
                    <i class="fas fa-lightbulb mr-2 text-orange-400"></i>
                    Erkenntnisse & Empfehlungen
                </h3>
                <div class="space-y-3">
                    ${insights.map(insight => `
                        <div class="p-4 rounded-lg border-l-4 ${getInsightClasses(insight.type)}">
                            <div class="flex items-start">
                                <div class="flex-shrink-0">
                                    <i class="fas ${getInsightIcon(insight.type)} text-lg"></i>
                                </div>
                                <div class="ml-3">
                                    <h4 class="font-medium">${insight.title}</h4>
                                    <p class="mt-1 text-sm opacity-90">${insight.message}</p>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}
        </div>
        `;
    } catch (error) {
        console.error('Error rendering enhanced analytics:', error);
        return `
        <div class="mt-8 bg-red-900/50 border border-red-700 rounded-lg p-4">
            <div class="flex items-center">
                <i class="fas fa-exclamation-triangle text-red-400 mr-2"></i>
                <span class="text-red-200">Fehler beim Laden der erweiterten Analysen: ${error.message}</span>
            </div>
        </div>
        `;
    }
}

/**
 * Render team comparison table
 */
function renderTeamComparisonTable(teamStats) {
    const comparison = teamStats.comparison;
    
    return `
    <div class="bg-slate-900 rounded-lg p-4 overflow-x-auto">
        <table class="w-full text-sm">
            <thead>
                <tr class="border-b border-slate-700">
                    <th class="text-left py-2 text-gray-300">Metrik</th>
                    <th class="text-center py-2 text-blue-400">AEK</th>
                    <th class="text-center py-2 text-red-400">Real</th>
                    <th class="text-center py-2 text-green-400">Führend</th>
                </tr>
            </thead>
            <tbody class="text-gray-300">
                <tr class="border-b border-slate-700/50">
                    <td class="py-2">Siegesrate</td>
                    <td class="text-center">${comparison.winRate.aek}%</td>
                    <td class="text-center">${comparison.winRate.real}%</td>
                    <td class="text-center">
                        <span class="px-2 py-1 rounded text-xs ${comparison.winRate.leader === 'AEK' ? 'bg-blue-600' : 'bg-red-600'} text-white">
                            ${comparison.winRate.leader}
                        </span>
                    </td>
                </tr>
                <tr class="border-b border-slate-700/50">
                    <td class="py-2">Tore</td>
                    <td class="text-center">${comparison.goals.aek}</td>
                    <td class="text-center">${comparison.goals.real}</td>
                    <td class="text-center">
                        <span class="px-2 py-1 rounded text-xs ${comparison.goals.leader === 'AEK' ? 'bg-blue-600' : 'bg-red-600'} text-white">
                            ${comparison.goals.leader}
                        </span>
                    </td>
                </tr>
                <tr class="border-b border-slate-700/50">
                    <td class="py-2">Defensive (weniger = besser)</td>
                    <td class="text-center">${comparison.defense.aek}</td>
                    <td class="text-center">${comparison.defense.real}</td>
                    <td class="text-center">
                        <span class="px-2 py-1 rounded text-xs ${comparison.defense.leader === 'AEK' ? 'bg-blue-600' : 'bg-red-600'} text-white">
                            ${comparison.defense.leader}
                        </span>
                    </td>
                </tr>
                <tr class="border-b border-slate-700/50">
                    <td class="py-2">Form</td>
                    <td class="text-center">${comparison.form.aek}%</td>
                    <td class="text-center">${comparison.form.real}%</td>
                    <td class="text-center">
                        <span class="px-2 py-1 rounded text-xs ${comparison.form.leader === 'AEK' ? 'bg-blue-600' : 'bg-red-600'} text-white">
                            ${comparison.form.leader}
                        </span>
                    </td>
                </tr>
                <tr>
                    <td class="py-2">Kader-Wert</td>
                    <td class="text-center">${(comparison.squadValue.aek / 1000000).toFixed(1)}M €</td>
                    <td class="text-center">${(comparison.squadValue.real / 1000000).toFixed(1)}M €</td>
                    <td class="text-center">
                        <span class="px-2 py-1 rounded text-xs ${comparison.squadValue.leader === 'AEK' ? 'bg-blue-600' : 'bg-red-600'} text-white">
                            ${comparison.squadValue.leader}
                        </span>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
    `;
}

/**
 * Render top performers section
 */
async function renderTopPerformers(matches, players, sdsData) {
    const topPlayers = [];
    
    // Calculate stats for all players
    for (const player of players) {
        const stats = analyticsEngine.calculatePlayerStats(player.id || player.name, matches, players, sdsData);
        if (stats) {
            topPlayers.push(stats);
        }
    }
    
    // Sort by performance rating
    topPlayers.sort((a, b) => b.performance - a.performance);
    
    return topPlayers.slice(0, 6).map(playerStats => `
        <div class="bg-slate-900 rounded-lg p-4 hover:bg-slate-700 transition-colors cursor-pointer" onclick="showPlayerDetails('${playerStats.player.id || playerStats.player.name}')">
            <div class="flex items-center justify-between mb-3">
                <h4 class="font-semibold text-gray-200">${playerStats.player.name}</h4>
                <span class="px-2 py-1 rounded text-xs ${playerStats.player.team === 'AEK' ? 'bg-blue-600' : 'bg-red-600'} text-white">
                    ${playerStats.player.team}
                </span>
            </div>
            <div class="space-y-2 text-sm text-gray-300">
                <div class="flex justify-between">
                    <span>Performance:</span>
                    <span class="font-medium">${playerStats.performance}/100</span>
                </div>
                <div class="flex justify-between">
                    <span>Spiele:</span>
                    <span>${playerStats.totalMatches}</span>
                </div>
                <div class="flex justify-between">
                    <span>Tore:</span>
                    <span>${playerStats.goals}</span>
                </div>
                <div class="flex justify-between">
                    <span>SdS:</span>
                    <span>${playerStats.motmCount}</span>
                </div>
                <div class="flex justify-between">
                    <span>Siegesrate:</span>
                    <span>${playerStats.winRate}%</span>
                </div>
            </div>
            <div class="mt-3">
                <div class="text-xs text-gray-400 mb-1">Form</div>
                <div class="w-full bg-slate-700 rounded-full h-2">
                    <div class="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-2 rounded-full" style="width: ${playerStats.form}%"></div>
                </div>
            </div>
        </div>
    `).join('');
}

/**
 * Get CSS classes for insights
 */
function getInsightClasses(type) {
    switch (type) {
        case 'success': return 'bg-green-900/50 border-green-400 text-green-100';
        case 'warning': return 'bg-yellow-900/50 border-yellow-400 text-yellow-100';
        case 'error': return 'bg-red-900/50 border-red-400 text-red-100';
        default: return 'bg-blue-900/50 border-blue-400 text-blue-100';
    }
}

/**
 * Get icon for insights
 */
function getInsightIcon(type) {
    switch (type) {
        case 'success': return 'fa-check-circle text-green-400';
        case 'warning': return 'fa-exclamation-triangle text-yellow-400';
        case 'error': return 'fa-times-circle text-red-400';
        default: return 'fa-info-circle text-blue-400';
    }
}

/**
 * Initialize interactive elements
 */
function initializeStatsInteractions() {
    setTimeout(async () => {
        try {
            // Load data for charts
            const { data: matches = [] } = await supabase.from('matches').select('*');
            const { data: players = [] } = await supabase.from('players').select('*');
            const { data: finances = [] } = await supabase.from('finances').select('*');

            // Calculate team stats
            const teamStats = analyticsEngine.calculateTeamStats(matches, players, finances);

            // Render team comparison chart
            const comparisonContainer = document.getElementById('team-comparison-chart');
            if (comparisonContainer) {
                chartRenderer.createTeamComparisonChart(
                    comparisonContainer,
                    teamStats.AEK,
                    teamStats.Real
                );
            }

            // Render performance trend chart
            const trendContainer = document.getElementById('performance-trend-chart');
            if (trendContainer) {
                const trendData = teamStats.trends.map((trend, index) => ({
                    value: trend.aekGoals + trend.realGoals,
                    label: `Spiel ${index + 1}`
                }));
                chartRenderer.createTrendChart(trendContainer, trendData, 'Tor-Trend der letzten 10 Spiele');
            }
        } catch (error) {
            console.error('Error initializing stats interactions:', error);
        }
    }, 500);
}

/**
 * Export analytics data
 */
window.exportAnalytics = function(format) {
    try {
        const data = analyticsEngine.exportAnalytics(format);
        const blob = new Blob([data], { 
            type: format === 'csv' ? 'text/csv' : 'application/json' 
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fifa-tracker-analytics.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        ErrorHandler.showSuccessMessage(`Analytics erfolgreich als ${format.toUpperCase()} exportiert!`);
    } catch (error) {
        console.error('Export error:', error);
        ErrorHandler.showUserError('Fehler beim Exportieren der Analytics-Daten', 'error');
    }
};

/**
 * Show detailed player analytics
 */
window.showPlayerDetails = async function(playerId) {
    try {
        const { data: matches = [] } = await supabase.from('matches').select('*');
        const { data: players = [] } = await supabase.from('players').select('*');
        const { data: sdsData = [] } = await supabase.from('spieler_des_spiels').select('*');

        const playerStats = analyticsEngine.calculatePlayerStats(playerId, matches, players, sdsData);
        
        if (!playerStats) {
            ErrorHandler.showUserError('Spieler-Statistiken konnten nicht geladen werden', 'warning');
            return;
        }

        const modalContent = `
        <div class="p-6">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-2xl font-bold text-gray-100 flex items-center">
                    <i class="fas fa-user-chart mr-3 text-blue-400"></i>
                    ${playerStats.player.name} - Detailanalyse
                </h3>
                <button onclick="hideModal()" class="text-gray-400 hover:text-gray-200 text-xl">×</button>
            </div>
            
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Performance Radar Chart -->
                <div class="bg-slate-800 rounded-lg p-4">
                    <h4 class="text-lg font-semibold text-gray-200 mb-4">Performance-Radar</h4>
                    <div id="player-radar-chart"></div>
                </div>
                
                <!-- Detailed Statistics -->
                <div class="bg-slate-800 rounded-lg p-4">
                    <h4 class="text-lg font-semibold text-gray-200 mb-4">Detaillierte Statistiken</h4>
                    <div class="space-y-3 text-sm">
                        <div class="flex justify-between py-2 border-b border-slate-700">
                            <span class="text-gray-300">Gesamtspiele:</span>
                            <span class="font-medium text-white">${playerStats.totalMatches}</span>
                        </div>
                        <div class="flex justify-between py-2 border-b border-slate-700">
                            <span class="text-gray-300">Tore gesamt:</span>
                            <span class="font-medium text-white">${playerStats.goals}</span>
                        </div>
                        <div class="flex justify-between py-2 border-b border-slate-700">
                            <span class="text-gray-300">Tore pro Spiel:</span>
                            <span class="font-medium text-white">${playerStats.goalsPerMatch}</span>
                        </div>
                        <div class="flex justify-between py-2 border-b border-slate-700">
                            <span class="text-gray-300">Assists:</span>
                            <span class="font-medium text-white">${playerStats.assists}</span>
                        </div>
                        <div class="flex justify-between py-2 border-b border-slate-700">
                            <span class="text-gray-300">Spieler d. Spiels:</span>
                            <span class="font-medium text-white">${playerStats.motmCount}</span>
                        </div>
                        <div class="flex justify-between py-2 border-b border-slate-700">
                            <span class="text-gray-300">Siege / Remis / Niederlagen:</span>
                            <span class="font-medium text-white">${playerStats.wins} / ${playerStats.draws} / ${playerStats.losses}</span>
                        </div>
                        <div class="flex justify-between py-2 border-b border-slate-700">
                            <span class="text-gray-300">Siegesrate:</span>
                            <span class="font-medium text-white">${playerStats.winRate}%</span>
                        </div>
                        <div class="flex justify-between py-2 border-b border-slate-700">
                            <span class="text-gray-300">Aktuelle Form:</span>
                            <span class="font-medium text-white">${playerStats.form}%</span>
                        </div>
                        <div class="flex justify-between py-2 border-b border-slate-700">
                            <span class="text-gray-300">Performance-Rating:</span>
                            <span class="font-medium text-white">${playerStats.performance}/100</span>
                        </div>
                        <div class="flex justify-between py-2">
                            <span class="text-gray-300">Aktuelle Serie:</span>
                            <span class="font-medium text-white">${playerStats.streaks.current} ${playerStats.streaks.type === 'wins' ? 'Siege' : playerStats.streaks.type === 'losses' ? 'Niederlagen' : 'Remis'}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Recent Matches -->
            <div class="mt-6 bg-slate-800 rounded-lg p-4">
                <h4 class="text-lg font-semibold text-gray-200 mb-4">Letzte Spiele</h4>
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="border-b border-slate-700 text-gray-300">
                                <th class="text-left py-2">Datum</th>
                                <th class="text-center py-2">Ergebnis</th>
                                <th class="text-center py-2">SdS</th>
                                <th class="text-center py-2">Resultat</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${playerStats.recentMatches.slice(0, 10).map(match => {
                                const isAek = playerStats.player.team === 'AEK';
                                const teamGoals = isAek ? match.aek_goals : match.real_goals;
                                const opponentGoals = isAek ? match.real_goals : match.aek_goals;
                                const result = teamGoals > opponentGoals ? 'W' : teamGoals === opponentGoals ? 'D' : 'L';
                                const resultClass = result === 'W' ? 'text-green-400' : result === 'D' ? 'text-yellow-400' : 'text-red-400';
                                const isMotm = match.manofthematch === playerStats.player.name;
                                
                                return `
                                <tr class="border-b border-slate-700/50 text-gray-300">
                                    <td class="py-2">${new Date(match.date).toLocaleDateString('de-DE')}</td>
                                    <td class="text-center">${teamGoals}:${opponentGoals}</td>
                                    <td class="text-center">${isMotm ? '⭐' : '-'}</td>
                                    <td class="text-center">
                                        <span class="font-bold ${resultClass}">${result}</span>
                                    </td>
                                </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        `;

        // Show modal
        const { showModal } = await import('./modal.js');
        showModal(modalContent, { size: 'xl' });

        // Render radar chart
        setTimeout(() => {
            const radarContainer = document.getElementById('player-radar-chart');
            if (radarContainer) {
                chartRenderer.createPlayerRadarChart(radarContainer, {
                    goals: playerStats.goals,
                    motm: playerStats.motmCount,
                    matches: playerStats.totalMatches,
                    winRate: parseFloat(playerStats.winRate),
                    value: playerStats.player.value || 0,
                    form: playerStats.form
                });
            }
        }, 100);

    } catch (error) {
        console.error('Error showing player details:', error);
        ErrorHandler.showUserError('Fehler beim Laden der Spieler-Details', 'error');
    }
};

// Export reset function for main.js
export function resetStatsState() {
    // Clear any module-specific state if needed
    analyticsEngine.clearCache();
}
export function resetStatsState() {}