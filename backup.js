/**
 * Data Backup and Restore System
 * Provides comprehensive backup and restore functionality for the FIFA Tracker
 */

class BackupRestoreSystem {
    constructor() {
        this.backupFormat = 'json';
        this.compressionEnabled = true;
        this.encryptionEnabled = false; // Could be enabled for sensitive data
        this.backupHistory = [];
        this.maxBackupHistory = 10;
        this.autoBackupInterval = null;
        this.autoBackupEnabled = false;
    }

    /**
     * Create a comprehensive backup of all data
     */
    async createFullBackup(includeMetadata = true) {
        try {
            const { supabase } = await import('./supabaseClient.js');
            
            console.log('🔄 Creating full backup...');
            
            // Fetch all data from database
            const [
                playersResult,
                matchesResult,
                bansResult,
                financesResult,
                transactionsResult,
                sdsResult
            ] = await Promise.all([
                supabase.from('players').select('*'),
                supabase.from('matches').select('*'),
                supabase.from('bans').select('*'),
                supabase.from('finances').select('*'),
                supabase.from('transactions').select('*'),
                supabase.from('spieler_des_spiels').select('*')
            ]);

            // Check for errors
            const errors = [
                playersResult.error,
                matchesResult.error,
                bansResult.error,
                financesResult.error,
                transactionsResult.error,
                sdsResult.error
            ].filter(error => error !== null);

            if (errors.length > 0) {
                throw new Error(`Database errors: ${errors.map(e => e.message).join(', ')}`);
            }

            // Get local data (achievements, search history, etc.)
            const localData = this.getLocalData();

            // Create backup object
            const backup = {
                metadata: includeMetadata ? {
                    version: '2.0',
                    created: new Date().toISOString(),
                    creator: 'FIFA Tracker v2',
                    description: 'Vollständiges Backup aller FIFA Tracker Daten',
                    dataTypes: ['players', 'matches', 'bans', 'finances', 'transactions', 'spieler_des_spiels', 'local'],
                    recordCounts: {
                        players: playersResult.data?.length || 0,
                        matches: matchesResult.data?.length || 0,
                        bans: bansResult.data?.length || 0,
                        finances: financesResult.data?.length || 0,
                        transactions: transactionsResult.data?.length || 0,
                        spieler_des_spiels: sdsResult.data?.length || 0
                    }
                } : undefined,
                data: {
                    players: playersResult.data || [],
                    matches: matchesResult.data || [],
                    bans: bansResult.data || [],
                    finances: financesResult.data || [],
                    transactions: transactionsResult.data || [],
                    spieler_des_spiels: sdsResult.data || [],
                    local: localData
                }
            };

            console.log('✅ Full backup created successfully');
            
            // Add to backup history
            this.addToBackupHistory(backup.metadata);
            
            return backup;
            
        } catch (error) {
            console.error('❌ Error creating backup:', error);
            throw error;
        }
    }

    /**
     * Create a selective backup of specific data types
     */
    async createSelectiveBackup(dataTypes = ['players', 'matches']) {
        try {
            const { supabase } = await import('./supabaseClient.js');
            
            console.log(`🔄 Creating selective backup for: ${dataTypes.join(', ')}`);
            
            const backup = {
                metadata: {
                    version: '2.0',
                    created: new Date().toISOString(),
                    creator: 'FIFA Tracker v2 (Selective)',
                    description: `Selektives Backup: ${dataTypes.join(', ')}`,
                    dataTypes: dataTypes,
                    recordCounts: {}
                },
                data: {}
            };

            // Fetch selected data types
            for (const dataType of dataTypes) {
                try {
                    const result = await supabase.from(dataType).select('*');
                    if (result.error) {
                        console.warn(`Warning loading ${dataType}:`, result.error);
                        backup.data[dataType] = [];
                    } else {
                        backup.data[dataType] = result.data || [];
                        backup.metadata.recordCounts[dataType] = result.data?.length || 0;
                    }
                } catch (error) {
                    console.warn(`Error loading ${dataType}:`, error);
                    backup.data[dataType] = [];
                    backup.metadata.recordCounts[dataType] = 0;
                }
            }

            console.log('✅ Selective backup created successfully');
            return backup;
            
        } catch (error) {
            console.error('❌ Error creating selective backup:', error);
            throw error;
        }
    }

    /**
     * Get local storage data
     */
    getLocalData() {
        const localData = {};
        
        try {
            // Get achievements
            const achievements = localStorage.getItem('fifa-tracker-achievements');
            if (achievements) {
                localData.achievements = JSON.parse(achievements);
            }
            
            // Get search history
            const searchHistory = localStorage.getItem('fifa-tracker-search-history');
            if (searchHistory) {
                localData.searchHistory = JSON.parse(searchHistory);
            }
            
            // Get user preferences
            const preferences = localStorage.getItem('fifa-tracker-preferences');
            if (preferences) {
                localData.preferences = JSON.parse(preferences);
            }
            
            // Get app state
            const appState = localStorage.getItem('fifa-tracker-app-state');
            if (appState) {
                localData.appState = JSON.parse(appState);
            }
            
        } catch (error) {
            console.warn('Error getting local data:', error);
        }
        
        return localData;
    }

    /**
     * Download backup as file
     */
    async downloadBackup(backup, filename = null) {
        try {
            if (!filename) {
                const timestamp = new Date().toISOString().split('T')[0];
                filename = `fifa-tracker-backup-${timestamp}.json`;
            }

            let data = JSON.stringify(backup, null, 2);
            
            // Compress if enabled
            if (this.compressionEnabled) {
                data = await this.compressData(data);
                filename = filename.replace('.json', '.gz.json');
            }

            const blob = new Blob([data], { 
                type: this.compressionEnabled ? 'application/gzip' : 'application/json' 
            });
            
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            console.log(`✅ Backup downloaded: ${filename}`);
            
            const { ErrorHandler } = await import('./utils.js');
            ErrorHandler.showSuccessMessage(`Backup erfolgreich heruntergeladen: ${filename}`);
            
        } catch (error) {
            console.error('❌ Error downloading backup:', error);
            const { ErrorHandler } = await import('./utils.js');
            ErrorHandler.showUserError('Fehler beim Herunterladen des Backups', 'error');
        }
    }

    /**
     * Restore data from backup
     */
    async restoreFromBackup(backupData, options = {}) {
        const {
            replaceExisting = false,
            restoreLocal = true,
            dryRun = false,
            selectiveRestore = []
        } = options;

        try {
            console.log('🔄 Starting data restore...');
            
            // Validate backup format
            const validation = this.validateBackup(backupData);
            if (!validation.valid) {
                throw new Error(`Invalid backup format: ${validation.errors.join(', ')}`);
            }

            const { supabase } = await import('./supabaseClient.js');
            const restoreLog = {
                started: new Date().toISOString(),
                operations: [],
                errors: [],
                summary: {}
            };

            // Determine what to restore
            const dataTypes = selectiveRestore.length > 0 ? 
                selectiveRestore : 
                Object.keys(backupData.data).filter(key => key !== 'local');

            for (const dataType of dataTypes) {
                if (!backupData.data[dataType]) continue;

                try {
                    const records = backupData.data[dataType];
                    restoreLog.operations.push({
                        type: dataType,
                        recordCount: records.length,
                        started: new Date().toISOString()
                    });

                    if (!dryRun) {
                        if (replaceExisting) {
                            // Delete existing data first
                            await supabase.from(dataType).delete().neq('id', -999999);
                        }

                        // Insert new data
                        if (records.length > 0) {
                            // Batch insert for better performance
                            const batchSize = 100;
                            for (let i = 0; i < records.length; i += batchSize) {
                                const batch = records.slice(i, i + batchSize);
                                const result = await supabase.from(dataType).insert(batch);
                                
                                if (result.error) {
                                    restoreLog.errors.push({
                                        type: dataType,
                                        batch: Math.floor(i / batchSize) + 1,
                                        error: result.error.message
                                    });
                                }
                            }
                        }
                    }

                    restoreLog.operations[restoreLog.operations.length - 1].completed = new Date().toISOString();
                    restoreLog.summary[dataType] = records.length;

                } catch (error) {
                    console.error(`Error restoring ${dataType}:`, error);
                    restoreLog.errors.push({
                        type: dataType,
                        error: error.message
                    });
                }
            }

            // Restore local data
            if (restoreLocal && backupData.data.local && !dryRun) {
                try {
                    const localData = backupData.data.local;
                    
                    if (localData.achievements) {
                        localStorage.setItem('fifa-tracker-achievements', JSON.stringify(localData.achievements));
                    }
                    
                    if (localData.searchHistory) {
                        localStorage.setItem('fifa-tracker-search-history', JSON.stringify(localData.searchHistory));
                    }
                    
                    if (localData.preferences) {
                        localStorage.setItem('fifa-tracker-preferences', JSON.stringify(localData.preferences));
                    }
                    
                    if (localData.appState) {
                        localStorage.setItem('fifa-tracker-app-state', JSON.stringify(localData.appState));
                    }
                    
                    restoreLog.summary.local = Object.keys(localData).length;
                    
                } catch (error) {
                    console.error('Error restoring local data:', error);
                    restoreLog.errors.push({
                        type: 'local',
                        error: error.message
                    });
                }
            }

            restoreLog.completed = new Date().toISOString();
            
            const { ErrorHandler } = await import('./utils.js');
            
            if (restoreLog.errors.length === 0) {
                console.log('✅ Data restore completed successfully');
                ErrorHandler.showSuccessMessage(
                    dryRun ? 
                    'Backup-Validierung erfolgreich - Restore kann durchgeführt werden' :
                    'Daten erfolgreich wiederhergestellt'
                );
            } else {
                console.warn('⚠️ Data restore completed with errors');
                ErrorHandler.showUserError(
                    `Restore abgeschlossen mit ${restoreLog.errors.length} Fehlern. Siehe Konsole für Details.`,
                    'warning'
                );
            }

            return restoreLog;
            
        } catch (error) {
            console.error('❌ Error during restore:', error);
            const { ErrorHandler } = await import('./utils.js');
            ErrorHandler.showUserError(`Fehler beim Wiederherstellen: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Validate backup format and integrity
     */
    validateBackup(backupData) {
        const errors = [];
        
        // Check basic structure
        if (!backupData || typeof backupData !== 'object') {
            errors.push('Backup data is not a valid object');
            return { valid: false, errors };
        }
        
        if (!backupData.data) {
            errors.push('Missing data section');
        }
        
        if (!backupData.metadata) {
            errors.push('Missing metadata section');
        }
        
        // Check version compatibility
        if (backupData.metadata?.version && !this.isVersionCompatible(backupData.metadata.version)) {
            errors.push(`Incompatible backup version: ${backupData.metadata.version}`);
        }
        
        // Check data types
        const expectedTypes = ['players', 'matches', 'bans', 'finances', 'transactions', 'spieler_des_spiels'];
        const missingTypes = expectedTypes.filter(type => !backupData.data[type]);
        
        if (missingTypes.length > 0) {
            console.warn('Missing data types:', missingTypes);
        }
        
        // Validate data structure for each type
        for (const [type, data] of Object.entries(backupData.data)) {
            if (type === 'local') continue;
            
            if (!Array.isArray(data)) {
                errors.push(`Data type '${type}' is not an array`);
            }
        }
        
        return {
            valid: errors.length === 0,
            errors,
            warnings: missingTypes.length > 0 ? [`Missing data types: ${missingTypes.join(', ')}`] : []
        };
    }

    /**
     * Check version compatibility
     */
    isVersionCompatible(version) {
        const currentVersion = '2.0';
        const supportedVersions = ['1.0', '2.0'];
        return supportedVersions.includes(version);
    }

    /**
     * Compress data using simple compression
     */
    async compressData(data) {
        // Simple compression for now - in production you might use a library like pako
        try {
            // For now, just minify JSON
            return JSON.stringify(JSON.parse(data));
        } catch (error) {
            console.warn('Compression failed, returning original data');
            return data;
        }
    }

    /**
     * Set up automatic backups
     */
    setupAutoBackup(intervalMinutes = 60) {
        if (this.autoBackupInterval) {
            clearInterval(this.autoBackupInterval);
        }

        this.autoBackupInterval = setInterval(async () => {
            try {
                console.log('📦 Creating automatic backup...');
                const backup = await this.createFullBackup();
                
                // Store in localStorage for quick recovery
                this.storeLocalBackup(backup);
                
                console.log('✅ Automatic backup completed');
            } catch (error) {
                console.error('❌ Automatic backup failed:', error);
            }
        }, intervalMinutes * 60 * 1000);

        this.autoBackupEnabled = true;
        console.log(`🔄 Auto-backup enabled (every ${intervalMinutes} minutes)`);
    }

    /**
     * Store backup in localStorage
     */
    storeLocalBackup(backup) {
        try {
            const localBackup = {
                ...backup,
                stored: new Date().toISOString()
            };
            
            localStorage.setItem('fifa-tracker-auto-backup', JSON.stringify(localBackup));
        } catch (error) {
            console.warn('Could not store local backup:', error);
        }
    }

    /**
     * Get stored local backup
     */
    getLocalBackup() {
        try {
            const stored = localStorage.getItem('fifa-tracker-auto-backup');
            return stored ? JSON.parse(stored) : null;
        } catch (error) {
            console.warn('Could not retrieve local backup:', error);
            return null;
        }
    }

    /**
     * Add backup to history
     */
    addToBackupHistory(metadata) {
        this.backupHistory.unshift({
            ...metadata,
            size: JSON.stringify(metadata).length
        });

        // Limit history size
        if (this.backupHistory.length > this.maxBackupHistory) {
            this.backupHistory = this.backupHistory.slice(0, this.maxBackupHistory);
        }

        // Save to localStorage
        try {
            localStorage.setItem('fifa-tracker-backup-history', JSON.stringify(this.backupHistory));
        } catch (error) {
            console.warn('Could not save backup history:', error);
        }
    }

    /**
     * Load backup history
     */
    loadBackupHistory() {
        try {
            const stored = localStorage.getItem('fifa-tracker-backup-history');
            if (stored) {
                this.backupHistory = JSON.parse(stored);
            }
        } catch (error) {
            console.warn('Could not load backup history:', error);
            this.backupHistory = [];
        }
    }

    /**
     * Show backup/restore UI
     */
    async showBackupRestoreModal() {
        const modalContent = `
        <div class="p-6">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl font-bold text-gray-100 flex items-center">
                    <i class="fas fa-archive mr-3 text-green-400"></i>
                    Backup & Wiederherstellung
                </h3>
                <button onclick="hideModal()" class="text-gray-400 hover:text-gray-200 text-xl">×</button>
            </div>
            
            <!-- Backup Section -->
            <div class="mb-8">
                <h4 class="text-lg font-semibold text-gray-200 mb-4 flex items-center">
                    <i class="fas fa-download mr-2 text-blue-400"></i>
                    Backup erstellen
                </h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button onclick="createFullBackup()" class="btn btn-primary">
                        <i class="fas fa-database mr-2"></i>
                        Vollständiges Backup
                    </button>
                    <button onclick="createSelectiveBackup()" class="btn btn-secondary">
                        <i class="fas fa-list mr-2"></i>
                        Selektives Backup
                    </button>
                </div>
                <div class="mt-4 text-sm text-gray-400">
                    <p>• Vollständiges Backup: Alle Daten und lokalen Einstellungen</p>
                    <p>• Selektives Backup: Nur ausgewählte Datentypen</p>
                </div>
            </div>

            <!-- Restore Section -->
            <div class="mb-8">
                <h4 class="text-lg font-semibold text-gray-200 mb-4 flex items-center">
                    <i class="fas fa-upload mr-2 text-yellow-400"></i>
                    Daten wiederherstellen
                </h4>
                <div class="space-y-4">
                    <div>
                        <input type="file" id="backup-file-input" accept=".json,.gz" class="hidden">
                        <button onclick="document.getElementById('backup-file-input').click()" class="btn btn-secondary">
                            <i class="fas fa-file-upload mr-2"></i>
                            Backup-Datei auswählen
                        </button>
                    </div>
                    <div class="flex items-center space-x-4">
                        <label class="flex items-center space-x-2">
                            <input type="checkbox" id="replace-existing" class="form-checkbox">
                            <span class="text-sm text-gray-300">Bestehende Daten ersetzen</span>
                        </label>
                        <label class="flex items-center space-x-2">
                            <input type="checkbox" id="restore-local" checked class="form-checkbox">
                            <span class="text-sm text-gray-300">Lokale Einstellungen wiederherstellen</span>
                        </label>
                    </div>
                    <button onclick="validateBackupFile()" class="btn btn-info btn-sm">
                        <i class="fas fa-check-circle mr-2"></i>
                        Backup validieren (Dry Run)
                    </button>
                </div>
            </div>

            <!-- Auto-Backup Section -->
            <div class="mb-6">
                <h4 class="text-lg font-semibold text-gray-200 mb-4 flex items-center">
                    <i class="fas fa-clock mr-2 text-purple-400"></i>
                    Automatisches Backup
                </h4>
                <div class="flex items-center space-x-4">
                    <label class="flex items-center space-x-2">
                        <input type="checkbox" id="auto-backup-enabled" class="form-checkbox">
                        <span class="text-sm text-gray-300">Auto-Backup aktivieren</span>
                    </label>
                    <select id="auto-backup-interval" class="form-select">
                        <option value="30">Alle 30 Minuten</option>
                        <option value="60" selected>Alle 60 Minuten</option>
                        <option value="120">Alle 2 Stunden</option>
                        <option value="360">Alle 6 Stunden</option>
                    </select>
                </div>
            </div>

            <!-- Backup History -->
            <div>
                <h4 class="text-lg font-semibold text-gray-200 mb-4 flex items-center">
                    <i class="fas fa-history mr-2 text-orange-400"></i>
                    Backup-Verlauf
                </h4>
                <div id="backup-history" class="max-h-48 overflow-y-auto">
                    ${this.renderBackupHistory()}
                </div>
            </div>
        </div>
        `;

        const { showModal } = await import('./modal.js');
        showModal(modalContent, { size: 'xl' });

        // Setup file input handler
        setTimeout(() => {
            const fileInput = document.getElementById('backup-file-input');
            if (fileInput) {
                fileInput.addEventListener('change', this.handleFileSelect.bind(this));
            }

            // Setup auto-backup controls
            const autoBackupCheckbox = document.getElementById('auto-backup-enabled');
            const intervalSelect = document.getElementById('auto-backup-interval');
            
            if (autoBackupCheckbox) {
                autoBackupCheckbox.checked = this.autoBackupEnabled;
                autoBackupCheckbox.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        const interval = parseInt(intervalSelect.value);
                        this.setupAutoBackup(interval);
                    } else {
                        this.disableAutoBackup();
                    }
                });
            }
        }, 100);
    }

    /**
     * Handle file selection for restore
     */
    async handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const backupData = JSON.parse(text);
            
            // Store for restore operations
            this.selectedBackupData = backupData;
            
            // Validate and show info
            const validation = this.validateBackup(backupData);
            const { ErrorHandler } = await import('./utils.js');
            
            if (validation.valid) {
                ErrorHandler.showSuccessMessage(`Backup-Datei erfolgreich geladen: ${file.name}`);
                
                // Show backup info
                if (backupData.metadata) {
                    console.log('Backup Info:', backupData.metadata);
                }
            } else {
                ErrorHandler.showUserError(`Ungültige Backup-Datei: ${validation.errors.join(', ')}`, 'error');
            }
            
        } catch (error) {
            console.error('Error reading backup file:', error);
            const { ErrorHandler } = await import('./utils.js');
            ErrorHandler.showUserError('Fehler beim Lesen der Backup-Datei', 'error');
        }
    }

    /**
     * Render backup history
     */
    renderBackupHistory() {
        if (this.backupHistory.length === 0) {
            return '<div class="text-gray-400 text-sm text-center py-4">Keine Backups im Verlauf</div>';
        }

        return this.backupHistory.map(backup => `
            <div class="p-3 bg-slate-800 rounded-lg mb-2">
                <div class="flex justify-between items-start">
                    <div>
                        <div class="font-medium text-gray-200">${backup.description || 'Backup'}</div>
                        <div class="text-sm text-gray-400">${new Date(backup.created).toLocaleString('de-DE')}</div>
                        <div class="text-xs text-gray-500">
                            ${backup.recordCounts ? Object.entries(backup.recordCounts).map(([key, count]) => `${key}: ${count}`).join(' • ') : ''}
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-xs text-gray-400">${(backup.size / 1024).toFixed(1)} KB</div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Disable auto-backup
     */
    disableAutoBackup() {
        if (this.autoBackupInterval) {
            clearInterval(this.autoBackupInterval);
            this.autoBackupInterval = null;
        }
        this.autoBackupEnabled = false;
        console.log('🔄 Auto-backup disabled');
    }

    /**
     * Cleanup on destroy
     */
    destroy() {
        this.disableAutoBackup();
    }
}

// Global functions for modal buttons
window.createFullBackup = async function() {
    if (window.backupRestoreSystem) {
        try {
            const backup = await window.backupRestoreSystem.createFullBackup();
            await window.backupRestoreSystem.downloadBackup(backup);
        } catch (error) {
            console.error('Error creating full backup:', error);
        }
    }
};

window.createSelectiveBackup = async function() {
    // For now, create a backup with just players and matches
    // In a full implementation, you'd show a selection UI
    if (window.backupRestoreSystem) {
        try {
            const backup = await window.backupRestoreSystem.createSelectiveBackup(['players', 'matches']);
            await window.backupRestoreSystem.downloadBackup(backup, 'fifa-tracker-selective-backup.json');
        } catch (error) {
            console.error('Error creating selective backup:', error);
        }
    }
};

window.validateBackupFile = async function() {
    if (window.backupRestoreSystem && window.backupRestoreSystem.selectedBackupData) {
        try {
            const restoreLog = await window.backupRestoreSystem.restoreFromBackup(
                window.backupRestoreSystem.selectedBackupData,
                { dryRun: true }
            );
            console.log('Validation result:', restoreLog);
        } catch (error) {
            console.error('Error validating backup:', error);
        }
    } else {
        const { ErrorHandler } = await import('./utils.js');
        ErrorHandler.showUserError('Bitte wählen Sie zuerst eine Backup-Datei aus', 'warning');
    }
};

// Export the backup/restore system
export const backupRestoreSystem = new BackupRestoreSystem();