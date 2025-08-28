import { supabase } from './supabaseClient.js';
import { ErrorHandler, CommonUtils, DateUtils } from './utils.js';
import { BaseModule } from './baseModule.js';

// Create stats module instance
const statsModule = new BaseModule('Stats');

export async function renderStatsTab(containerId = "app") {
    console.log("renderStatsTab aufgerufen!", { containerId });
    
    try {
        await statsModule.initialize(containerId);
        
        // Load data with enhanced error handling
        const statsData = await statsModule.loadData(async () => {
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
                throw new Error(`Fehler beim Laden der Statistiken: ${errorBans?.message || ''} ${errorMatches?.message || ''} ${errorPlayers?.message || ''}`);
            }
            
            return { bans, matches, players };
        });

        if (!statsData) {
            statsModule.container.innerHTML = statsModule.createEmptyState(
                'Keine Daten verfügbar',
                'Die Statistiken konnten nicht geladen werden.'
            );
            return;
        }

        const { bans, matches, players } = statsData;
        renderStatsContent(bans, matches, players);
        
    } catch (error) {
        ErrorHandler.handleDatabaseError(error, 'Stats laden');
        if (statsModule.container) {
            statsModule.container.innerHTML = statsModule.createEmptyState(
                'Fehler beim Laden',
                'Die Statistiken konnten nicht geladen werden. Bitte versuchen Sie es erneut.'
            );
        }
    }
}

function renderStatsContent(bans, matches, players) {
    // Calculate statistics
    const stats = calculateStatistics(bans, matches, players);
    
    // Generate enhanced HTML with new utility functions
    const statsCards = [
        {
            title: 'Gesamttore',
            value: stats.totalGoals,
            subtitle: `Ø ${stats.avgGoalsPerMatch} pro Spiel`,
            icon: 'fas fa-futbol',
            color: 'blue'
        },
        {
            title: 'Gelbe Karten',
            value: stats.totalGelb,
            subtitle: `Ø ${stats.avgCardsPerMatch} pro Spiel`,
            icon: 'fas fa-square',
            color: 'orange'
        },
        {
            title: 'Rote Karten',
            value: stats.totalRot,
            subtitle: 'Insgesamt',
            icon: 'fas fa-square',
            color: 'red'
        },
        {
            title: 'Spiele',
            value: stats.totalMatches,
            subtitle: 'Insgesamt gespielt',
            icon: 'fas fa-calendar',
            color: 'blue'
        }
    ];

    const statsCardsHtml = statsCards.map(card => CommonUtils.createStatsCard(card)).join('');
    
    const html = `
        <div class="mb-6">
            <div class="flex items-center gap-3 mb-6">
                <div class="text-4xl">📊</div>
                <h2 class="text-2xl font-bold text-gray-800">Statistiken</h2>
            </div>
            
            <!-- Statistics Cards Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                ${statsCardsHtml}
            </div>
            
            <!-- Detailed Statistics -->
            <div class="space-y-6">
                ${renderTeamComparison(stats)}
                ${renderHighestWins(stats)}
                ${renderBansStatistics(bans, players, stats)}
                ${renderPlayerStatistics(stats)}
            </div>
        </div>
    `;
    
    statsModule.container.innerHTML = html;
    setupEventHandlers(bans);
}

function calculateStatistics(bans, matches, players) {
    // Team filtered players
    const aekPlayers = players.filter(p => p.team === "AEK");
    const realPlayers = players.filter(p => p.team === "Real");

    // Basic match statistics
    const totalMatches = matches.length;
    const totalGoals = matches.reduce((sum, m) => sum + (m.goalsa || 0) + (m.goalsb || 0), 0);
    
    // Card statistics
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
    const avgCardsPerMatch = totalMatches ? ((gelbA + rotA + gelbB + rotB) / totalMatches).toFixed(2) : "0.00";

    // Team goals
    const totalToreAek = aekPlayers.reduce((sum, p) => sum + (p.goals || 0), 0);
    const totalToreReal = realPlayers.reduce((sum, p) => sum + (p.goals || 0), 0);

    // Top scorers
    const topScorerAek = getTopScorer(aekPlayers);
    const topScorerReal = getTopScorer(realPlayers);

    // Highest wins
    const aekBestWin = getHighestWin("AEK", matches);
    const realBestWin = getHighestWin("Real", matches);

    // Bans statistics
    const bansAek = bans.filter(b => b.team === "AEK");
    const bansReal = bans.filter(b => b.team === "Real");

    return {
        totalMatches, totalGoals, totalGelb, totalRot,
        avgGoalsPerMatch, avgCardsPerMatch,
        aekPlayers, realPlayers,
        totalToreAek, totalToreReal,
        topScorerAek, topScorerReal,
        aekBestWin, realBestWin,
        bansAek, bansReal,
        gelbA, rotA, gelbB, rotB
    };
}

function getTopScorer(playersArr) {
    if (!playersArr.length) return null;
    const top = playersArr.slice().sort((a, b) => (b.goals || 0) - (a.goals || 0))[0];
    return (top && top.goals > 0) ? { name: top.name, goals: top.goals } : null;
}

function getHighestWin(team, matches) {
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

function renderTeamComparison(stats) {
    return `
        <div class="modern-card">
            <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
                <i class="fas fa-users text-primary-green"></i>
                Team-Vergleich
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="text-center">
                    <div class="text-3xl font-bold text-blue-600">${stats.totalToreAek}</div>
                    <div class="text-sm text-gray-600 mb-2">AEK Athen Tore</div>
                    ${stats.topScorerAek ? `
                        <div class="text-xs text-blue-600">
                            👑 ${stats.topScorerAek.name} (${stats.topScorerAek.goals})
                        </div>
                    ` : ''}
                </div>
                <div class="text-center">
                    <div class="text-3xl font-bold text-red-600">${stats.totalToreReal}</div>
                    <div class="text-sm text-gray-600 mb-2">Real Madrid Tore</div>
                    ${stats.topScorerReal ? `
                        <div class="text-xs text-red-600">
                            👑 ${stats.topScorerReal.name} (${stats.topScorerReal.goals})
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

function renderHighestWins(stats) {
    return `
        <div class="modern-card">
            <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
                <i class="fas fa-trophy text-primary-green"></i>
                Höchste Siege
            </h3>
            <div class="space-y-3">
                <div class="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span class="font-medium text-blue-800">AEK Athen</span>
                    <span class="font-bold">
                        ${stats.aekBestWin ? `${stats.aekBestWin.goalsFor}:${stats.aekBestWin.goalsAgainst} (${DateUtils.formatDate(stats.aekBestWin.date)})` : '–'}
                    </span>
                </div>
                <div class="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <span class="font-medium text-red-800">Real Madrid</span>
                    <span class="font-bold">
                        ${stats.realBestWin ? `${stats.realBestWin.goalsFor}:${stats.realBestWin.goalsAgainst} (${DateUtils.formatDate(stats.realBestWin.date)})` : '–'}
                    </span>
                </div>
            </div>
        </div>
    `;
}

function renderBansStatistics(bans, players, stats) {
    const totalBansAek = stats.bansAek.length;
    const totalBansReal = stats.bansReal.length;
    
    const avgBanDurationAek = totalBansAek ? 
        (stats.bansAek.reduce((s, b) => s + (b.totalgames || b.matchesserved || 0), 0) / totalBansAek).toFixed(2) : "0.00";
    const avgBanDurationReal = totalBansReal ? 
        (stats.bansReal.reduce((s, b) => s + (b.totalgames || b.matchesserved || 0), 0) / totalBansReal).toFixed(2) : "0.00";

    return `
        <div class="modern-card">
            <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
                <i class="fas fa-ban text-primary-green"></i>
                Sperren-Statistiken
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="p-4 bg-blue-50 rounded-lg">
                    <div class="text-blue-800 font-semibold mb-2">AEK Athen</div>
                    <div class="space-y-1 text-sm">
                        <div>🔒 <span class="font-medium">${totalBansAek}</span> Sperren</div>
                        <div>⏱️ Ø <span class="font-medium">${avgBanDurationAek}</span> Spiele</div>
                    </div>
                </div>
                <div class="p-4 bg-red-50 rounded-lg">
                    <div class="text-red-800 font-semibold mb-2">Real Madrid</div>
                    <div class="space-y-1 text-sm">
                        <div>🔒 <span class="font-medium">${totalBansReal}</span> Sperren</div>
                        <div>⏱️ Ø <span class="font-medium">${avgBanDurationReal}</span> Spiele</div>
                    </div>
                </div>
            </div>
            ${bans.length > 0 ? `
                <div class="mt-4">
                    <button id="show-bans-table" class="btn btn-secondary btn-sm">
                        <i class="fas fa-table mr-2"></i>Alle Sperren anzeigen
                    </button>
                    <div id="bans-table-wrap" style="display:none;" class="mt-4">
                        ${createBansTable(bans, players)}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

function renderPlayerStatistics(stats) {
    return `
        <div class="modern-card">
            <h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
                <i class="fas fa-square text-primary-green"></i>
                Karten-Statistiken
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <div class="text-blue-800 font-semibold mb-3">AEK Athen</div>
                    <div class="space-y-2">
                        <div class="flex items-center gap-2">
                            <span class="w-4 h-4 bg-yellow-400 rounded"></span>
                            <span>Gelbe Karten: <strong>${stats.gelbA}</strong></span>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="w-4 h-4 bg-red-500 rounded"></span>
                            <span>Rote Karten: <strong>${stats.rotA}</strong></span>
                        </div>
                        <div class="text-xs text-gray-600 mt-2">
                            Ø ${(stats.gelbA / (stats.totalMatches || 1)).toFixed(2)} Gelb/Spiel, 
                            ${(stats.rotA / (stats.totalMatches || 1)).toFixed(2)} Rot/Spiel
                        </div>
                    </div>
                </div>
                <div>
                    <div class="text-red-800 font-semibold mb-3">Real Madrid</div>
                    <div class="space-y-2">
                        <div class="flex items-center gap-2">
                            <span class="w-4 h-4 bg-yellow-400 rounded"></span>
                            <span>Gelbe Karten: <strong>${stats.gelbB}</strong></span>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="w-4 h-4 bg-red-500 rounded"></span>
                            <span>Rote Karten: <strong>${stats.rotB}</strong></span>
                        </div>
                        <div class="text-xs text-gray-600 mt-2">
                            Ø ${(stats.gelbB / (stats.totalMatches || 1)).toFixed(2)} Gelb/Spiel, 
                            ${(stats.rotB / (stats.totalMatches || 1)).toFixed(2)} Rot/Spiel
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function createBansTable(bans, players) {
    const tableConfig = {
        headers: [
            { key: 'player_name', label: 'Spieler' },
            { key: 'team', label: 'Team' },
            { key: 'type', label: 'Typ' },
            { key: 'totalgames', label: 'Spiele' }
        ],
        data: bans.map(ban => {
            const player = players.find(p => p.id === ban.player_id);
            return {
                ...ban,
                player_name: player ? player.name : 'Unbekannt'
            };
        }),
        emptyMessage: 'Keine Sperren vorhanden'
    };
    
    return CommonUtils.createDataTable(tableConfig);
}

function setupEventHandlers(bans) {
    if (bans.length > 0) {
        const btn = document.getElementById("show-bans-table");
        const wrap = document.getElementById("bans-table-wrap");
        
        if (btn && wrap) {
            statsModule.addEventHandler(btn, 'click', () => {
                const isHidden = wrap.style.display === "none";
                wrap.style.display = isHidden ? "" : "none";
                btn.innerHTML = isHidden ? 
                    '<i class="fas fa-table mr-2"></i>Alle Sperren ausblenden' : 
                    '<i class="fas fa-table mr-2"></i>Alle Sperren anzeigen';
            });
        }
    }
}

export function resetStatsState() {
    statsModule.cleanup();
}