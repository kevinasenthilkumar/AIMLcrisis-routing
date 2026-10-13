import type { GridCell, MapNode } from '@/types';

export const GRID_ROWS = 24;
export const GRID_COLS = 32;

export const ROAD_ROWS = [3, 7, 11, 15, 19];
export const ROAD_COLS = [4, 9, 14, 19, 24, 29];

export function isRoad(row: number, col: number): boolean {
  if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) return false;
  return ROAD_ROWS.includes(row) || ROAD_COLS.includes(col);
}

export function buildGrid(): GridCell[][] {
  const grid: GridCell[][] = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    const row: GridCell[] = [];
    for (let c = 0; c < GRID_COLS; c++) {
      let type: GridCell['type'] = 'building';
      if (ROAD_ROWS.includes(r) || ROAD_COLS.includes(c)) {
        type = 'road';
      }
      row.push({ row: r, col: c, type });
    }
    grid.push(row);
  }
  grid[7][4] = { row: 7, col: 4, type: 'hospital' };
  grid[7][5] = { row: 7, col: 5, type: 'hospital' };
  grid[15][24] = { row: 15, col: 24, type: 'hospital' };
  grid[15][25] = { row: 15, col: 25, type: 'hospital' };
  grid[3][14] = { row: 3, col: 14, type: 'water' };
  grid[3][15] = { row: 3, col: 15, type: 'water' };
  grid[19][9] = { row: 19, col: 9, type: 'water' };
  grid[19][10] = { row: 19, col: 10, type: 'water' };
  return grid;
}

function heuristic(r1: number, c1: number, r2: number, c2: number): number {
  return Math.abs(r1 - r2) + Math.abs(c1 - c2);
}

function getNeighbors(
  row: number,
  col: number,
  passable: (r: number, c: number) => boolean
): [number, number][] {
  const dirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  const neighbors: [number, number][] = [];
  for (const [dr, dc] of dirs) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr >= 0 && nr < GRID_ROWS && nc >= 0 && nc < GRID_COLS && passable(nr, nc)) {
      neighbors.push([nr, nc]);
    }
  }
  return neighbors;
}

export function findPath(
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number,
  passable: (r: number, c: number) => boolean,
  maxIterations = 5000
): GridCell[] | null {
  const startNode: MapNode = {
    row: startRow,
    col: startCol,
    g: 0,
    h: heuristic(startRow, startCol, endRow, endCol),
    f: 0,
    parent: null,
  };
  startNode.f = startNode.g + startNode.h;

  const openList: MapNode[] = [startNode];
  const closedSet = new Set<string>();
  const openMap = new Map<string, MapNode>();
  openMap.set(`${startRow},${startCol}`, startNode);

  let iterations = 0;

  while (openList.length > 0 && iterations < maxIterations) {
    iterations++;

    let minIdx = 0;
    for (let i = 1; i < openList.length; i++) {
      if (openList[i].f < openList[minIdx].f) minIdx = i;
    }

    const current = openList.splice(minIdx, 1)[0];
    const key = `${current.row},${current.col}`;
    openMap.delete(key);
    closedSet.add(key);

    if (current.row === endRow && current.col === endCol) {
      const path: GridCell[] = [];
      let node: MapNode | null = current;
      while (node) {
        path.unshift({ row: node.row, col: node.col, type: 'road' });
        node = node.parent;
      }
      return path;
    }

    const neighbors = getNeighbors(current.row, current.col, passable);
    for (const [nr, nc] of neighbors) {
      const nKey = `${nr},${nc}`;
      if (closedSet.has(nKey)) continue;

      const g = current.g + 1;
      const existing = openMap.get(nKey);

      if (!existing) {
        const node: MapNode = {
          row: nr,
          col: nc,
          g,
          h: heuristic(nr, nc, endRow, endCol),
          f: 0,
          parent: current,
        };
        node.f = node.g + node.h;
        openList.push(node);
        openMap.set(nKey, node);
      } else if (g < existing.g) {
        existing.g = g;
        existing.f = g + existing.h;
        existing.parent = current;
      }
    }
  }

  return null;
}

export function findNearestRoadCell(row: number, col: number): { row: number; col: number } {
  if (isRoad(row, col)) return { row, col };
  let minDist = Infinity;
  let best = { row, col };
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      if (isRoad(r, c)) {
        const dist = Math.abs(r - row) + Math.abs(c - col);
        if (dist < minDist) {
          minDist = dist;
          best = { row: r, col: c };
        }
      }
    }
  }
  return best;
}

// Bresenham line - straight-line path for drones that fly over everything
export function straightLinePath(
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number
): GridCell[] {
  const path: GridCell[] = [];
  let r0 = startRow;
  let c0 = startCol;
  const r1 = endRow;
  const c1 = endCol;
  const dr = Math.abs(r1 - r0);
  const dc = Math.abs(c1 - c0);
  const sr = r0 < r1 ? 1 : -1;
  const sc = c0 < c1 ? 1 : -1;
  let err = dr - dc;

  while (true) {
    path.push({ row: r0, col: c0, type: 'road' });
    if (r0 === r1 && c0 === c1) break;
    const e2 = 2 * err;
    if (e2 > -dc) {
      err -= dc;
      r0 += sr;
    }
    if (e2 < dr) {
      err += dr;
      c0 += sc;
    }
  }
  return path;
}
