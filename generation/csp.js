/**
 * Constraint Satisfaction Problem (CSP) Solver
 *
 * Finds valid configurations given variables, domains, and constraints.
 * Used for: wave composition, puzzle generation, valid room layouts.
 *
 * AGENT INSTRUCTIONS:
 * 1. Define variables (things to assign values to)
 * 2. Define domains (possible values for each variable)
 * 3. Define constraints (rules that must be satisfied)
 * 4. Solve using backtracking with constraint propagation
 *
 * EXPORTS:
 * - createCSP() - create new CSP instance
 * - addVariable(csp, name, domain) - add variable with possible values
 * - addConstraint(csp, variables, constraintFn) - add constraint function
 * - solve(csp) - returns solution object or null if unsatisfiable
 *
 * CONSTRAINT FORMAT:
 * constraintFn(assignment) => boolean
 * assignment = { varName: value, ... }
 *
 * EXAMPLE - Wave Composition:
 * addVariable(csp, 'blueCount', [0,1,2,3,4,5]);
 * addVariable(csp, 'turretCount', [0,1,2]);
 * addConstraint(csp, ['blueCount', 'turretCount'], (a) => {
 *   // Must have turret if more than 3 blue enemies
 *   return a.blueCount <= 3 || a.turretCount >= 1;
 * });
 *
 * BACKTRACKING ALGORITHM:
 * 1. If all variables assigned, return assignment (solution found)
 * 2. Select unassigned variable (MRV heuristic: pick smallest domain)
 * 3. For each value in domain:
 *    a. If value consistent with constraints, assign it
 *    b. Recursively solve
 *    c. If solved, return. Else, unassign (backtrack)
 * 4. Return null (no solution)
 *
 * OPTIMIZATION - Arc Consistency (AC-3):
 * Before/during search, remove values that can't possibly work
 */

export function createCSP() {
    return { variables: {}, constraints: [] };
}

export function addVariable(csp, name, domain) {
    // TODO: Add variable with domain
}

export function addConstraint(csp, variables, constraintFn) {
    // TODO: Add constraint
}

export function solve(csp) {
    // TODO: Implement backtracking solver
    return null;
}

export default { createCSP, addVariable, addConstraint, solve };
