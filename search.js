/**
 * Advanced Search and Filtering Module
 * Provides powerful search and filtering capabilities across all data
 */

class SearchAndFilter {
    constructor() {
        this.filters = new Map();
        this.searchHistory = [];
        this.maxHistoryItems = 20;
        this.debounceTimeout = null;
        this.debounceDelay = 300;
    }

    /**
     * Initialize search functionality
     */
    init() {
        this.loadSearchHistory();
        this.setupGlobalSearch();
    }

    /**
     * Setup global search functionality
     */
    setupGlobalSearch() {
        // Add global search shortcut (Ctrl/Cmd + K)
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.showGlobalSearchModal();
            }
        });
    }

    /**
     * Show global search modal
     */
    async showGlobalSearchModal() {
        const modalContent = `
        <div class="p-6">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl font-bold text-gray-100 flex items-center">
                    <i class="fas fa-search mr-3 text-blue-400"></i>
                    Globale Suche
                </h3>
                <button onclick="hideModal()" class="text-gray-400 hover:text-gray-200 text-xl">×</button>
            </div>
            
            <!-- Search Input -->
            <div class="relative mb-4">
                <input 
                    type="text" 
                    id="global-search-input"
                    placeholder="Suche nach Spielern, Teams, Matches..."
                    class="w-full px-4 py-3 pl-12 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autocomplete="off"
                >
                <i class="fas fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                <div id="search-loading" class="absolute right-4 top-1/2 transform -translate-y-1/2 hidden">
                    <i class="fas fa-spinner fa-spin text-blue-400"></i>
                </div>
            </div>

            <!-- Quick Filters -->
            <div class="mb-4">
                <div class="flex flex-wrap gap-2">
                    <button onclick="applyQuickFilter('players')" class="quick-filter-btn" data-filter="players">
                        <i class="fas fa-users mr-1"></i> Spieler
                    </button>
                    <button onclick="applyQuickFilter('matches')" class="quick-filter-btn" data-filter="matches">
                        <i class="fas fa-futbol mr-1"></i> Spiele
                    </button>
                    <button onclick="applyQuickFilter('aek')" class="quick-filter-btn" data-filter="aek">
                        <i class="fas fa-shield-alt mr-1"></i> AEK
                    </button>
                    <button onclick="applyQuickFilter('real')" class="quick-filter-btn" data-filter="real">
                        <i class="fas fa-crown mr-1"></i> Real
                    </button>
                    <button onclick="applyQuickFilter('goals')" class="quick-filter-btn" data-filter="goals">
                        <i class="fas fa-crosshairs mr-1"></i> Tore
                    </button>
                    <button onclick="clearFilters()" class="quick-filter-btn bg-red-600 hover:bg-red-700">
                        <i class="fas fa-times mr-1"></i> Filter zurücksetzen
                    </button>
                </div>
            </div>

            <!-- Search Results -->
            <div id="search-results" class="max-h-96 overflow-y-auto">
                <div class="text-center text-gray-400 py-8">
                    <i class="fas fa-search text-3xl mb-2"></i>
                    <p>Beginnen Sie mit der Eingabe, um zu suchen...</p>
                </div>
            </div>

            <!-- Search History -->
            <div id="search-history" class="mt-4">
                ${this.renderSearchHistory()}
            </div>
        </div>
        `;

        // Import and show modal
        const { showModal } = await import('./modal.js');
        showModal(modalContent, { size: 'lg' });

        // Setup search functionality
        setTimeout(() => {
            this.setupSearchInput();
        }, 100);
    }

    /**
     * Setup search input functionality
     */
    setupSearchInput() {
        const searchInput = document.getElementById('global-search-input');
        if (!searchInput) return;

        searchInput.focus();

        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            
            // Clear previous timeout
            if (this.debounceTimeout) {
                clearTimeout(this.debounceTimeout);
            }

            // Show loading indicator
            const loading = document.getElementById('search-loading');
            if (loading) {
                loading.classList.remove('hidden');
            }

            // Debounce search
            this.debounceTimeout = setTimeout(async () => {
                await this.performSearch(query);
                if (loading) {
                    loading.classList.add('hidden');
                }
            }, this.debounceDelay);
        });

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = e.target.value.trim();
                if (query) {
                    this.addToSearchHistory(query);
                    this.performSearch(query);
                }
            }
        });
    }

    /**
     * Perform search across all data
     */
    async performSearch(query) {
        if (!query || query.length < 2) {
            document.getElementById('search-results').innerHTML = `
                <div class="text-center text-gray-400 py-8">
                    <i class="fas fa-search text-3xl mb-2"></i>
                    <p>Mindestens 2 Zeichen eingeben...</p>
                </div>
            `;
            return;
        }

        try {
            // Load data
            const { supabase } = await import('./supabaseClient.js');
            const [playersResult, matchesResult, bansResult] = await Promise.all([
                supabase.from('players').select('*'),
                supabase.from('matches').select('*'),
                supabase.from('bans').select('*')
            ]);

            const players = playersResult.data || [];
            const matches = matchesResult.data || [];
            const bans = bansResult.data || [];

            // Search across all data
            const results = this.searchAcrossData(query, { players, matches, bans });
            
            // Render results
            this.renderSearchResults(results);

        } catch (error) {
            console.error('Search error:', error);
            document.getElementById('search-results').innerHTML = `
                <div class="text-center text-red-400 py-8">
                    <i class="fas fa-exclamation-triangle text-3xl mb-2"></i>
                    <p>Fehler bei der Suche: ${error.message}</p>
                </div>
            `;
        }
    }

    /**
     * Search across all data types
     */
    searchAcrossData(query, data) {
        const lowerQuery = query.toLowerCase();
        const results = {
            players: [],
            matches: [],
            bans: [],
            total: 0
        };

        // Search players
        results.players = data.players.filter(player => {
            return (
                player.name?.toLowerCase().includes(lowerQuery) ||
                player.team?.toLowerCase().includes(lowerQuery) ||
                player.position?.toLowerCase().includes(lowerQuery)
            );
        }).map(player => ({
            ...player,
            type: 'player',
            relevance: this.calculateRelevance(query, player.name)
        }));

        // Search matches
        results.matches = data.matches.filter(match => {
            const searchText = `${match.date} ${match.aek_players?.join(' ')} ${match.real_players?.join(' ')} ${match.manofthematch || ''}`.toLowerCase();
            return searchText.includes(lowerQuery);
        }).map(match => ({
            ...match,
            type: 'match',
            relevance: this.calculateRelevance(query, `${match.date} ${match.manofthematch || ''}`)
        }));

        // Search bans
        results.bans = data.bans.filter(ban => {
            const playerName = data.players.find(p => p.id === ban.player_id)?.name || '';
            return (
                playerName.toLowerCase().includes(lowerQuery) ||
                ban.team?.toLowerCase().includes(lowerQuery) ||
                ban.type?.toLowerCase().includes(lowerQuery) ||
                ban.reason?.toLowerCase().includes(lowerQuery)
            );
        }).map(ban => ({
            ...ban,
            type: 'ban',
            playerName: data.players.find(p => p.id === ban.player_id)?.name || 'Unbekannt',
            relevance: this.calculateRelevance(query, ban.reason || '')
        }));

        results.total = results.players.length + results.matches.length + results.bans.length;

        // Sort by relevance
        ['players', 'matches', 'bans'].forEach(type => {
            results[type].sort((a, b) => b.relevance - a.relevance);
        });

        return results;
    }

    /**
     * Calculate search relevance score
     */
    calculateRelevance(query, text) {
        if (!text) return 0;
        
        const lowerQuery = query.toLowerCase();
        const lowerText = text.toLowerCase();
        
        let score = 0;
        
        // Exact match gets highest score
        if (lowerText === lowerQuery) {
            score += 100;
        }
        
        // Starts with query gets high score
        if (lowerText.startsWith(lowerQuery)) {
            score += 50;
        }
        
        // Contains query gets medium score
        if (lowerText.includes(lowerQuery)) {
            score += 25;
        }
        
        // Word boundary match gets bonus
        const wordRegex = new RegExp(`\\b${lowerQuery}`, 'i');
        if (wordRegex.test(text)) {
            score += 15;
        }
        
        return score;
    }

    /**
     * Render search results
     */
    renderSearchResults(results) {
        const container = document.getElementById('search-results');
        if (!container) return;

        if (results.total === 0) {
            container.innerHTML = `
                <div class="text-center text-gray-400 py-8">
                    <i class="fas fa-search-minus text-3xl mb-2"></i>
                    <p>Keine Ergebnisse gefunden</p>
                </div>
            `;
            return;
        }

        let html = `
            <div class="mb-4 text-sm text-gray-400">
                ${results.total} Ergebnisse gefunden
            </div>
        `;

        // Render players
        if (results.players.length > 0) {
            html += `
                <div class="mb-6">
                    <h4 class="text-lg font-semibold text-gray-200 mb-3 flex items-center">
                        <i class="fas fa-users mr-2 text-blue-400"></i>
                        Spieler (${results.players.length})
                    </h4>
                    <div class="space-y-2">
                        ${results.players.slice(0, 5).map(player => `
                            <div class="p-3 bg-slate-800 rounded-lg hover:bg-slate-700 cursor-pointer transition-colors" onclick="navigateToPlayer('${player.id}')">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <div class="font-medium text-white">${player.name}</div>
                                        <div class="text-sm text-gray-400">${player.position} • ${player.team}</div>
                                    </div>
                                    <div class="text-right">
                                        <div class="text-sm font-medium text-green-400">${player.value || 0}M €</div>
                                        <div class="text-xs text-gray-400">Marktwert</div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                        ${results.players.length > 5 ? `
                            <div class="text-center">
                                <button onclick="showAllResults('players')" class="text-blue-400 hover:text-blue-300 text-sm">
                                    ${results.players.length - 5} weitere Spieler anzeigen...
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }

        // Render matches
        if (results.matches.length > 0) {
            html += `
                <div class="mb-6">
                    <h4 class="text-lg font-semibold text-gray-200 mb-3 flex items-center">
                        <i class="fas fa-futbol mr-2 text-green-400"></i>
                        Spiele (${results.matches.length})
                    </h4>
                    <div class="space-y-2">
                        ${results.matches.slice(0, 3).map(match => `
                            <div class="p-3 bg-slate-800 rounded-lg hover:bg-slate-700 cursor-pointer transition-colors" onclick="navigateToMatch('${match.id}')">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <div class="font-medium text-white">
                                            AEK ${match.aek_goals || 0} : ${match.real_goals || 0} Real
                                        </div>
                                        <div class="text-sm text-gray-400">
                                            ${new Date(match.date).toLocaleDateString('de-DE')}
                                            ${match.manofthematch ? ` • SdS: ${match.manofthematch}` : ''}
                                        </div>
                                    </div>
                                    <div class="text-right">
                                        <i class="fas fa-external-link-alt text-gray-400"></i>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                        ${results.matches.length > 3 ? `
                            <div class="text-center">
                                <button onclick="showAllResults('matches')" class="text-blue-400 hover:text-blue-300 text-sm">
                                    ${results.matches.length - 3} weitere Spiele anzeigen...
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }

        // Render bans
        if (results.bans.length > 0) {
            html += `
                <div class="mb-6">
                    <h4 class="text-lg font-semibold text-gray-200 mb-3 flex items-center">
                        <i class="fas fa-ban mr-2 text-red-400"></i>
                        Sperren (${results.bans.length})
                    </h4>
                    <div class="space-y-2">
                        ${results.bans.slice(0, 3).map(ban => `
                            <div class="p-3 bg-slate-800 rounded-lg">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <div class="font-medium text-white">${ban.playerName}</div>
                                        <div class="text-sm text-gray-400">${ban.type} • ${ban.team}</div>
                                        ${ban.reason ? `<div class="text-xs text-gray-500 mt-1">${ban.reason}</div>` : ''}
                                    </div>
                                    <div class="text-right">
                                        <div class="text-sm font-medium text-red-400">${ban.totalgames || 0} Spiele</div>
                                        <div class="text-xs text-gray-400">Gesamt</div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;
    }

    /**
     * Apply quick filter
     */
    applyQuickFilter(filterType) {
        const buttons = document.querySelectorAll('.quick-filter-btn');
        buttons.forEach(btn => {
            btn.classList.remove('bg-blue-600', 'ring-2', 'ring-blue-400');
            btn.classList.add('bg-slate-700', 'hover:bg-slate-600');
        });

        const activeButton = document.querySelector(`[data-filter="${filterType}"]`);
        if (activeButton) {
            activeButton.classList.remove('bg-slate-700', 'hover:bg-slate-600');
            activeButton.classList.add('bg-blue-600', 'ring-2', 'ring-blue-400');
        }

        // Apply filter logic
        this.filters.set('quickFilter', filterType);
        
        // Refresh search if there's a query
        const searchInput = document.getElementById('global-search-input');
        if (searchInput && searchInput.value.trim()) {
            this.performSearch(searchInput.value.trim());
        }
    }

    /**
     * Clear all filters
     */
    clearFilters() {
        this.filters.clear();
        
        const buttons = document.querySelectorAll('.quick-filter-btn:not(.bg-red-600)');
        buttons.forEach(btn => {
            btn.classList.remove('bg-blue-600', 'ring-2', 'ring-blue-400');
            btn.classList.add('bg-slate-700', 'hover:bg-slate-600');
        });

        // Refresh search
        const searchInput = document.getElementById('global-search-input');
        if (searchInput && searchInput.value.trim()) {
            this.performSearch(searchInput.value.trim());
        }
    }

    /**
     * Add search to history
     */
    addToSearchHistory(query) {
        // Remove if already exists
        this.searchHistory = this.searchHistory.filter(item => item.query !== query);
        
        // Add to beginning
        this.searchHistory.unshift({
            query,
            timestamp: new Date().toISOString()
        });

        // Limit history size
        if (this.searchHistory.length > this.maxHistoryItems) {
            this.searchHistory = this.searchHistory.slice(0, this.maxHistoryItems);
        }

        this.saveSearchHistory();
    }

    /**
     * Render search history
     */
    renderSearchHistory() {
        if (this.searchHistory.length === 0) {
            return `
                <div class="border-t border-slate-600 pt-4">
                    <h4 class="text-sm font-medium text-gray-400 mb-2">Suchverlauf</h4>
                    <div class="text-sm text-gray-500">Keine bisherigen Suchen</div>
                </div>
            `;
        }

        return `
            <div class="border-t border-slate-600 pt-4">
                <div class="flex justify-between items-center mb-2">
                    <h4 class="text-sm font-medium text-gray-400">Suchverlauf</h4>
                    <button onclick="clearSearchHistory()" class="text-xs text-red-400 hover:text-red-300">
                        Verlauf löschen
                    </button>
                </div>
                <div class="flex flex-wrap gap-1">
                    ${this.searchHistory.slice(0, 8).map(item => `
                        <button 
                            onclick="searchFromHistory('${item.query}')"
                            class="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-gray-300 rounded transition-colors"
                            title="Suche: ${item.query}"
                        >
                            ${item.query}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Search from history
     */
    searchFromHistory(query) {
        const searchInput = document.getElementById('global-search-input');
        if (searchInput) {
            searchInput.value = query;
            this.performSearch(query);
            this.addToSearchHistory(query);
        }
    }

    /**
     * Clear search history
     */
    clearSearchHistory() {
        this.searchHistory = [];
        this.saveSearchHistory();
        
        const historyContainer = document.getElementById('search-history');
        if (historyContainer) {
            historyContainer.innerHTML = this.renderSearchHistory();
        }
    }

    /**
     * Save search history to localStorage
     */
    saveSearchHistory() {
        try {
            localStorage.setItem('fifa-tracker-search-history', JSON.stringify(this.searchHistory));
        } catch (error) {
            console.warn('Could not save search history:', error);
        }
    }

    /**
     * Load search history from localStorage
     */
    loadSearchHistory() {
        try {
            const saved = localStorage.getItem('fifa-tracker-search-history');
            if (saved) {
                this.searchHistory = JSON.parse(saved);
            }
        } catch (error) {
            console.warn('Could not load search history:', error);
            this.searchHistory = [];
        }
    }

    /**
     * Navigate to player
     */
    navigateToPlayer(playerId) {
        // Implementation depends on app structure
        console.log('Navigate to player:', playerId);
        // Could trigger tab switch and scroll to player
    }

    /**
     * Navigate to match
     */
    navigateToMatch(matchId) {
        // Implementation depends on app structure
        console.log('Navigate to match:', matchId);
        // Could trigger tab switch and highlight match
    }
}

// Global search functions
window.applyQuickFilter = function(filterType) {
    if (window.searchAndFilter) {
        window.searchAndFilter.applyQuickFilter(filterType);
    }
};

window.clearFilters = function() {
    if (window.searchAndFilter) {
        window.searchAndFilter.clearFilters();
    }
};

window.searchFromHistory = function(query) {
    if (window.searchAndFilter) {
        window.searchAndFilter.searchFromHistory(query);
    }
};

window.clearSearchHistory = function() {
    if (window.searchAndFilter) {
        window.searchAndFilter.clearSearchHistory();
    }
};

window.navigateToPlayer = function(playerId) {
    if (window.searchAndFilter) {
        window.searchAndFilter.navigateToPlayer(playerId);
    }
};

window.navigateToMatch = function(matchId) {
    if (window.searchAndFilter) {
        window.searchAndFilter.navigateToMatch(matchId);
    }
};

window.showAllResults = function(type) {
    console.log('Show all results for:', type);
    // Could expand the results section
};

// CSS for quick filter buttons
const quickFilterCSS = `
.quick-filter-btn {
    @apply px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-gray-300 rounded-lg transition-colors flex items-center;
}
`;

// Inject CSS
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = quickFilterCSS;
    document.head.appendChild(style);
}

// Export the search and filter instance
export const searchAndFilter = new SearchAndFilter();