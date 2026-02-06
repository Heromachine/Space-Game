/**
 * Input System
 *
 * AGENT INSTRUCTIONS:
 * 1. Extract all event listeners from game.js
 * 2. Export: inputState object (keys, mouse, buttons)
 * 3. Export: initInput(canvas) - sets up listeners
 * 4. Export: getCanvasCoords(event, canvas) - converts screen to canvas coords
 *
 * Keep input state separate from game logic.
 */

export const inputState = {
    keys: {},
    mouseX: 0,
    mouseY: 0,
    leftMouseDown: false,
    rightMouseDown: false
};

export function initInput(canvas) {
    window.addEventListener('keydown', (e) => {
        inputState.keys[e.key.toLowerCase()] = true;
    });

    window.addEventListener('keyup', (e) => {
        inputState.keys[e.key.toLowerCase()] = false;
    });

    window.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        inputState.mouseX = e.clientX - rect.left;
        inputState.mouseY = e.clientY - rect.top;
    });

    window.addEventListener('mousedown', (e) => {
        if (e.button === 0) inputState.leftMouseDown = true;
        if (e.button === 2) inputState.rightMouseDown = true;
    });

    window.addEventListener('mouseup', (e) => {
        if (e.button === 0) inputState.leftMouseDown = false;
        if (e.button === 2) inputState.rightMouseDown = false;
    });

    window.addEventListener('contextmenu', (e) => e.preventDefault());
}

export function isKeyDown(key) {
    return inputState.keys[key.toLowerCase()] || false;
}

export default { inputState, initInput, isKeyDown };
