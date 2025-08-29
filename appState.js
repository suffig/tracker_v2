// Global application state management
let isReadOnlyMode = false;

export function setReadOnlyMode(readOnly) {
    isReadOnlyMode = readOnly;
}

export function isInReadOnlyMode() {
    return isReadOnlyMode;
}