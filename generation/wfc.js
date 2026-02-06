/**
 * Wave Function Collapse (WFC)
 *
 * Generates tile-based content by propagating adjacency constraints.
 * Used for: space station interiors, structured arena layouts.
 *
 * AGENT INSTRUCTIONS:
 * 1. Define tiles with adjacency rules (which tiles can be next to which)
 * 2. Start with all cells having all possible tiles (superposition)
 * 3. Collapse: pick cell with lowest entropy (fewest options), choose random tile
 * 4. Propagate: remove invalid options from neighbors based on adjacency rules
 * 5. Repeat until all cells collapsed or contradiction found
 *
 * EXPORTS:
 * - createWFC(width, height, tiles) - initialize grid
 * - collapse(wfc) - run until complete, returns 2D tile array
 * - step(wfc) - single collapse+propagate step (for animation)
 *
 * TILE FORMAT:
 * {
 *   id: 'floor',
 *   weight: 1,  // probability weight
 *   edges: {
 *     top: 'open',    // edge type must match neighbor's opposite edge
 *     right: 'wall',
 *     bottom: 'open',
 *     left: 'open'
 *   }
 * }
 *
 * ALGORITHM:
 * 1. Find cell with minimum entropy (exclude collapsed cells)
 * 2. Randomly select tile from options (weighted)
 * 3. Set cell to that single tile
 * 4. Add neighbors to propagation stack
 * 5. While stack not empty:
 *    - Pop cell, for each neighbor:
 *    - Remove options incompatible with current cell's edge
 *    - If neighbor changed, add its neighbors to stack
 *    - If any cell has 0 options, contradiction - backtrack or restart
 */

export function createWFC(width, height, tiles) {
    // TODO: Initialize grid with all tiles as options in each cell
    return { width, height, tiles, grid: [] };
}

export function collapse(wfc) {
    // TODO: Run WFC to completion
    return [];
}

export function step(wfc) {
    // TODO: Single WFC step
    return { complete: false, contradiction: false };
}

export default { createWFC, collapse, step };
