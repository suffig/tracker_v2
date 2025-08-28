/**
 * Base Module Class
 * Provides common functionality for all application modules
 */
import { showModal, hideModal, showSuccessAndCloseModal } from './modal.js';
import { ErrorHandler, loadingManager, Performance, DOM } from './utils.js';
import { dataManager } from './dataManager.js';

export class BaseModule {
    constructor(moduleName) {
        this.moduleName = moduleName;
        this.isInitialized = false;
        this.subscriptions = new Set();
        this.eventHandlers = new Map();
    }

    /**
     * Common initialization logic
     */
    async initialize(containerId = "app") {
        try {
            this.containerId = containerId;
            this.container = DOM.getElementById(containerId);
            
            if (!this.container) {
                throw new Error(`Container ${containerId} not found`);
            }

            this.isInitialized = true;
            console.log(`${this.moduleName} module initialized`);
        } catch (error) {
            ErrorHandler.handleDatabaseError(error, `${this.moduleName} initialization`);
            throw error;
        }
    }

    /**
     * Common cleanup logic
     */
    cleanup() {
        // Clean up event listeners
        this.eventHandlers.forEach((handler, element) => {
            if (element && typeof element.removeEventListener === 'function') {
                element.removeEventListener('click', handler);
            }
        });
        this.eventHandlers.clear();

        // Clean up subscriptions
        this.subscriptions.forEach(unsubscribe => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        });
        this.subscriptions.clear();

        this.isInitialized = false;
        console.log(`${this.moduleName} module cleaned up`);
    }

    /**
     * Enhanced event handler registration with automatic cleanup
     */
    addEventHandler(element, event, handler, options = {}) {
        if (!element) return;

        const wrappedHandler = (e) => {
            try {
                handler(e);
            } catch (error) {
                ErrorHandler.handleDatabaseError(error, `${this.moduleName} event handler`);
            }
        };

        element.addEventListener(event, wrappedHandler, options);
        this.eventHandlers.set(element, wrappedHandler);

        return () => {
            element.removeEventListener(event, wrappedHandler, options);
            this.eventHandlers.delete(element);
        };
    }

    /**
     * Common form submission wrapper with loading states
     */
    async handleFormSubmission(form, submitHandler, options = {}) {
        const {
            loadingText = 'Speichere...',
            successMessage = 'Erfolgreich gespeichert!',
            closeModalOnSuccess = true
        } = options;

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn?.textContent;

        try {
            // Show loading state
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = loadingText;
            }

            // Execute the submission handler
            await submitHandler();

            // Show success message
            ErrorHandler.showSuccessMessage(successMessage);

            // Close modal if requested
            if (closeModalOnSuccess) {
                setTimeout(() => hideModal(), 500);
            }

        } catch (error) {
            ErrorHandler.handleDatabaseError(error, `${this.moduleName} form submission`);
        } finally {
            // Restore button state
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        }
    }

    /**
     * Common data loading wrapper with error handling
     */
    async loadData(dataLoader, fallbackValue = null) {
        try {
            loadingManager.show(`${this.moduleName}-data`);
            const data = await dataLoader();
            return data;
        } catch (error) {
            ErrorHandler.handleDatabaseError(error, `${this.moduleName} data loading`);
            return fallbackValue;
        } finally {
            loadingManager.hide(`${this.moduleName}-data`);
        }
    }

    /**
     * Common search/filter functionality
     */
    setupSearchAndFilter(searchInput, filters, dataArray, renderFunction) {
        if (!searchInput || !Array.isArray(filters)) return;

        const debouncedFilter = Performance.debounce(() => {
            this.applyFilters(searchInput, filters, dataArray, renderFunction);
        }, 300);

        // Set up search input
        this.addEventHandler(searchInput, 'input', debouncedFilter);
        this.addEventHandler(searchInput, 'keydown', (e) => {
            if (e.key === 'Escape') {
                this.clearFilters(searchInput, filters, renderFunction);
            }
        });

        // Set up filter dropdowns
        filters.forEach(filter => {
            this.addEventHandler(filter, 'change', debouncedFilter);
        });
    }

    /**
     * Apply filters to data array
     */
    applyFilters(searchInput, filters, dataArray, renderFunction) {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const filterValues = filters.map(f => ({ id: f.id, value: f.value }));

        const filteredData = dataArray.filter(item => {
            // Override in subclass for specific filtering logic
            return this.filterItem(item, searchTerm, filterValues);
        });

        renderFunction(filteredData);
    }

    /**
     * Override in subclass for specific filtering logic
     */
    filterItem(item, searchTerm, filterValues) {
        // Default implementation - just search in string representation
        const itemText = JSON.stringify(item).toLowerCase();
        return itemText.includes(searchTerm);
    }

    /**
     * Clear all filters
     */
    clearFilters(searchInput, filters, renderFunction) {
        searchInput.value = '';
        filters.forEach(filter => filter.value = '');
        renderFunction();
    }

    /**
     * Create standardized loading indicator
     */
    createLoadingIndicator(message = 'Lädt...') {
        return `
            <div class="flex items-center justify-center py-8 fade-in">
                <div class="spinner"></div>
                <span class="ml-2 text-gray-600">${message}</span>
            </div>
        `;
    }

    /**
     * Create standardized empty state
     */
    createEmptyState(title, message, actionButton = null) {
        const buttonHtml = actionButton ? `
            <button class="btn btn-primary mt-4" onclick="${actionButton.onClick}">
                ${actionButton.text}
            </button>
        ` : '';

        return `
            <div class="text-center py-12 fade-in">
                <div class="text-gray-500 text-6xl mb-4">📭</div>
                <h3 class="text-lg font-semibold text-gray-700 mb-2">${title}</h3>
                <p class="text-gray-500 mb-4">${message}</p>
                ${buttonHtml}
            </div>
        `;
    }

    /**
     * Show modal with module-specific styling
     */
    showModal(content, options = {}) {
        const { title, size = 'md' } = options;
        
        const modalContent = title ? `
            <div class="modal-header mb-4">
                <h3 class="text-xl font-bold text-gray-800">${title}</h3>
            </div>
            ${content}
        ` : content;

        showModal(modalContent);
        
        // Add size class if specified
        const modalElement = document.querySelector('.modal-content');
        if (modalElement && size !== 'md') {
            modalElement.classList.add(`modal-${size}`);
        }
    }

    /**
     * Show confirmation dialog
     */
    async showConfirmation(message, confirmText = 'Bestätigen', cancelText = 'Abbrechen') {
        return new Promise((resolve) => {
            const confirmationHtml = `
                <div class="text-center">
                    <div class="text-yellow-500 text-5xl mb-4">⚠️</div>
                    <h3 class="text-lg font-semibold mb-4">${message}</h3>
                    <div class="flex gap-3 justify-center">
                        <button id="confirm-cancel" class="btn btn-secondary">${cancelText}</button>
                        <button id="confirm-ok" class="btn btn-danger">${confirmText}</button>
                    </div>
                </div>
            `;

            this.showModal(confirmationHtml, { title: 'Bestätigung erforderlich' });

            // Set up event handlers
            const handleConfirm = () => {
                hideModal();
                resolve(true);
            };

            const handleCancel = () => {
                hideModal();
                resolve(false);
            };

            setTimeout(() => {
                const confirmBtn = DOM.getElementById('confirm-ok');
                const cancelBtn = DOM.getElementById('confirm-cancel');

                if (confirmBtn) confirmBtn.onclick = handleConfirm;
                if (cancelBtn) cancelBtn.onclick = handleCancel;
            }, 100);
        });
    }
}

// Export a factory function for creating module instances
export function createModule(moduleName) {
    return new BaseModule(moduleName);
}