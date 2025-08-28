/**
 * Utility Functions
 * Common helper functions for the application
 */

// Configuration
const DEBUG_MODE = true; // Set to false for production

// Debug utilities for better console management
export class Debug {
    static log(...args) {
        if (DEBUG_MODE) console.log(...args);
    }
    
    static warn(...args) {
        if (DEBUG_MODE) console.warn(...args);
    }
    
    static error(...args) {
        console.error(...args); // Always show errors
    }
    
    static info(...args) {
        if (DEBUG_MODE) console.info(...args);
    }
}

// DOM Utility Functions
export const DOM = {
    // Safe element selection with enhanced debugging
    getElementById(id) {
        const element = document.getElementById(id);
        if (!element) {
            // Only warn in development or if explicitly requested
            if (window.location.hostname === 'localhost' || window.debugMode) {
                console.warn(`Element with id '${id}' not found. Current page tab: ${window.currentTab || 'unknown'}`);
            }
        }
        return element;
    },

    // Safe element creation with error handling
    createElement(tag, attributes = {}, children = []) {
        try {
            const element = document.createElement(tag);
            
            Object.entries(attributes).forEach(([key, value]) => {
                if (key === 'textContent') {
                    element.textContent = value;
                } else if (key === 'innerHTML') {
                    element.innerHTML = value;
                } else {
                    element.setAttribute(key, value);
                }
            });

            children.forEach(child => {
                if (typeof child === 'string') {
                    element.appendChild(document.createTextNode(child));
                } else if (child instanceof Element) {
                    element.appendChild(child);
                }
            });

            return element;
        } catch (error) {
            console.error('Error creating element:', error);
            return document.createElement('div'); // Fallback
        }
    },

    // Debounced event listener
    addDebouncedListener(element, event, handler, delay = 300) {
        let timeoutId;
        const debouncedHandler = (e) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => handler(e), delay);
        };
        
        element.addEventListener(event, debouncedHandler);
        
        // Return cleanup function
        return () => {
            clearTimeout(timeoutId);
            element.removeEventListener(event, debouncedHandler);
        };
    },

    // Safe innerHTML with sanitization
    setSafeHTML(element, html) {
        if (!element) return;
        
        // Basic XSS prevention
        const sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        element.innerHTML = sanitized;
    }
};

// Loading State Management
export class LoadingManager {
    constructor() {
        this.loadingStates = new Set();
        this.loadingIndicators = new Map();
    }

    show(key, element = null, message = 'Lädt...') {
        this.loadingStates.add(key);
        
        if (element) {
            const indicator = this.createLoadingIndicator(message);
            this.loadingIndicators.set(key, { element, indicator, originalContent: element.innerHTML });
            element.innerHTML = '';
            element.appendChild(indicator);
        }

        this.updateGlobalLoadingState();
    }

    hide(key) {
        this.loadingStates.delete(key);
        
        if (this.loadingIndicators.has(key)) {
            const { element, originalContent } = this.loadingIndicators.get(key);
            element.innerHTML = originalContent;
            this.loadingIndicators.delete(key);
        }

        this.updateGlobalLoadingState();
    }

    createLoadingIndicator(message) {
        const indicator = document.createElement('div');
        indicator.className = 'flex items-center justify-center py-4';
        indicator.innerHTML = `
            <div class="flex items-center space-x-2">
                <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span class="text-sm text-gray-600">${message}</span>
            </div>
        `;
        return indicator;
    }

    updateGlobalLoadingState() {
        const hasLoading = this.loadingStates.size > 0;
        document.body.classList.toggle('loading', hasLoading);
    }

    isLoading(key = null) {
        return key ? this.loadingStates.has(key) : this.loadingStates.size > 0;
    }
}

// Error Handling Utilities
export class ErrorHandler {
    static showUserError(message, type = 'error') {
        console.error('User Error:', message);
        
        // Create or update error notification
        let notification = document.getElementById('error-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'error-notification';
            notification.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full mx-4';
            document.body.appendChild(notification);
        }

        const colorClasses = {
            error: 'bg-red-500 text-white',
            warning: 'bg-yellow-500 text-white',
            info: 'bg-blue-500 text-white',
            success: 'bg-green-500 text-white'
        };

        notification.innerHTML = `
            <div class="rounded-lg p-4 shadow-lg ${colorClasses[type] || colorClasses.error}">
                <div class="flex items-center justify-between">
                    <div class="flex items-center">
                        <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : type === 'success' ? 'check-circle' : 'info-circle'} mr-2"></i>
                        <span>${message}</span>
                    </div>
                    <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-white hover:text-gray-200">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;

        // Auto-remove after 5 seconds for error/warning, 3 seconds for success
        const autoRemoveTime = type === 'success' ? 3000 : 5000;
        setTimeout(() => {
            if (notification && notification.parentElement) {
                notification.remove();
            }
        }, autoRemoveTime);
    }

    static showSuccessMessage(message) {
        this.showUserError(message, 'success');
    }

    static handleDatabaseError(error, operation = 'Database operation') {
        console.error(`${operation} failed:`, error);
        
        let userMessage = 'Ein unerwarteter Fehler ist aufgetreten.';
        let errorType = 'error';
        
        if (error.message) {
            const message = error.message.toLowerCase();
            
            if (error.message.includes('nicht verfügbar')) {
                // Fallback service message - show as-is since it's already user-friendly
                userMessage = error.message;
                errorType = 'warning';
            } else if (message.includes('auth') || message.includes('unauthorized') || message.includes('forbidden')) {
                userMessage = 'Authentifizierungsfehler. Bitte melden Sie sich erneut an.';
            } else if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
                userMessage = 'Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.';
            } else if (message.includes('constraint') || message.includes('duplicate') || message.includes('unique')) {
                userMessage = 'Diese Daten existieren bereits oder verletzen Datenbankregeln.';
            } else if (message.includes('validierung') || error.message.includes('Validierungsfehler')) {
                userMessage = error.message;
                errorType = 'warning';
            } else if (message.includes('cdn') || message.includes('blocked')) {
                userMessage = 'CDN blockiert - Anwendung läuft im Demo-Modus.';
                errorType = 'info';
            } else if (message.includes('session') || message.includes('token')) {
                userMessage = 'Session abgelaufen. Bitte melden Sie sich erneut an.';
            } else if (message.includes('permission') || message.includes('denied')) {
                userMessage = 'Keine Berechtigung für diese Aktion.';
            } else if (message.includes('not found') || message.includes('404')) {
                userMessage = 'Die angeforderten Daten wurden nicht gefunden.';
                errorType = 'warning';
            } else if (message.includes('server') || message.includes('500') || message.includes('503')) {
                userMessage = 'Server temporär nicht verfügbar. Bitte versuchen Sie es später erneut.';
            } else if (message.includes('offline')) {
                userMessage = 'Keine Internetverbindung. Funktionen sind eingeschränkt.';
                errorType = 'warning';
            }
        }

        // Add context about current connection state
        if (typeof window !== 'undefined' && window.connectionMonitor) {
            const status = window.connectionMonitor.getStatus();
            if (!status.connected) {
                if (status.connectionType === 'fallback') {
                    userMessage += ' (Demo-Modus aktiv)';
                    errorType = 'info';
                } else if (status.connectionType === 'offline') {
                    userMessage += ' (Offline)';
                }
            }
        }

        this.showUserError(userMessage, errorType);
        return userMessage;
    }

    static async withErrorHandling(operation, errorMessage = 'Operation fehlgeschlagen') {
        try {
            return await operation();
        } catch (error) {
            this.handleDatabaseError(error, errorMessage);
            throw error;
        }
    }
}

// Form Validation Utilities
export const FormValidator = {
    validateRequired(value, fieldName) {
        if (!value || value.toString().trim() === '') {
            throw new Error(`${fieldName} ist erforderlich`);
        }
        return true;
    },

    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new Error('Ungültige E-Mail-Adresse');
        }
        return true;
    },

    validateNumber(value, fieldName, min = null, max = null) {
        const num = parseFloat(value);
        if (isNaN(num)) {
            throw new Error(`${fieldName} muss eine gültige Zahl sein`);
        }
        if (min !== null && num < min) {
            throw new Error(`${fieldName} muss mindestens ${min} sein`);
        }
        if (max !== null && num > max) {
            throw new Error(`${fieldName} darf maximal ${max} sein`);
        }
        return num;
    },

    validateString(value, fieldName, minLength = 0, maxLength = 255) {
        if (typeof value !== 'string') {
            throw new Error(`${fieldName} muss ein Text sein`);
        }
        if (value.length < minLength) {
            throw new Error(`${fieldName} muss mindestens ${minLength} Zeichen haben`);
        }
        if (value.length > maxLength) {
            throw new Error(`${fieldName} darf maximal ${maxLength} Zeichen haben`);
        }
        return value.trim();
    },

    sanitizeInput(value) {
        if (typeof value !== 'string') return value;
        
        return value
            .trim()
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/[<>]/g, '');
    }
};

// Performance Utilities
export const Performance = {
    // Simple debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Simple throttle function  
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // Measure and log performance
    measurePerformance(operation, name = 'operation') {
        return async function(...args) {
            const start = performance.now();
            try {
                const result = await operation.apply(this, args);
                const end = performance.now();
                console.log(`${name} took ${(end - start).toFixed(2)}ms`);
                return result;
            } catch (error) {
                const end = performance.now();
                console.error(`${name} failed after ${(end - start).toFixed(2)}ms:`, error);
                throw error;
            }
        };
    }
};

// Date and Time Utilities
export const DateUtils = {
    formatDate(dateString, locale = 'de-DE') {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString(locale);
        } catch (error) {
            console.error('Date formatting error:', error);
            return dateString;
        }
    },

    formatDateTime(dateString, locale = 'de-DE') {
        try {
            const date = new Date(dateString);
            return date.toLocaleString(locale);
        } catch (error) {
            console.error('DateTime formatting error:', error);
            return dateString;
        }
    },

    isValidDate(dateString) {
        const date = new Date(dateString);
        return !isNaN(date.getTime());
    },

    getCurrentDateString() {
        return new Date().toISOString().split('T')[0];
    }
};

// Create singleton instances
export const loadingManager = new LoadingManager();

// Constants
export const POSITIONS = ["TH","LV","RV","IV","ZDM","ZM","ZOM","LM","RM","LF","RF","ST"];
export const TEAMS = ["AEK", "Real", "Ehemalige"];

// Event emitter for app-wide communication
export class EventEmitter {
    constructor() {
        this.events = {};
    }

    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    off(event, callback) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(cb => cb !== callback);
    }

    emit(event, data) {
        if (!this.events[event]) return;
        this.events[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event listener for '${event}':`, error);
            }
        });
    }
}

export const eventBus = new EventEmitter();

// Additional utility functions for common tasks
export const CommonUtils = {
    /**
     * Generate HTML for a form field with validation
     */
    createFormField(config) {
        const {
            type = 'text',
            name,
            label,
            placeholder = '',
            value = '',
            required = false,
            validation = null,
            helpText = '',
            options = [] // for select fields
        } = config;

        const requiredAttr = required ? 'required' : '';
        const fieldId = `field-${name}`;
        
        let inputHtml = '';
        if (type === 'select') {
            const optionsHtml = options.map(opt => 
                `<option value="${opt.value}" ${opt.value === value ? 'selected' : ''}>${opt.label}</option>`
            ).join('');
            inputHtml = `<select id="${fieldId}" name="${name}" class="form-input" ${requiredAttr}>${optionsHtml}</select>`;
        } else {
            inputHtml = `<input type="${type}" id="${fieldId}" name="${name}" class="form-input" placeholder="${placeholder}" value="${value}" ${requiredAttr}>`;
        }

        return `
            <div class="form-group">
                <label for="${fieldId}" class="form-label">${label}${required ? ' *' : ''}</label>
                ${inputHtml}
                ${helpText ? `<small class="form-help">${helpText}</small>` : ''}
            </div>
        `;
    },

    /**
     * Create a standardized data table
     */
    createDataTable(config) {
        const { headers, data, actions = [], emptyMessage = 'Keine Daten verfügbar' } = config;
        
        if (!data || data.length === 0) {
            return `<div class="text-center py-8 text-gray-500">${emptyMessage}</div>`;
        }

        const headerHtml = headers.map(h => `<th class="table-header">${h.label}</th>`).join('');
        const actionHeaderHtml = actions.length > 0 ? '<th class="table-header">Aktionen</th>' : '';
        
        const rowsHtml = data.map(row => {
            const cellsHtml = headers.map(h => {
                const value = this.getNestedValue(row, h.key);
                const formatted = h.formatter ? h.formatter(value, row) : value;
                return `<td class="table-cell">${formatted}</td>`;
            }).join('');
            
            const actionsHtml = actions.length > 0 ? `
                <td class="table-cell">
                    <div class="flex gap-2">
                        ${actions.map(action => `
                            <button class="btn btn-sm ${action.variant || 'btn-secondary'}" 
                                    onclick="${action.onClick}('${row.id || row.name}')"
                                    title="${action.tooltip || action.label}">
                                ${action.icon ? `<i class="${action.icon}"></i>` : action.label}
                            </button>
                        `).join('')}
                    </div>
                </td>
            ` : '';
            
            return `<tr class="table-row">${cellsHtml}${actionsHtml}</tr>`;
        }).join('');

        return `
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>${headerHtml}${actionHeaderHtml}</tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
        `;
    },

    /**
     * Get nested object value by dot notation
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    },

    /**
     * Create a statistics card component
     */
    createStatsCard(config) {
        const { title, value, subtitle, icon, color = 'blue', trend = null } = config;
        
        const trendHtml = trend ? `
            <div class="flex items-center text-sm ${trend.positive ? 'text-green-600' : 'text-red-600'}">
                <i class="fas fa-arrow-${trend.positive ? 'up' : 'down'} mr-1"></i>
                ${trend.value}
            </div>
        ` : '';

        return `
            <div class="stats-card stats-card-${color}">
                <div class="stats-card-content">
                    <div class="stats-card-header">
                        ${icon ? `<div class="stats-card-icon"><i class="${icon}"></i></div>` : ''}
                        <div class="stats-card-title">${title}</div>
                    </div>
                    <div class="stats-card-value">${value}</div>
                    ${subtitle ? `<div class="stats-card-subtitle">${subtitle}</div>` : ''}
                    ${trendHtml}
                </div>
            </div>
        `;
    },

    /**
     * Format currency values
     */
    formatCurrency(amount, currency = '€') {
        const formatter = new Intl.NumberFormat('de-DE', {
            style: 'decimal',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        });
        
        const sign = amount >= 0 ? '+' : '';
        return `${sign}${formatter.format(amount)}${currency}`;
    },

    /**
     * Format large numbers with abbreviations
     */
    formatNumber(num, precision = 1) {
        const map = [
            { suffix: 'T', threshold: 1e12 },
            { suffix: 'B', threshold: 1e9 },
            { suffix: 'M', threshold: 1e6 },
            { suffix: 'K', threshold: 1e3 },
            { suffix: '', threshold: 1 },
        ];

        const found = map.find((x) => Math.abs(num) >= x.threshold);
        if (found) {
            const formatted = (num / found.threshold).toFixed(precision) + found.suffix;
            return formatted;
        }

        return num.toString();
    },

    /**
     * Capitalize first letter of each word
     */
    capitalize(str) {
        return str.replace(/\w\S*/g, (txt) => 
            txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
    },

    /**
     * Generate a unique ID
     */
    generateId(prefix = 'id') {
        return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
};