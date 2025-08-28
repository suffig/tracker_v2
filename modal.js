import { ErrorHandler } from './utils.js';

// Enhanced Modal System for better UX
export function showModal(html, options = {}) {
    const defaultOptions = {
        closable: true,
        backdrop: true,
        size: 'md',
        animation: true
    };
    
    const config = { ...defaultOptions, ...options };
    
    let modal = document.getElementById("modal-root");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "modal-root";
        document.body.appendChild(modal);
    }
    
    const sizeClasses = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
        full: 'max-w-full'
    };
    
    const sizeClass = sizeClasses[config.size] || sizeClasses.md;
    
    modal.innerHTML = `
        <div class="modal ${config.animation ? 'fade-in' : ''}" ${config.backdrop ? 'onclick="window.hideModal && window.hideModal()"' : ''}>
            <div class="modal-content ${sizeClass} ${config.animation ? 'slide-up' : ''}" onclick="event.stopPropagation();">
                ${config.closable ? '<button class="close-modal-btn" aria-label="Schließen" onclick="window.hideModal && window.hideModal(); event.stopPropagation();"></button>' : ''}
                <div class="modal-body">
                    ${html}
                </div>
            </div>
        </div>
    `;
    
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    
    // Set up global hide function
    window.hideModal = hideModal;
    
    // Auto focus first focusable element
    setTimeout(() => {
        const firstFocusable = modal.querySelector('input, button, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (firstFocusable) {
            firstFocusable.focus();
        }
    }, 100);
    
    // Handle keyboard navigation
    const handleKeydown = (e) => {
        if (e.key === 'Escape' && config.closable) {
            hideModal();
        }
        
        // Trap focus within modal
        if (e.key === 'Tab') {
            const focusableElements = modal.querySelectorAll('input, button, select, textarea, [tabindex]:not([tabindex="-1"])');
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];
            
            if (e.shiftKey && document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            } else if (!e.shiftKey && document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    };
    
    document.addEventListener('keydown', handleKeydown);
    modal.handleKeydown = handleKeydown; // Store for cleanup
}

export function hideModal() {
    const modal = document.getElementById("modal-root");
    if (modal) {
        // Clean up event listeners
        if (modal.handleKeydown) {
            document.removeEventListener('keydown', modal.handleKeydown);
            delete modal.handleKeydown;
        }
        
        // Add fade out animation
        const modalElement = modal.querySelector('.modal');
        if (modalElement) {
            modalElement.style.animation = 'fadeOut 0.2s ease-out';
            setTimeout(() => {
                modal.innerHTML = "";
                document.body.style.overflow = '';
            }, 200);
        } else {
            modal.innerHTML = "";
            document.body.style.overflow = '';
        }
    }
}

// Enhanced success notification with modal closure
export function showSuccessAndCloseModal(message, delay = 1000) {
    ErrorHandler.showSuccessMessage(message);
    // Allow user to see the success message before closing
    setTimeout(() => {
        hideModal();
    }, delay);
}

// Confirmation dialog utility
export function showConfirmDialog(message, onConfirm, onCancel = null) {
    const html = `
        <div class="p-6">
            <div class="flex items-center mb-4">
                <div class="flex-shrink-0 mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
                    <i class="fas fa-exclamation-triangle text-yellow-600"></i>
                </div>
            </div>
            <div class="text-center">
                <h3 class="text-lg leading-6 font-medium text-gray-900 mb-2">Bestätigung erforderlich</h3>
                <div class="mt-2">
                    <p class="text-sm text-gray-500">${message}</p>
                </div>
            </div>
            <div class="mt-6 flex space-x-3 justify-end">
                <button id="cancel-btn" class="btn btn-secondary btn-sm">
                    Abbrechen
                </button>
                <button id="confirm-btn" class="btn btn-danger btn-sm">
                    Bestätigen
                </button>
            </div>
        </div>
    `;
    
    showModal(html, { size: 'sm' });
    
    // Add event listeners
    setTimeout(() => {
        const confirmBtn = document.getElementById('confirm-btn');
        const cancelBtn = document.getElementById('cancel-btn');
        
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                hideModal();
                if (onConfirm) onConfirm();
            });
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                hideModal();
                if (onCancel) onCancel();
            });
        }
    }, 50);
}