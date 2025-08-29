/**
 * Performance Monitoring Dashboard
 * Monitors and displays application performance metrics
 */

class PerformanceMonitor {
    constructor() {
        this.metrics = {
            pageLoad: {},
            database: {},
            memory: {},
            network: {},
            userInteraction: {}
        };
        this.startTime = performance.now();
        this.observers = new Map();
        this.enabled = true;
        this.reportInterval = 60000; // 1 minute
        this.maxEntries = 100;
        this.init();
    }

    /**
     * Initialize performance monitoring
     */
    init() {
        if (!this.enabled) return;

        // Monitor page load performance
        this.initPageLoadMonitoring();
        
        // Monitor database operations
        this.initDatabaseMonitoring();
        
        // Monitor memory usage
        this.initMemoryMonitoring();
        
        // Monitor network requests
        this.initNetworkMonitoring();
        
        // Monitor user interactions
        this.initUserInteractionMonitoring();
        
        // Start periodic reporting
        this.startPeriodicReporting();
        
        console.log('📊 Performance monitoring initialized');
    }

    /**
     * Monitor page load performance
     */
    initPageLoadMonitoring() {
        if (typeof window === 'undefined') return;

        // Use Performance Observer for detailed metrics
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.recordPageLoadMetric(entry);
                }
            });

            observer.observe({ entryTypes: ['navigation', 'paint', 'largest-contentful-paint'] });
            this.observers.set('pageLoad', observer);
        }

        // Fallback to performance.timing
        window.addEventListener('load', () => {
            this.recordBasicPageMetrics();
        });
    }

    /**
     * Record page load metrics
     */
    recordPageLoadMetric(entry) {
        const timestamp = Date.now();
        
        switch (entry.entryType) {
            case 'navigation':
                this.metrics.pageLoad = {
                    ...this.metrics.pageLoad,
                    domContentLoaded: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
                    loadComplete: entry.loadEventEnd - entry.loadEventStart,
                    domInteractive: entry.domInteractive - entry.domLoading,
                    timestamp
                };
                break;
                
            case 'paint':
                if (entry.name === 'first-paint') {
                    this.metrics.pageLoad.firstPaint = entry.startTime;
                } else if (entry.name === 'first-contentful-paint') {
                    this.metrics.pageLoad.firstContentfulPaint = entry.startTime;
                }
                break;
                
            case 'largest-contentful-paint':
                this.metrics.pageLoad.largestContentfulPaint = entry.startTime;
                break;
        }
    }

    /**
     * Record basic page metrics as fallback
     */
    recordBasicPageMetrics() {
        if (typeof performance === 'undefined' || !performance.timing) return;

        const timing = performance.timing;
        const navigation = performance.navigation;

        this.metrics.pageLoad = {
            ...this.metrics.pageLoad,
            navigationStart: timing.navigationStart,
            domContentLoaded: timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart,
            loadComplete: timing.loadEventEnd - timing.loadEventStart,
            domInteractive: timing.domInteractive - timing.domLoading,
            navigationType: navigation.type,
            redirectCount: navigation.redirectCount,
            timestamp: Date.now()
        };
    }

    /**
     * Monitor database operations
     */
    initDatabaseMonitoring() {
        // Track database operation performance
        this.metrics.database = {
            operations: [],
            totalTime: 0,
            errorCount: 0,
            successCount: 0
        };
    }

    /**
     * Record database operation
     */
    recordDatabaseOperation(operation, duration, success = true, error = null) {
        const timestamp = Date.now();
        const entry = {
            operation,
            duration,
            success,
            error: error ? error.message : null,
            timestamp
        };

        this.metrics.database.operations.push(entry);
        this.metrics.database.totalTime += duration;
        
        if (success) {
            this.metrics.database.successCount++;
        } else {
            this.metrics.database.errorCount++;
        }

        // Limit stored operations
        if (this.metrics.database.operations.length > this.maxEntries) {
            this.metrics.database.operations = this.metrics.database.operations.slice(-this.maxEntries);
        }
    }

    /**
     * Monitor memory usage
     */
    initMemoryMonitoring() {
        if (typeof window === 'undefined' || !('memory' in performance)) return;

        this.metrics.memory = {
            samples: [],
            peak: 0
        };

        // Sample memory usage periodically
        setInterval(() => {
            this.recordMemoryUsage();
        }, 30000); // Every 30 seconds
    }

    /**
     * Record memory usage
     */
    recordMemoryUsage() {
        if (typeof performance === 'undefined' || !performance.memory) return;

        const memory = performance.memory;
        const timestamp = Date.now();
        
        const sample = {
            used: memory.usedJSHeapSize,
            total: memory.totalJSHeapSize,
            limit: memory.jsHeapSizeLimit,
            timestamp
        };

        this.metrics.memory.samples.push(sample);
        this.metrics.memory.peak = Math.max(this.metrics.memory.peak, sample.used);

        // Limit stored samples
        if (this.metrics.memory.samples.length > this.maxEntries) {
            this.metrics.memory.samples = this.metrics.memory.samples.slice(-this.maxEntries);
        }
    }

    /**
     * Monitor network requests
     */
    initNetworkMonitoring() {
        if (typeof window === 'undefined') return;

        this.metrics.network = {
            requests: [],
            totalTime: 0,
            errorCount: 0,
            successCount: 0
        };

        // Monitor fetch requests
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const startTime = performance.now();
            const url = args[0];
            
            try {
                const response = await originalFetch(...args);
                const endTime = performance.now();
                const duration = endTime - startTime;
                
                this.recordNetworkRequest(url, duration, response.ok, response.status);
                return response;
            } catch (error) {
                const endTime = performance.now();
                const duration = endTime - startTime;
                
                this.recordNetworkRequest(url, duration, false, 0, error);
                throw error;
            }
        };
    }

    /**
     * Record network request
     */
    recordNetworkRequest(url, duration, success, status, error = null) {
        const timestamp = Date.now();
        const entry = {
            url: typeof url === 'string' ? url : url.toString(),
            duration,
            success,
            status,
            error: error ? error.message : null,
            timestamp
        };

        this.metrics.network.requests.push(entry);
        this.metrics.network.totalTime += duration;
        
        if (success) {
            this.metrics.network.successCount++;
        } else {
            this.metrics.network.errorCount++;
        }

        // Limit stored requests
        if (this.metrics.network.requests.length > this.maxEntries) {
            this.metrics.network.requests = this.metrics.network.requests.slice(-this.maxEntries);
        }
    }

    /**
     * Monitor user interactions
     */
    initUserInteractionMonitoring() {
        if (typeof window === 'undefined') return;

        this.metrics.userInteraction = {
            clicks: 0,
            scrolls: 0,
            keystrokes: 0,
            tabSwitches: 0,
            lastActivity: Date.now(),
            sessionDuration: 0
        };

        // Monitor various user interactions
        ['click', 'scroll', 'keydown', 'visibilitychange'].forEach(event => {
            document.addEventListener(event, (e) => {
                this.recordUserInteraction(e.type);
            });
        });

        // Update session duration
        setInterval(() => {
            this.metrics.userInteraction.sessionDuration = Date.now() - this.startTime;
        }, 1000);
    }

    /**
     * Record user interaction
     */
    recordUserInteraction(type) {
        this.metrics.userInteraction.lastActivity = Date.now();
        
        switch (type) {
            case 'click':
                this.metrics.userInteraction.clicks++;
                break;
            case 'scroll':
                this.metrics.userInteraction.scrolls++;
                break;
            case 'keydown':
                this.metrics.userInteraction.keystrokes++;
                break;
            case 'visibilitychange':
                if (document.hidden) {
                    this.metrics.userInteraction.tabSwitches++;
                }
                break;
        }
    }

    /**
     * Get performance summary
     */
    getPerformanceSummary() {
        const now = Date.now();
        const sessionDuration = now - this.startTime;

        return {
            sessionDuration,
            pageLoad: this.getPageLoadSummary(),
            database: this.getDatabaseSummary(),
            memory: this.getMemorySummary(),
            network: this.getNetworkSummary(),
            userInteraction: this.getUserInteractionSummary(),
            timestamp: now
        };
    }

    /**
     * Get page load summary
     */
    getPageLoadSummary() {
        return {
            firstPaint: this.metrics.pageLoad.firstPaint || 0,
            firstContentfulPaint: this.metrics.pageLoad.firstContentfulPaint || 0,
            largestContentfulPaint: this.metrics.pageLoad.largestContentfulPaint || 0,
            domContentLoaded: this.metrics.pageLoad.domContentLoaded || 0,
            loadComplete: this.metrics.pageLoad.loadComplete || 0
        };
    }

    /**
     * Get database summary
     */
    getDatabaseSummary() {
        const ops = this.metrics.database.operations;
        const recentOps = ops.filter(op => Date.now() - op.timestamp < 300000); // Last 5 minutes
        
        return {
            totalOperations: ops.length,
            recentOperations: recentOps.length,
            averageTime: ops.length > 0 ? this.metrics.database.totalTime / ops.length : 0,
            successRate: ops.length > 0 ? (this.metrics.database.successCount / ops.length) * 100 : 100,
            errorCount: this.metrics.database.errorCount
        };
    }

    /**
     * Get memory summary
     */
    getMemorySummary() {
        const samples = this.metrics.memory.samples;
        if (samples.length === 0) return { available: false };

        const latest = samples[samples.length - 1];
        const average = samples.reduce((sum, s) => sum + s.used, 0) / samples.length;

        return {
            current: latest.used,
            average,
            peak: this.metrics.memory.peak,
            limit: latest.limit,
            percentage: (latest.used / latest.limit) * 100
        };
    }

    /**
     * Get network summary
     */
    getNetworkSummary() {
        const requests = this.metrics.network.requests;
        const recentRequests = requests.filter(req => Date.now() - req.timestamp < 300000); // Last 5 minutes

        return {
            totalRequests: requests.length,
            recentRequests: recentRequests.length,
            averageTime: requests.length > 0 ? this.metrics.network.totalTime / requests.length : 0,
            successRate: requests.length > 0 ? (this.metrics.network.successCount / requests.length) * 100 : 100,
            errorCount: this.metrics.network.errorCount
        };
    }

    /**
     * Get user interaction summary
     */
    getUserInteractionSummary() {
        return {
            ...this.metrics.userInteraction,
            activityLevel: this.calculateActivityLevel()
        };
    }

    /**
     * Calculate user activity level
     */
    calculateActivityLevel() {
        const timeSinceLastActivity = Date.now() - this.metrics.userInteraction.lastActivity;
        const sessionDuration = Date.now() - this.startTime;
        
        if (timeSinceLastActivity > 300000) return 'inactive'; // 5 minutes
        if (timeSinceLastActivity > 60000) return 'low'; // 1 minute
        
        const totalInteractions = this.metrics.userInteraction.clicks + 
                                 this.metrics.userInteraction.scrolls + 
                                 this.metrics.userInteraction.keystrokes;
        
        const interactionsPerMinute = (totalInteractions / (sessionDuration / 60000));
        
        if (interactionsPerMinute > 10) return 'high';
        if (interactionsPerMinute > 5) return 'medium';
        return 'low';
    }

    /**
     * Start periodic reporting
     */
    startPeriodicReporting() {
        setInterval(() => {
            this.generateReport();
        }, this.reportInterval);
    }

    /**
     * Generate performance report
     */
    generateReport() {
        const summary = this.getPerformanceSummary();
        
        // Log to console (in production, you might send to analytics service)
        console.group('📊 Performance Report');
        console.log('Session Duration:', this.formatDuration(summary.sessionDuration));
        console.log('Page Load Metrics:', summary.pageLoad);
        console.log('Database Performance:', summary.database);
        console.log('Memory Usage:', summary.memory);
        console.log('Network Performance:', summary.network);
        console.log('User Activity:', summary.userInteraction);
        console.groupEnd();

        // Check for performance issues
        this.checkPerformanceIssues(summary);
    }

    /**
     * Check for performance issues
     */
    checkPerformanceIssues(summary) {
        const issues = [];

        // Check page load performance
        if (summary.pageLoad.largestContentfulPaint > 2500) {
            issues.push({
                type: 'pageLoad',
                severity: 'warning',
                message: 'Largest Contentful Paint is slow (>2.5s)'
            });
        }

        // Check database performance
        if (summary.database.averageTime > 1000) {
            issues.push({
                type: 'database',
                severity: 'warning',
                message: 'Database operations are slow (>1s average)'
            });
        }

        if (summary.database.successRate < 95) {
            issues.push({
                type: 'database',
                severity: 'error',
                message: 'High database error rate (<95% success)'
            });
        }

        // Check memory usage
        if (summary.memory.available && summary.memory.percentage > 80) {
            issues.push({
                type: 'memory',
                severity: 'warning',
                message: 'High memory usage (>80% of limit)'
            });
        }

        // Check network performance
        if (summary.network.averageTime > 2000) {
            issues.push({
                type: 'network',
                severity: 'warning',
                message: 'Slow network requests (>2s average)'
            });
        }

        if (summary.network.successRate < 90) {
            issues.push({
                type: 'network',
                severity: 'error',
                message: 'High network error rate (<90% success)'
            });
        }

        // Report issues
        if (issues.length > 0) {
            console.warn('⚠️ Performance Issues Detected:', issues);
        }

        return issues;
    }

    /**
     * Show performance dashboard
     */
    async showPerformanceDashboard() {
        const summary = this.getPerformanceSummary();
        const issues = this.checkPerformanceIssues(summary);

        const modalContent = `
        <div class="p-6">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xl font-bold text-gray-100 flex items-center">
                    <i class="fas fa-tachometer-alt mr-3 text-green-400"></i>
                    Performance Dashboard
                </h3>
                <button onclick="hideModal()" class="text-gray-400 hover:text-gray-200 text-xl">×</button>
            </div>

            <!-- Performance Issues -->
            ${issues.length > 0 ? `
            <div class="mb-6">
                <h4 class="text-lg font-semibold text-red-400 mb-3 flex items-center">
                    <i class="fas fa-exclamation-triangle mr-2"></i>
                    Performance Issues (${issues.length})
                </h4>
                <div class="space-y-2">
                    ${issues.map(issue => `
                        <div class="p-3 rounded-lg border-l-4 ${issue.severity === 'error' ? 'bg-red-900/20 border-red-500' : 'bg-yellow-900/20 border-yellow-500'}">
                            <div class="flex items-center">
                                <i class="fas ${issue.severity === 'error' ? 'fa-times-circle text-red-400' : 'fa-exclamation-triangle text-yellow-400'} mr-2"></i>
                                <span class="text-sm">${issue.message}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            <!-- Metrics Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                <!-- Session Info -->
                <div class="bg-slate-800 rounded-lg p-4">
                    <h5 class="font-semibold text-gray-200 mb-3 flex items-center">
                        <i class="fas fa-clock mr-2 text-blue-400"></i>
                        Session
                    </h5>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between">
                            <span class="text-gray-400">Dauer:</span>
                            <span class="text-white">${this.formatDuration(summary.sessionDuration)}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Aktivität:</span>
                            <span class="text-white capitalize ${this.getActivityColor(summary.userInteraction.activityLevel)}">${summary.userInteraction.activityLevel}</span>
                        </div>
                    </div>
                </div>

                <!-- Page Load -->
                <div class="bg-slate-800 rounded-lg p-4">
                    <h5 class="font-semibold text-gray-200 mb-3 flex items-center">
                        <i class="fas fa-bolt mr-2 text-yellow-400"></i>
                        Page Load
                    </h5>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between">
                            <span class="text-gray-400">First Paint:</span>
                            <span class="text-white">${Math.round(summary.pageLoad.firstPaint)}ms</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">LCP:</span>
                            <span class="text-white">${Math.round(summary.pageLoad.largestContentfulPaint)}ms</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">DOM Ready:</span>
                            <span class="text-white">${Math.round(summary.pageLoad.domContentLoaded)}ms</span>
                        </div>
                    </div>
                </div>

                <!-- Database -->
                <div class="bg-slate-800 rounded-lg p-4">
                    <h5 class="font-semibold text-gray-200 mb-3 flex items-center">
                        <i class="fas fa-database mr-2 text-green-400"></i>
                        Database
                    </h5>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between">
                            <span class="text-gray-400">Operationen:</span>
                            <span class="text-white">${summary.database.totalOperations}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Ø Zeit:</span>
                            <span class="text-white">${Math.round(summary.database.averageTime)}ms</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Erfolgsrate:</span>
                            <span class="text-white">${summary.database.successRate.toFixed(1)}%</span>
                        </div>
                    </div>
                </div>

                <!-- Memory -->
                <div class="bg-slate-800 rounded-lg p-4">
                    <h5 class="font-semibold text-gray-200 mb-3 flex items-center">
                        <i class="fas fa-memory mr-2 text-purple-400"></i>
                        Memory
                    </h5>
                    ${summary.memory.available ? `
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span class="text-gray-400">Aktuell:</span>
                                <span class="text-white">${this.formatBytes(summary.memory.current)}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-400">Peak:</span>
                                <span class="text-white">${this.formatBytes(summary.memory.peak)}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-400">Nutzung:</span>
                                <span class="text-white">${summary.memory.percentage.toFixed(1)}%</span>
                            </div>
                        </div>
                    ` : `
                        <div class="text-sm text-gray-400">Memory API nicht verfügbar</div>
                    `}
                </div>

                <!-- Network -->
                <div class="bg-slate-800 rounded-lg p-4">
                    <h5 class="font-semibold text-gray-200 mb-3 flex items-center">
                        <i class="fas fa-wifi mr-2 text-cyan-400"></i>
                        Network
                    </h5>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between">
                            <span class="text-gray-400">Requests:</span>
                            <span class="text-white">${summary.network.totalRequests}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Ø Zeit:</span>
                            <span class="text-white">${Math.round(summary.network.averageTime)}ms</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Erfolgsrate:</span>
                            <span class="text-white">${summary.network.successRate.toFixed(1)}%</span>
                        </div>
                    </div>
                </div>

                <!-- User Interaction -->
                <div class="bg-slate-800 rounded-lg p-4">
                    <h5 class="font-semibold text-gray-200 mb-3 flex items-center">
                        <i class="fas fa-mouse-pointer mr-2 text-orange-400"></i>
                        Interaktionen
                    </h5>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between">
                            <span class="text-gray-400">Klicks:</span>
                            <span class="text-white">${summary.userInteraction.clicks}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Scrollen:</span>
                            <span class="text-white">${summary.userInteraction.scrolls}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-400">Tasten:</span>
                            <span class="text-white">${summary.userInteraction.keystrokes}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Actions -->
            <div class="mt-6 flex justify-between items-center">
                <div class="flex space-x-2">
                    <button onclick="exportPerformanceData()" class="btn btn-secondary btn-sm">
                        <i class="fas fa-download mr-1"></i>
                        Export Data
                    </button>
                    <button onclick="clearPerformanceData()" class="btn btn-danger btn-sm">
                        <i class="fas fa-trash mr-1"></i>
                        Reset Metrics
                    </button>
                </div>
                <button onclick="refreshPerformanceDashboard()" class="btn btn-primary btn-sm">
                    <i class="fas fa-sync mr-1"></i>
                    Refresh
                </button>
            </div>
        </div>
        `;

        const { showModal } = await import('./modal.js');
        showModal(modalContent, { size: 'xl' });
    }

    /**
     * Format duration in milliseconds to human readable
     */
    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    /**
     * Format bytes to human readable
     */
    formatBytes(bytes) {
        const sizes = ['B', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 B';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${sizes[i]}`;
    }

    /**
     * Get color class for activity level
     */
    getActivityColor(level) {
        switch (level) {
            case 'high': return 'text-green-400';
            case 'medium': return 'text-yellow-400';
            case 'low': return 'text-orange-400';
            case 'inactive': return 'text-red-400';
            default: return 'text-gray-400';
        }
    }

    /**
     * Clear all performance data
     */
    clearMetrics() {
        this.metrics = {
            pageLoad: {},
            database: { operations: [], totalTime: 0, errorCount: 0, successCount: 0 },
            memory: { samples: [], peak: 0 },
            network: { requests: [], totalTime: 0, errorCount: 0, successCount: 0 },
            userInteraction: { clicks: 0, scrolls: 0, keystrokes: 0, tabSwitches: 0, lastActivity: Date.now(), sessionDuration: 0 }
        };
        this.startTime = performance.now();
        console.log('📊 Performance metrics cleared');
    }

    /**
     * Export performance data
     */
    exportData() {
        const data = {
            summary: this.getPerformanceSummary(),
            rawMetrics: this.metrics,
            exported: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `fifa-tracker-performance-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /**
     * Disable monitoring
     */
    disable() {
        this.enabled = false;
        
        // Disconnect observers
        for (const observer of this.observers.values()) {
            observer.disconnect();
        }
        this.observers.clear();
        
        console.log('📊 Performance monitoring disabled');
    }
}

// Global functions for modal
window.exportPerformanceData = function() {
    if (window.performanceMonitor) {
        window.performanceMonitor.exportData();
    }
};

window.clearPerformanceData = function() {
    if (window.performanceMonitor) {
        window.performanceMonitor.clearMetrics();
    }
};

window.refreshPerformanceDashboard = async function() {
    if (window.performanceMonitor) {
        await window.performanceMonitor.showPerformanceDashboard();
    }
};

// Export the performance monitor
export const performanceMonitor = new PerformanceMonitor();