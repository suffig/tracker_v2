// Dynamic imports to handle loading issues gracefully
let supabase, supabaseDb, usingFallback;
let connectionMonitor, isDatabaseAvailable;
let dataManager;
let loadingManager, ErrorHandler, eventBus;
let showModal, hideModal;
let setReadOnlyMode, isInReadOnlyMode;
let signUp, signIn, signOut;
let renderKaderTab, renderBansTab, renderMatchesTab, renderStatsTab, renderFinanzenTab, renderSpielerTab;
let resetKaderState, resetBansState, resetFinanzenState, resetMatchesState, resetStatsState, resetSpielerState;

// Configuration variables
let SUPABASE_URL, SUPABASE_ANON_KEY;

// Initialize modules asynchronously
async function initializeModules() {
    try {
        console.log('🔄 Loading modules...');
        
        // Load core modules
        const supabaseModule = await import('./supabaseClient.js');
        supabase = supabaseModule.supabase;
        supabaseDb = supabaseModule.supabaseDb;
        usingFallback = supabaseModule.usingFallback;
        
        // Import configuration for fallback status display
        SUPABASE_URL = supabaseModule.SUPABASE_URL;
        SUPABASE_ANON_KEY = supabaseModule.SUPABASE_ANON_KEY;
        
        const connectionModule = await import('./connectionMonitor.js');
        connectionMonitor = connectionModule.connectionMonitor;
        isDatabaseAvailable = connectionModule.isDatabaseAvailable;
        
        const dataModule = await import('./dataManager.js');
        dataManager = dataModule.dataManager;
        
        const utilsModule = await import('./utils.js');
        loadingManager = utilsModule.loadingManager;
        ErrorHandler = utilsModule.ErrorHandler;
        eventBus = utilsModule.eventBus;
        
        const modalModule = await import('./modal.js');
        showModal = modalModule.showModal;
        hideModal = modalModule.hideModal;
        
        const appStateModule = await import('./appState.js');
        setReadOnlyMode = appStateModule.setReadOnlyMode;
        isInReadOnlyMode = appStateModule.isInReadOnlyMode;
        
        const authModule = await import('./auth.js');
        signUp = authModule.signUp;
        signIn = authModule.signIn;
        signOut = authModule.signOut;
        
        // Load tab modules
        const kaderModule = await import('./kader.js');
        renderKaderTab = kaderModule.renderKaderTab;
        resetKaderState = kaderModule.resetKaderState;
        
        const bansModule = await import('./bans.js');
        renderBansTab = bansModule.renderBansTab;
        resetBansState = bansModule.resetBansState;
        
        const matchesModule = await import('./matches.js');
        renderMatchesTab = matchesModule.renderMatchesTab;
        resetMatchesState = matchesModule.resetMatchesState;
        
        const statsModule = await import('./stats.js');
        renderStatsTab = statsModule.renderStatsTab;
        resetStatsState = statsModule.resetStatsState;
        
        const finanzenModule = await import('./finanzen.js');
        renderFinanzenTab = finanzenModule.renderFinanzenTab;
        resetFinanzenState = finanzenModule.resetFinanzenState;
        
        const spielerModule = await import('./spieler.js');
        renderSpielerTab = spielerModule.renderSpielerTab;
        resetSpielerState = spielerModule.resetSpielerState;
        
        console.log('✅ All modules loaded successfully');
        
        // Setup auth state listener after modules are loaded
        setupAuthStateListener();
        
        return true;
    } catch (error) {
        console.error('❌ Failed to load modules:', error);
        // Show error to user
        const loginDiv = document.getElementById('login-area');
        if (loginDiv) {
            loginDiv.innerHTML = `
                <div style="color:red;padding:2rem;text-align:center;background:white;border-radius:8px;margin:2rem;">
                    <h2>Fehler beim Laden der Anwendung</h2>
                    <p>Einige Komponenten konnten nicht geladen werden.</p>
                    <p>Fehler: ${error.message}</p>
                    <button onclick="location.reload()" style="padding:8px 16px;background:#007bff;color:white;border:none;border-radius:4px;cursor:pointer;">
                        Seite neu laden
                    </button>
                </div>
            `;
        }
        return false;
    }
}

let currentTab = "matches";
let liveSyncInitialized = false;
let tabButtonsInitialized = false;
let realtimeChannel = null;
let isAppVisible = true;
let inactivityCleanupTimer = null;

console.log("main.js gestartet");

// --- Connection status indicator with enhanced messaging ---
function updateConnectionStatus(status) {
    let indicator = document.getElementById('connection-status');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'connection-status';
        indicator.className = 'fixed top-2 right-2 z-50 px-3 py-1 rounded-full text-sm font-medium transition-all duration-300 cursor-pointer';
        indicator.title = 'Klicken für Details';
        document.body.appendChild(indicator);
        
        // Add click handler for detailed status
        indicator.addEventListener('click', showConnectionDetails);
    }
    
    // Clear previous classes
    indicator.className = indicator.className.replace(/bg-\w+-\d+/g, '').replace(/text-\w+-\d+/g, '');
    
    if (status.connected) {
        const baseClass = 'fixed top-2 right-2 z-50 px-3 py-1 rounded-full text-sm font-medium transition-all duration-300 cursor-pointer';
        
        if (status.connectionType === 'fallback') {
            indicator.textContent = status.reconnected ? 'Demo-Modus wiederhergestellt' : 'Demo-Modus';
            indicator.className = baseClass + ' bg-blue-500 text-white';
            indicator.title = 'Demo-Modus aktiv - Simulierte Daten. Klicken für Details.';
        } else if (status.connectionType === 'real-fallback') {
            indicator.textContent = status.reconnected ? 'Datenbankverbindung aktiv' : 'Datenbank (CDN umgangen)';
            indicator.className = baseClass + ' bg-green-500 text-white';
            indicator.title = 'Datenbankverbindung über direkte API aktiv. Klicken für Details.';
        } else if (status.connectionType === 'cdn-blocked') {
            indicator.textContent = status.reconnected ? 'Verbindung wird getestet...' : 'CDN blockiert - Teste Verbindung...';
            indicator.className = baseClass + ' bg-yellow-500 text-white';
            indicator.title = 'CDN blockiert - Teste direkte Datenbankverbindung. Klicken für Details.';
        } else {
            indicator.textContent = status.reconnected ? 'Verbindung wiederhergestellt' : 'Online';
            indicator.className = baseClass + ' bg-green-500 text-white';
            indicator.title = 'Datenbankverbindung aktiv. Klicken für Details.';
        }
        
        if (status.reconnected) {
            // Show temporary success message
            setTimeout(() => {
                if (status.connectionType === 'fallback') {
                    indicator.textContent = 'Demo-Modus';
                } else {
                    indicator.textContent = 'Online';
                }
            }, 3000);
        }
    } else {
        const baseClass = 'fixed top-2 right-2 z-50 px-3 py-1 rounded-full text-sm font-medium transition-all duration-300 cursor-pointer';
        
        if (status.networkOffline) {
            indicator.textContent = 'Offline';
            indicator.className = baseClass + ' bg-gray-7000 text-white';
            indicator.title = 'Keine Internetverbindung. Klicken für Details.';
        } else if (status.sessionExpired) {
            indicator.textContent = 'Session abgelaufen';
            indicator.className = baseClass + ' bg-red-700 text-white';
            indicator.title = 'Bitte neu anmelden. Klicken für Details.';
        } else if (status.reconnecting) {
            indicator.textContent = `Verbinde... (${status.attempt || 0}/5)`;
            indicator.className = baseClass + ' bg-yellow-500 text-white';
            indicator.title = 'Wiederverbindung läuft... Klicken für Details.';
        } else if (status.maxAttemptsReached) {
            indicator.textContent = 'Verbindung unterbrochen';
            indicator.className = baseClass + ' bg-red-500 text-white';
            indicator.title = 'Maximale Wiederverbindungsversuche erreicht. Klicken für Details.';
        } else {
            indicator.textContent = 'Verbindung verloren';
            indicator.className = baseClass + ' bg-red-500 text-white';
            indicator.title = 'Datenbankverbindung verloren. Klicken für Details.';
        }
    }
    
    // Store current status for details view
    indicator.dataset.status = JSON.stringify(status);
}

// Enhanced connection details modal with improved UX
function showConnectionDetails() {
    const indicator = document.getElementById('connection-status');
    if (!indicator || !indicator.dataset.status) return;
    
    try {
        const status = JSON.parse(indicator.dataset.status);
        const diagnostics = connectionMonitor.getDiagnostics();
        
        const modalHTML = `
            <div class="p-6">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">Verbindungsstatus</h3>
                    <button onclick="hideModal()" class="text-gray-500 hover:text-gray-700 text-xl">×</button>
                </div>
                
                <div class="space-y-4">
                    <!-- Connection Status -->
                    <div class="modern-card">
                        <div class="flex items-center justify-between">
                            <span class="font-medium">Status:</span>
                            <span class="px-2 py-1 rounded text-sm ${status.connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                                ${status.connected ? '✅ Verbunden' : '❌ Getrennt'}
                            </span>
                        </div>
                        <div class="flex items-center justify-between mt-2">
                            <span class="font-medium">Typ:</span>
                            <span class="text-sm text-gray-600">${getConnectionTypeText(diagnostics.connectionType)}</span>
                        </div>
                    </div>
                    
                    ${status.message ? `
                        <div class="notification warning">
                            <div class="notification-icon">!</div>
                            <div class="notification-content">
                                <div class="notification-title">Nachricht</div>
                                <div class="notification-message">${status.message}</div>
                            </div>
                        </div>
                    ` : ''}
                    
                    ${diagnostics.metrics.totalConnections > 0 ? `
                        <div class="modern-card">
                            <div class="font-medium mb-2">Verbindungsstatistiken:</div>
                            <div class="text-sm space-y-1">
                                <div>Erfolgsrate: ${diagnostics.metrics.successRate}%</div>
                                <div>Durchschnittliche Antwortzeit: ${Math.round(diagnostics.metrics.averageResponseTime)}ms</div>
                                <div>Letzte Antwortzeit: ${Math.round(diagnostics.metrics.lastResponseTime)}ms</div>
                                <div>Verbindungsgeschwindigkeit: ${getSpeedText(diagnostics.connectionSpeed)}</div>
                            </div>
                        </div>
                    ` : ''}
                    
                    ${diagnostics.recommendations.length > 0 ? `
                        <div class="modern-card">
                            <div class="font-medium mb-2">Empfehlungen:</div>
                            <ul class="text-sm space-y-1">
                                ${diagnostics.recommendations.map(rec => `<li>• ${rec}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    
                    <!-- Actions -->
                    <div class="flex space-x-2 pt-2">
                        <button onclick="testConnection()" class="btn btn-primary btn-sm flex-1">
                            🔄 Verbindung testen
                        </button>
                        <button onclick="retryConnection()" class="btn btn-secondary btn-sm flex-1">
                            🔌 Neu verbinden
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Use enhanced modal system
        showModal(modalHTML, { size: 'md' });
        
    } catch (error) {
        console.error('Error showing connection details:', error);
        ErrorHandler.showUserError('Fehler beim Anzeigen der Verbindungsdetails');
    }
}

function getConnectionTypeText(type) {
    switch (type) {
        case 'real': return '🔗 Echte Datenbankverbindung';
        case 'real-fallback': return '🔗 Datenbankverbindung (CDN umgangen)';
        case 'fallback': return '🔄 Demo-Modus (Simulierte Daten)';
        case 'cdn-blocked': return '🚧 CDN blockiert - Teste Direktverbindung';
        case 'offline': return '📴 Offline';
        case 'expired': return '🔐 Session abgelaufen';
        case 'disconnected': return '❌ Verbindung unterbrochen';
        default: return '❓ Unbekannt';
    }
}

function getSpeedText(speed) {
    switch (speed) {
        case 'fast': return '🚀 Schnell (<100ms)';
        case 'medium': return '⚡ Mittel (100-500ms)';
        case 'slow': return '🐌 Langsam (500ms-1s)';
        case 'very-slow': return '🦴 Sehr langsam (>1s)';
        default: return '❓ Unbekannt';
    }
}

function closeConnectionDetails() {
    const modal = document.getElementById('connection-details-modal');
    if (modal) {
        modal.remove();
    }
}

async function testConnection() {
    const testButton = document.querySelector('[onclick="testConnection()"]');
    if (testButton) {
        testButton.textContent = '🔄 Teste...';
        testButton.disabled = true;
    }
    
    try {
        const connected = await connectionMonitor.checkConnection();
        if (testButton) {
            testButton.textContent = connected ? '✅ Erfolgreich' : '❌ Fehlgeschlagen';
            setTimeout(() => {
                testButton.textContent = '🔄 Verbindung testen';
                testButton.disabled = false;
            }, 2000);
        }
    } catch (error) {
        if (testButton) {
            testButton.textContent = '❌ Fehler';
            setTimeout(() => {
                testButton.textContent = '🔄 Verbindung testen';
                testButton.disabled = false;
            }, 2000);
        }
    }
}

async function retryConnection() {
    const retryButton = document.querySelector('[onclick="retryConnection()"]');
    if (retryButton) {
        retryButton.textContent = '🔄 Verbinde...';
        retryButton.disabled = true;
    }
    
    // Reset connection attempts and try again
    connectionMonitor.reconnectAttempts = 0;
    connectionMonitor.reconnectDelay = 1000;
    
    await connectionMonitor.attemptReconnection();
    
    if (retryButton) {
        setTimeout(() => {
            retryButton.textContent = '🔌 Neu verbinden';
            retryButton.disabled = false;
        }, 2000);
    }
    
    // Close modal after retry
    setTimeout(closeConnectionDetails, 1000);
}

// --- Session expiry UI handler (for supabaseClient.js event dispatch) ---
window.addEventListener('supabase-session-expired', () => {
    let indicator = document.getElementById('connection-status');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'connection-status';
        indicator.className = 'fixed top-2 right-2 z-50 px-3 py-1 rounded-full text-sm font-medium transition-all duration-300';
        document.body.appendChild(indicator);
    }
    indicator.textContent = 'Session abgelaufen – bitte neu anmelden';
    indicator.className = indicator.className.replace(/bg-\w+-\d+/g, '') + ' bg-red-700 text-white';
});

// Handle app visibility changes to prevent crashes during inactivity
function handleVisibilityChange() {
    const wasVisible = isAppVisible;
    isAppVisible = !document.hidden;

    if (!isAppVisible && wasVisible) {
        inactivityCleanupTimer = setTimeout(() => {
            cleanupRealtimeSubscriptions();
            connectionMonitor.pauseHealthChecks();
        }, 5 * 60 * 1000);
    } else if (isAppVisible && !wasVisible) {
        if (inactivityCleanupTimer) {
            clearTimeout(inactivityCleanupTimer);
            inactivityCleanupTimer = null;
        }
        connectionMonitor.resumeHealthChecks();
        supabase.auth.getSession().then(({data: {session}}) => {
            if(session) {
                // NEU: Reset aller lokalen Daten-States
				tabButtonsInitialized = false;
                liveSyncInitialized = false;
                if (typeof resetKaderState === "function") resetKaderState();
                if (typeof resetBansState === "function") resetBansState();
                if (typeof resetFinanzenState === "function") resetFinanzenState();
                if (typeof resetMatchesState === "function") resetMatchesState();
                if (typeof resetStatsState === "function") resetStatsState();
                if (typeof resetSpielerState === "function") resetSpielerState();
                setupTabButtons();
                subscribeAllLiveSync();
                renderCurrentTab(); // <-- erzwingt Daten-Reload!
            } else {
                renderLoginArea();
            }
        });
    }
}

function cleanupRealtimeSubscriptions() {
    if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
        realtimeChannel = null;
        liveSyncInitialized = false;
    }
}

function showTabLoader(show = true) {
    const loader = document.getElementById('tab-loader');
    if (loader) {
        loader.style.display = show ? "flex" : "none";
    }
    
    // Use centralized loading manager
    if (show) {
        loadingManager.show('tab-loading');
    } else {
        loadingManager.hide('tab-loading');
    }
}

// --- Bottom Navbar Indicator ---
function updateBottomNavActive(tab) {
    try {
        // Remove active class from all nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active class to current tab
        const navElement = document.getElementById(`nav-${tab}`);
        if (navElement) {
            navElement.classList.add('active');
        }
    } catch (error) {
        console.error('Error updating bottom nav:', error);
    }
}

async function switchTab(tab) {
    try {
        currentTab = tab;
        
        // Enhanced loading states
        const appDiv = document.getElementById("app");
        if (appDiv) {
            appDiv.classList.add('fade-out');
        }
        
        // Update bottom navigation with smooth transition
        updateBottomNavActive(tab);
        showTabLoader(true);
        
        // Add small delay for better UX and smooth animation
        await new Promise(resolve => setTimeout(resolve, 150));
        
        await renderCurrentTab();
        
        // Smooth transition in
        if (appDiv) {
            appDiv.classList.remove('fade-out');
            appDiv.classList.add('fade-in');
            setTimeout(() => appDiv.classList.remove('fade-in'), 500);
        }
        
        showTabLoader(false);
        
        // Show success feedback for non-matches tabs
        if (tab !== 'matches') {
            loadingManager.hide('tab-loading');
        }
    } catch (error) {
        console.error('Error switching tab:', error);
        ErrorHandler.showUserError(`Fehler beim Laden von ${tab}. Bitte versuchen Sie es erneut.`, 'error');
        showTabLoader(false);
    }
}

async function renderCurrentTab() {
    const appDiv = document.getElementById("app");
    if (!appDiv) {
        console.error('App container not found');
        return;
    }
    
    try {
        appDiv.innerHTML = "";
        
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            appDiv.innerHTML = `<div class="text-red-700 dark:text-red-300 text-center py-6">Nicht angemeldet. Bitte einloggen.</div>`;
            return;
        }
        
        console.log("renderCurrentTab mit currentTab:", currentTab);
        
        // Use a more structured approach for tab rendering
        const tabRenderers = {
            'squad': () => renderKaderTab("app"),
            'bans': () => renderBansTab("app"),
            'matches': () => renderMatchesTab("app"),
            'stats': () => renderStatsTab("app"),
            'finanzen': () => renderFinanzenTab("app"),
            'spieler': () => renderSpielerTab("app")
        };
        
        const renderer = tabRenderers[currentTab];
        if (renderer) {
            await renderer();
        } else {
            console.warn(`No renderer found for tab: ${currentTab}`);
            appDiv.innerHTML = `<div class="text-yellow-700 text-center py-6">Unbekannter Tab: ${currentTab}</div>`;
        }
    } catch (error) {
        console.error('Error rendering tab:', error);
        ErrorHandler.handleDatabaseError(error, 'Tab laden');
        appDiv.innerHTML = `<div class="text-red-700 dark:text-red-300 text-center py-6">Fehler beim Laden des Tabs. Bitte versuchen Sie es erneut.</div>`;
    }
}

function setupTabButtons() {
    // Since we're only using bottom navigation, no desktop tab setup needed
    tabButtonsInitialized = true;
}

// Enhanced Bottom Navigation für Mobile Geräte with keyboard support
function setupBottomNav() {
    const navItems = [
        { id: "nav-squad", tab: "squad" },
        { id: "nav-matches", tab: "matches" },
        { id: "nav-bans", tab: "bans" },
        { id: "nav-finanzen", tab: "finanzen" },
        { id: "nav-stats", tab: "stats" },
        { id: "nav-spieler", tab: "spieler" }
    ];
    
    navItems.forEach(({ id, tab }) => {
        const element = document.getElementById(id);
        if (element) {
            // Mouse click handler
            element.addEventListener("click", e => { 
                e.preventDefault(); 
                switchTab(tab); 
            });
            
            // Keyboard navigation support
            element.addEventListener("keydown", e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    switchTab(tab);
                }
            });
            
            // Add better focus management
            element.setAttribute('tabindex', '0');
            element.setAttribute('role', 'button');
            element.setAttribute('aria-label', `Wechseln zu ${tab}`);
        }
    });
}
window.addEventListener('DOMContentLoaded', setupBottomNav);

function subscribeAllLiveSync() {
	cleanupRealtimeSubscriptions();
    liveSyncInitialized = false; // <-- redundantes Reset, schadet aber nicht!
    if (liveSyncInitialized || !isAppVisible) return;
    realtimeChannel = supabase
        .channel('global_live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => renderCurrentTab())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => renderCurrentTab())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => renderCurrentTab())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'finances' }, () => renderCurrentTab())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bans' }, () => renderCurrentTab())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'spieler_des_spiels' }, () => renderCurrentTab())
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                liveSyncInitialized = true;
            } else if (status === 'CHANNEL_ERROR') {
                liveSyncInitialized = false;
                if (isAppVisible) setTimeout(() => {
                    if (!liveSyncInitialized && isAppVisible) subscribeAllLiveSync();
                }, 5000);
            } else if (status === 'CLOSED') {
                liveSyncInitialized = false;
                if (isDatabaseAvailable() && isAppVisible) setTimeout(() => {
                    if (isAppVisible) subscribeAllLiveSync();
                }, 2000);
            }
        });
}

function setupLogoutButton() {
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.onclick = async () => {
			ErrorHandler.showSuccessMessage('Du wurdest erfolgreich ausgeloggt!');
            await signOut();
            let tries = 0;
            while (tries < 20) {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) break;
                await new Promise(res => setTimeout(res, 100));
                tries++;
            }
            // window.location.reload(); // Entfernt!
            liveSyncInitialized = false;
            tabButtonsInitialized = false;
            cleanupRealtimeSubscriptions();
            if (inactivityCleanupTimer) {
                clearTimeout(inactivityCleanupTimer);
                inactivityCleanupTimer = null;
            }
            connectionMonitor.removeListener(updateConnectionStatus);
            renderLoginArea();
        };
    }
}

async function renderLoginArea() {
	console.log("renderLoginArea aufgerufen");
    const loginDiv = document.getElementById('login-area');
    const appContainer = document.querySelector('.app-container');
    if (!loginDiv || !appContainer) {
        document.body.innerHTML = `<div style="color:red;padding:2rem;text-align:center">
          Kritischer Fehler: UI-Container nicht gefunden.<br>
          Bitte Seite neu laden oder Admin kontaktieren.
        </div>`;
        return;
    }
    const logoutBtn = document.getElementById('logout-btn');
    
    try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log("Current session:", session ? "Active" : "None", session?.user?.email || "No user");
        
        if (session) {
            console.log("✅ User authenticated, showing main app");
            loginDiv.innerHTML = "";
            appContainer.style.display = '';
            if (logoutBtn) logoutBtn.style.display = "";
            setupLogoutButton();
            setupTabButtons();
            connectionMonitor.addListener(updateConnectionStatus);
            if (!tabButtonsInitialized) {
                switchTab(currentTab);
            } else {
                renderCurrentTab();
            }
            subscribeAllLiveSync();
        } else {
            console.log("❌ No session, showing login form");
            // Das Loginformular NICHT komplett neu bauen, sondern Felder erhalten!
            let emailValue = "";
            let pwValue = "";
            if (document.getElementById('email')) emailValue = document.getElementById('email').value;
            if (document.getElementById('pw')) pwValue = document.getElementById('pw').value;
            loginDiv.innerHTML = `
                <div class="login-container">
                    <div class="login-card fade-in">
                        <div class="login-logo">
                            <div class="login-logo-icon">
                                <i class="fas fa-futbol"></i>
                            </div>
                            <h1 class="login-title">FIFA Tracker</h1>
                            <p class="login-subtitle">Melden Sie sich an, um fortzufahren</p>
                        </div>
                        
                        <form id="loginform" class="space-y-6">
                            <div class="form-group">
                                <label for="email" class="form-label">E-Mail-Adresse</label>
                                <input 
                                    type="email" 
                                    id="email" 
                                    required 
                                    placeholder="ihre@email.com" 
                                    autocomplete="email"
                                    class="form-input" 
                                    value="${emailValue}" />
                            </div>
                            <div class="form-group">
                                <label for="pw" class="form-label">Passwort</label>
                                <input 
                                    type="password" 
                                    id="pw" 
                                    required 
                                    placeholder="Ihr Passwort" 
                                    autocomplete="current-password"
                                    class="form-input" 
                                    value="${pwValue}" />
                            </div>
                            <div class="form-group">
                                <label class="flex items-center space-x-2 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        id="editMode" 
                                        name="editMode"
                                        class="form-checkbox text-blue-600 rounded" />
                                    <span class="form-label mb-0">Bearbeiten erlauben (Änderungen möglich)</span>
                                </label>
                            </div>
                            <button
                                type="submit"
                                class="btn btn-primary btn-lg w-full login-btn">
                                <i class="fas fa-sign-in-alt"></i> 
                                <span>Anmelden</span>
                            </button>
                        </form>
                    </div>
                </div>
            `;
            appContainer.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = "none";
            liveSyncInitialized = false;
            tabButtonsInitialized = false;
            cleanupRealtimeSubscriptions();
            if (inactivityCleanupTimer) {
                clearTimeout(inactivityCleanupTimer);
                inactivityCleanupTimer = null;
            }
            connectionMonitor.removeListener(updateConnectionStatus);
            
            // Setup login form handler with better event management
            const loginForm = document.getElementById('loginform');
            if (loginForm) {
                // Remove any existing listeners by cloning the form
                const newForm = loginForm.cloneNode(true);
                loginForm.parentNode.replaceChild(newForm, loginForm);
                
                newForm.onsubmit = async e => {
                    e.preventDefault();
                    const emailInput = document.getElementById('email');
                    const passwordInput = document.getElementById('pw');
                    const editModeCheckbox = document.getElementById('editMode');
                    const loginBtn = document.querySelector('.login-btn');
                    
                    if (!emailInput || !passwordInput) {
                        console.error("Login form inputs not found");
                        return;
                    }
                    
                    // Clear any concatenated values and get fresh values
                    const emailValue = emailInput.value.trim();
                    const passwordValue = passwordInput.value.trim();
                    
                    console.log("🔑 Login attempt - Email:", emailValue, "Password length:", passwordValue.length);
                    
                    // Capture edit mode preference - inverted logic: checked = edit mode, unchecked = read-only mode
                    const readOnlyMode = editModeCheckbox ? !editModeCheckbox.checked : true;
                    setReadOnlyMode(readOnlyMode);
                    console.log("🔑 Read-only mode:", readOnlyMode);
                    
                    // Show loading state
                    if (loginBtn) {
                        loginBtn.disabled = true;
                        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Anmelden...';
                    }
                    
                    try {
                        await signIn(emailValue, passwordValue);
                        console.log("✅ Login successful, waiting for auth state change");
                    } catch (error) {
                        console.error("❌ Login failed:", error);
                        if (loginBtn) {
                            loginBtn.disabled = false;
                            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i> <span>Anmelden</span>';
                        }
                    }
                };
            }
        }
    } catch (error) {
        console.error("Error in renderLoginArea:", error);
        // Show error state
        loginDiv.innerHTML = `
            <div class="text-center text-red-600 p-4">
                <h3>Anmeldefehler</h3>
                <p>Es gab ein Problem beim Laden der Anmeldung: ${error.message}</p>
                <button onclick="location.reload()" class="mt-2 bg-blue-500 text-white px-4 py-2 rounded">
                    Seite neu laden
                </button>
            </div>
        `;
    }
}

// Separate functions for showing main app vs login form
async function showMainApp() {
    console.log("✅ Showing main app");
    const loginDiv = document.getElementById('login-area');
    const appContainer = document.querySelector('.app-container');
    const logoutBtn = document.getElementById('logout-btn');
    
    if (loginDiv) loginDiv.innerHTML = "";
    if (appContainer) appContainer.style.display = '';
    if (logoutBtn) logoutBtn.style.display = "";
    
    setupLogoutButton();
    setupTabButtons();
    connectionMonitor.addListener(updateConnectionStatus);
    
    if (!tabButtonsInitialized) {
        switchTab(currentTab);
    } else {
        renderCurrentTab();
    }
    subscribeAllLiveSync();
}

async function showLoginForm() {
    console.log("❌ Showing login form");
    const loginDiv = document.getElementById('login-area');
    const appContainer = document.querySelector('.app-container');
    const logoutBtn = document.getElementById('logout-btn');
    
    if (appContainer) appContainer.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = "none";
    
    // Preserve existing form values if they exist
    let emailValue = "";
    let pwValue = "";
    if (document.getElementById('email')) emailValue = document.getElementById('email').value;
    if (document.getElementById('pw')) pwValue = document.getElementById('pw').value;
    
    if (loginDiv) {
        loginDiv.innerHTML = `
            <div class="login-container">
                <div class="login-card fade-in">
                    <div class="login-logo">
                        <div class="login-logo-icon">
                            <i class="fas fa-futbol"></i>
                        </div>
                        <h1 class="login-title">FIFA Tracker</h1>
                        <p class="login-subtitle">Melden Sie sich an, um fortzufahren</p>
                    </div>
                    
                    <form id="loginform" class="space-y-6">
                        <div class="form-group">
                            <label for="email" class="form-label">E-Mail-Adresse</label>
                            <input 
                                type="email" 
                                id="email" 
                                name="email" 
                                required 
                                placeholder="ihre@email.com" 
                                class="form-input"
                                value="${emailValue}" />
                        </div>
                        <div class="form-group">
                            <label for="pw" class="form-label">Passwort</label>
                            <input 
                                type="password" 
                                id="pw" 
                                name="password" 
                                required 
                                placeholder="Ihr Passwort" 
                                class="form-input"
                                value="${pwValue}" />
                        </div>
                        <div class="form-group">
                            <label class="flex items-center space-x-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    id="editMode" 
                                    name="editMode"
                                    class="form-checkbox text-blue-600 rounded" />
                                <span class="form-label mb-0">Bearbeiten erlauben (Änderungen möglich)</span>
                            </label>
                        </div>
                        <button
                            type="submit"
                            class="btn btn-primary btn-lg w-full">
                            <i class="fas fa-sign-in-alt"></i> Anmelden
                        </button>
                    </form>
                </div>
            </div>
        `;
        
        // Setup form handler
        const form = document.getElementById('loginform');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const emailInput = document.getElementById('email');
                const passwordInput = document.getElementById('pw');
                const editModeCheckbox = document.getElementById('editMode');
                
                if (!emailInput || !passwordInput) {
                    console.error("Login form inputs not found");
                    return;
                }
                
                // Clear any concatenated values and get fresh values
                const email = emailInput.value.trim();
                const password = passwordInput.value.trim();
                
                console.log("🔑 Login attempt - Email:", email, "Password length:", password.length);
                
                // Capture edit mode preference - inverted logic: checked = edit mode, unchecked = read-only mode
                const readOnlyMode = editModeCheckbox ? !editModeCheckbox.checked : true;
                setReadOnlyMode(readOnlyMode);
                console.log(`🔑 Read-only mode: ${readOnlyMode}`);
                
                const submitBtn = form.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Anmelden...';
                    submitBtn.disabled = true;
                }
                
                try {
                    await signIn(email, password);
                    console.log('✅ Login successful, waiting for auth state change');
                } catch (error) {
                    console.error('Login error:', error);
                } finally {
                    if (submitBtn) {
                        submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Anmelden';
                        submitBtn.disabled = false;
                    }
                }
            });
        }
    }
}

// Setup auth state listener after modules are loaded
function setupAuthStateListener() {
    if (!supabase || !supabase.auth || typeof supabase.auth.onAuthStateChange !== 'function') {
        console.warn('Supabase auth not available for auth state listener');
        return;
    }
    
    console.log('🔧 Setting up auth state listener...');
    
    // Enhanced auth state change listener
    supabase.auth.onAuthStateChange(async (event, session) => {
        console.log(`🔐 Auth state changed: ${event}`, session?.user?.email || 'No user');
        
        // Add a small delay to ensure DOM is ready
        setTimeout(async () => {
            try {
                if (event === 'SIGNED_IN' && session) {
                    console.log('✅ User signed in, showing main app');
                    await showMainApp();
                } else {
                    console.log('❌ User signed out, showing login form');
                    await showLoginForm();
                }
            } catch (error) {
                console.error('Error handling auth state change:', error);
            }
        }, 100);
    });
    
    console.log('✅ Auth state listener setup complete');
}

window.addEventListener('DOMContentLoaded', async () => {
	console.log("DOMContentLoaded!");
    
    // First, initialize all modules
    const modulesLoaded = await initializeModules();
    if (!modulesLoaded) {
        console.error('Failed to initialize modules, cannot continue');
        return;
    }
    
    // Show fallback status if using fallback mode
    if (usingFallback) {
        showFallbackStatus();
    }
    
    await renderLoginArea();
});

// Show fallback status indicator
function showFallbackStatus() {
    let indicator = document.getElementById('connection-status');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'connection-status';
        indicator.className = 'fixed top-2 right-2 z-50 px-3 py-1 rounded-full text-sm font-medium transition-all duration-300';
        document.body.appendChild(indicator);
    }
    
    // Check if we have real credentials configured
    const hasRealCredentials = window.location.search.includes('supabase') || 
        (SUPABASE_URL !== 'https://buduldeczjwnjvsckqat.supabase.co' && 
         SUPABASE_ANON_KEY !== 'sb_publishable_wcOHaKNEW9rQ3anrRNlEpA_r1_wGda3' &&
         SUPABASE_URL.includes('.supabase.co'));
    
    if (hasRealCredentials) {
        indicator.textContent = 'CDN blockiert - Teste Verbindung...';
        indicator.className = indicator.className.replace(/bg-\w+-\d+/g, '') + ' bg-yellow-500 text-white cursor-pointer';
        indicator.title = 'CDN blockiert - Versuche direkte Datenbankverbindung';
    } else {
        indicator.textContent = 'Demo-Modus (Supabase nicht konfiguriert)';
        indicator.className = indicator.className.replace(/bg-\w+-\d+/g, '') + ' bg-blue-500 text-white cursor-pointer';
        indicator.title = 'Demo-Modus aktiv - Konfigurieren Sie Supabase für echte Daten';
    }
    
    // Add click handler to show configuration help
    indicator.onclick = () => {
        showDemoModeConfigurationHelp();
    };
}

function showDemoModeConfigurationHelp() {
    const hasCredentials = SUPABASE_URL.includes('.supabase.co') && 
                          SUPABASE_URL !== 'https://your-project.supabase.co';
    
    let helpContent;
    
    if (hasCredentials) {
        helpContent = `
            <div class="p-6 text-gray-700">
                <h3 class="text-xl font-bold mb-4 text-yellow-600">🚧 CDN Blockiert - Datenbankverbindung wird getestet</h3>
                <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                    <p class="text-sm"><strong>Status:</strong> Supabase-Bibliothek von CDN blockiert, aber Datenbank-Credentials sind konfiguriert.</p>
                </div>
                <h4 class="font-semibold mb-2">Die Anwendung versucht automatisch:</h4>
                <ol class="list-decimal list-inside space-y-2 text-sm">
                    <li>Direkte API-Verbindung zur konfigurierten Supabase-Datenbank</li>
                    <li>Umgehung der blockierten CDN-Requests</li>
                    <li>Fallback auf lokale Bibliothek falls verfügbar</li>
                </ol>
                
                <h4 class="font-semibold mb-2 mt-4">Falls die Verbindung fehlschlägt:</h4>
                <ul class="list-disc list-inside space-y-1 text-sm">
                    <li>Deaktivieren Sie temporär Ihren Ad-Blocker</li>
                    <li>Überprüfen Sie Ihre Netzwerkverbindung</li>
                    <li>Stellen Sie sicher, dass Ihr Supabase-Projekt aktiv ist</li>
                    <li>Kontaktieren Sie Ihren Netzwerkadministrator bezüglich CDN-Blockierung</li>
                </ul>
                
                <div class="mt-4 p-3 bg-blue-50 rounded">
                    <p class="text-xs text-blue-600"><strong>Konfigurierte Datenbank:</strong> ${SUPABASE_URL}</p>
                </div>
            </div>
        `;
    } else {
        helpContent = `
            <div class="p-6 text-gray-700">
                <h3 class="text-xl font-bold mb-4 text-blue-600">🔧 Demo-Modus Konfiguration</h3>
                <div class="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
                    <p class="text-sm"><strong>Hinweis:</strong> Die Anwendung läuft im Demo-Modus mit simulierten Daten.</p>
                </div>
                <h4 class="font-semibold mb-2">Um eine echte Supabase-Verbindung zu verwenden:</h4>
                <ol class="list-decimal list-inside space-y-2 text-sm">
                    <li>Ersetzen Sie <code class="bg-gray-100 px-1 rounded">SUPABASE_URL</code> in supabaseClient.js</li>
                    <li>Ersetzen Sie <code class="bg-gray-100 px-1 rounded">SUPABASE_ANON_KEY</code> in supabaseClient.js</li>
                    <li>Stellen Sie sicher, dass die Supabase CDN geladen werden kann</li>
                    <li>Konfigurieren Sie die Datenbank-Tabellen gemäß SUPABASE_SETUP.md</li>
                </ol>
                <div class="mt-4 p-3 bg-gray-50 rounded">
                    <p class="text-xs text-gray-600">Weitere Informationen finden Sie in der Datei <strong>SUPABASE_SETUP.md</strong></p>
                </div>
            </div>
        `;
    }
    
    ErrorHandler.showUserError(helpContent, 'info');
}

document.addEventListener('visibilitychange', handleVisibilityChange);
window.addEventListener('beforeunload', () => {
    cleanupRealtimeSubscriptions();
    if (inactivityCleanupTimer) {
        clearTimeout(inactivityCleanupTimer);
    }
    if (connectionMonitor && typeof connectionMonitor.destroy === 'function') {
        connectionMonitor.destroy();
    }
});
