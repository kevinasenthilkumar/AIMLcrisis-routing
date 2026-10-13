import { useState, useEffect, useCallback, useRef } from 'react';
import type { Vehicle, Crisis, GridCell, SimulationStats, RoadBlock } from '@/types';
import {
  findPath,
  findNearestRoadCell,
  straightLinePath,
  GRID_ROWS,
  GRID_COLS,
  isRoad,
} from '@/lib/pathfinding';
import { isPassableForAmbulance, isPassableForDrone } from '@/lib/gridData';

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter++;
  return `${prefix}-${idCounter}`;
}

function initialVehicles(): Vehicle[] {
  return [
    {
      id: nextId('veh'),
      type: 'ambulance',
      name: 'Ambulance-1',
      row: 7,
      col: 4,
      homeRow: 7,
      homeCol: 4,
      path: [],
      pathIndex: 0,
      targetCrisisId: null,
      status: 'idle',
      speed: 3,
      progress: 0,
      dispatchTime: 0,
      arrivalTime: null,
    },
    {
      id: nextId('veh'),
      type: 'ambulance',
      name: 'Ambulance-2',
      row: 15,
      col: 24,
      homeRow: 15,
      homeCol: 24,
      path: [],
      pathIndex: 0,
      targetCrisisId: null,
      status: 'idle',
      speed: 3,
      progress: 0,
      dispatchTime: 0,
      arrivalTime: null,
    },
    {
      id: nextId('veh'),
      type: 'drone',
      name: 'Drone-1',
      row: 3,
      col: 29,
      homeRow: 3,
      homeCol: 29,
      path: [],
      pathIndex: 0,
      targetCrisisId: null,
      status: 'idle',
      speed: 6,
      progress: 0,
      dispatchTime: 0,
      arrivalTime: null,
    },
    {
      id: nextId('veh'),
      type: 'drone',
      name: 'Drone-2',
      row: 19,
      col: 4,
      homeRow: 19,
      homeCol: 4,
      path: [],
      pathIndex: 0,
      targetCrisisId: null,
      status: 'idle',
      speed: 6,
      progress: 0,
      dispatchTime: 0,
      arrivalTime: null,
    },
  ];
}

// Generate road hazards near a crisis (traffic, collapse, debris on nearby roads)
function generateHazardsNearCrisis(crisis: Crisis): RoadBlock[] {
  const blocks: RoadBlock[] = [];
  const hazardTypes: RoadBlock['type'][] = ['traffic', 'collapse', 'debris'];
  const numHazards = crisis.severity === 'high' ? 3 : crisis.severity === 'medium' ? 2 : 1;

  const candidates: { row: number; col: number }[] = [];
  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      const r = crisis.row + dr;
      const c = crisis.col + dc;
      if (isRoad(r, c) && !(r === crisis.row && c === crisis.col)) {
        candidates.push({ row: r, col: c });
      }
    }
  }

  // Shuffle and pick
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  const count = Math.min(numHazards, candidates.length);
  for (let i = 0; i < count; i++) {
    blocks.push({
      row: candidates[i].row,
      col: candidates[i].col,
      type: hazardTypes[Math.floor(Math.random() * hazardTypes.length)],
    });
  }
  return blocks;
}

function computeVehiclePath(
  vehicle: Vehicle,
  crisis: Crisis,
  blocks: RoadBlock[]
): { path: GridCell[]; targetRow: number; targetCol: number } | null {
  let startR = Math.round(vehicle.row);
  let startC = Math.round(vehicle.col);
  let endR = crisis.row;
  let endC = crisis.col;

  if (vehicle.type === 'drone') {
    // Drones fly straight to the exact crisis location - no roads needed
    const path = straightLinePath(startR, startC, endR, endC);
    if (path.length < 2) return null;
    return { path, targetRow: endR, targetCol: endC };
  }

  // Ambulances must use roads and avoid blocked roads
  if (!isRoad(startR, startC)) {
    const near = findNearestRoadCell(startR, startC);
    startR = near.row;
    startC = near.col;
  }
  if (!isRoad(endR, endC)) {
    const near = findNearestRoadCell(endR, endC);
    endR = near.row;
    endC = near.col;
  }

  const passable = (r: number, c: number) => isPassableForAmbulance(r, c, blocks);
  const path = findPath(startR, startC, endR, endC, passable);
  if (!path || path.length < 2) {
    // Retry without blocks (emergency override)
    const fallbackPath = findPath(startR, startC, endR, endC, isPassableForAmbulance);
    if (!fallbackPath || fallbackPath.length < 2) return null;
    return { path: fallbackPath, targetRow: endR, targetCol: endC };
  }
  return { path, targetRow: endR, targetCol: endC };
}

export function useSimulation() {
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [crises, setCrises] = useState<Crisis[]>([]);
  const [roadBlocks, setRoadBlocks] = useState<RoadBlock[]>([]);
  const [isRunning, setIsRunning] = useState(true);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [autoDispatch, setAutoDispatch] = useState(false);
  const [stats, setStats] = useState<SimulationStats>({
    totalDispatched: 0,
    totalResolved: 0,
    avgResponseTime: 0,
    activeCrises: 0,
    idleVehicles: 4,
  });
  const responseTimes = useRef<number[]>([]);
  const lastTime = useRef<number>(performance.now());

  const addCrisis = useCallback((row: number, col: number) => {
    if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) return;
    const severities: Crisis['severity'][] = ['low', 'medium', 'high'];
    const severity = severities[Math.floor(Math.random() * severities.length)];
    const crisis: Crisis = {
      id: nextId('crisis'),
      row,
      col,
      severity,
      time: performance.now(),
      resolved: false,
      resolvedBy: null,
    };
    setCrises((prev) => [...prev, crisis]);

    // Generate road hazards near the crisis
    const hazards = generateHazardsNearCrisis(crisis);
    if (hazards.length > 0) {
      setRoadBlocks((prev) => {
        // Avoid duplicates
        const existing = new Set(prev.map((b) => `${b.row},${b.col}`));
        return [...prev, ...hazards.filter((h) => !existing.has(`${h.row},${h.col}`))];
      });
    }
  }, []);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      addCrisis(row, col);
    },
    [addCrisis]
  );

  const dispatchVehicle = useCallback(
    (vehicleId: string, crisisId: string) => {
      setVehicles((prev) => {
        const vehicle = prev.find((v) => v.id === vehicleId);
        const crisis = crises.find((c) => c.id === crisisId);
        if (!vehicle || !crisis || vehicle.status !== 'idle') return prev;

        const result = computeVehiclePath(vehicle, crisis, roadBlocks);
        if (!result) return prev;

        return prev.map((v) =>
          v.id === vehicleId
            ? {
                ...v,
                path: result.path,
                pathIndex: 0,
                targetCrisisId: crisisId,
                status: 'enroute' as const,
                dispatchTime: performance.now(),
                arrivalTime: null,
                progress: 0,
              }
            : v
        );
      });
      setStats((prev) => ({
        ...prev,
        totalDispatched: prev.totalDispatched + 1,
      }));
    },
    [crises, roadBlocks]
  );

  // Deploy: send ALL idle vehicles. Assign multiple vehicles to crises if we have extras.
  const deployAll = useCallback(() => {
    setCrises((prevCrises) => {
      const unresolved = prevCrises.filter((c) => !c.resolved);
      if (unresolved.length === 0) return prevCrises;

      setVehicles((prevVehicles) => {
        const updated = [...prevVehicles];
        const availableIndices = updated
          .map((v, i) => (v.status === 'idle' ? i : -1))
          .filter((i) => i >= 0);

        if (availableIndices.length === 0) return prevVehicles;

        // Sort crises by severity (high first)
        const sortedCrises = [...unresolved].sort((a, b) => {
          const sevOrder = { high: 0, medium: 1, low: 2 };
          return sevOrder[a.severity] - sevOrder[b.severity];
        });

        let dispatched = 0;
        const assignedCrisisIds = new Set<string>();

        // First pass: assign one vehicle per crisis (nearest idle to each crisis)
        for (const crisis of sortedCrises) {
          if (availableIndices.length === 0) break;

          // Find nearest available vehicle by Manhattan distance
          let bestArrIdx = -1;
          let bestDist = Infinity;
          for (const arrIdx of availableIndices) {
            const v = updated[arrIdx];
            const dist = Math.abs(v.row - crisis.row) + Math.abs(v.col - crisis.col);
            if (dist < bestDist) {
              bestDist = dist;
              bestArrIdx = arrIdx;
            }
          }
          if (bestArrIdx === -1) break;

          const result = computeVehiclePath(updated[bestArrIdx], crisis, roadBlocks);
          if (!result) continue;

          updated[bestArrIdx] = {
            ...updated[bestArrIdx],
            path: result.path,
            pathIndex: 0,
            targetCrisisId: crisis.id,
            status: 'enroute' as const,
            dispatchTime: performance.now(),
            arrivalTime: null,
            progress: 0,
          };
          assignedCrisisIds.add(crisis.id);
          const removeIdx = availableIndices.indexOf(bestArrIdx);
          availableIndices.splice(removeIdx, 1);
          dispatched++;
        }

        // Second pass: if we still have idle vehicles, send them to highest-severity
        // unresolved crises as backup (drones first since they're faster)
        if (availableIndices.length > 0) {
          // Sort remaining vehicles: drones first
          availableIndices.sort((a, b) => {
            const aIsDrone = updated[a].type === 'drone' ? 0 : 1;
            const bIsDrone = updated[b].type === 'drone' ? 0 : 1;
            return aIsDrone - bIsDrone;
          });

          for (const arrIdx of availableIndices) {
            // Pick the highest-severity crisis that this vehicle could help with
            // Prefer crises not yet assigned a vehicle of this type
            let targetCrisis: Crisis | null = null;
            for (const crisis of sortedCrises) {
              const hasSameType = updated.some(
                (v) =>
                  v.targetCrisisId === crisis.id &&
                  v.status === 'enroute' &&
                  v.type === updated[arrIdx].type
              );
              if (!hasSameType) {
                targetCrisis = crisis;
                break;
              }
            }
            if (!targetCrisis) {
              // All crises have this type -- just pick highest severity
              targetCrisis = sortedCrises[0] ?? null;
            }
            if (!targetCrisis) break;

            const result = computeVehiclePath(updated[arrIdx], targetCrisis, roadBlocks);
            if (!result) continue;

            updated[arrIdx] = {
              ...updated[arrIdx],
              path: result.path,
              pathIndex: 0,
              targetCrisisId: targetCrisis.id,
              status: 'enroute' as const,
              dispatchTime: performance.now(),
              arrivalTime: null,
              progress: 0,
            };
            dispatched++;
          }
        }

        if (dispatched > 0) {
          setStats((prev) => ({
            ...prev,
            totalDispatched: prev.totalDispatched + dispatched,
          }));
        }
        return updated;
      });
      return prevCrises;
    });
  }, [roadBlocks]);

  const resetAll = useCallback(() => {
    setVehicles(initialVehicles());
    setCrises([]);
    setRoadBlocks([]);
    setStats({
      totalDispatched: 0,
      totalResolved: 0,
      avgResponseTime: 0,
      activeCrises: 0,
      idleVehicles: 4,
    });
    responseTimes.current = [];
  }, []);

  // Auto-dispatch logic (only if enabled)
  useEffect(() => {
    if (!autoDispatch) return;
    const unresolved = crises.filter((c) => !c.resolved);
    if (unresolved.length === 0) return;

    setVehicles((prev) => {
      let changed = false;
      const idle = prev.filter((v) => v.status === 'idle');
      if (idle.length === 0) return prev;

      const updated = [...prev];
      for (const crisis of unresolved) {
        const alreadyAssigned = updated.some(
          (v) => v.targetCrisisId === crisis.id && v.status === 'enroute'
        );
        if (alreadyAssigned) continue;

        const idleIdx = updated.findIndex((v) => v.status === 'idle');
        if (idleIdx === -1) break;

        const result = computeVehiclePath(updated[idleIdx], crisis, roadBlocks);
        if (!result) continue;

        updated[idleIdx] = {
          ...updated[idleIdx],
          path: result.path,
          pathIndex: 0,
          targetCrisisId: crisis.id,
          status: 'enroute' as const,
          dispatchTime: performance.now(),
          arrivalTime: null,
          progress: 0,
        };
        changed = true;
      }

      if (changed) {
        setStats((prev) => ({
          ...prev,
          totalDispatched: prev.totalDispatched + 1,
        }));
      }
      return changed ? updated : prev;
    });
  }, [crises, autoDispatch, roadBlocks]);

  // Animation loop
  useEffect(() => {
    if (!isRunning) return;
    let frameId: number;

    const animate = (now: number) => {
      const dt = Math.min((now - lastTime.current) / 1000, 0.1);
      lastTime.current = now;

      setVehicles((prev) => {
        let changed = false;
        const updated = prev.map((v) => {
          if (v.status !== 'enroute' || v.path.length < 2) return v;

          changed = true;
          let progress = v.progress + v.speed * dt;
          let pathIndex = v.pathIndex;

          while (progress >= 1 && pathIndex < v.path.length - 1) {
            progress -= 1;
            pathIndex++;
          }

          if (pathIndex >= v.path.length - 1) {
            const lastCell = v.path[v.path.length - 1];
            const responseTime = (now - v.dispatchTime) / 1000;
            responseTimes.current.push(responseTime);

            if (v.targetCrisisId) {
              setCrises((prevCrises) =>
                prevCrises.map((c) =>
                  c.id === v.targetCrisisId
                    ? { ...c, resolved: true, resolvedBy: v.id }
                    : c
                )
              );
            }

            setStats((prevStats) => ({
              ...prevStats,
              totalResolved: prevStats.totalResolved + 1,
              avgResponseTime:
                responseTimes.current.length > 0
                  ? responseTimes.current.reduce((a, b) => a + b, 0) /
                    responseTimes.current.length
                  : 0,
            }));

            return {
              ...v,
              row: lastCell.row,
              col: lastCell.col,
              pathIndex: v.path.length - 1,
              progress: 0,
              status: 'arrived' as const,
              arrivalTime: now,
              path: [],
              targetCrisisId: null,
            } as Vehicle;
          }

          const fromCell = v.path[pathIndex];
          const toCell = v.path[pathIndex + 1];

          return {
            ...v,
            row: fromCell.row + (toCell.row - fromCell.row) * progress,
            col: fromCell.col + (toCell.col - fromCell.col) * progress,
            pathIndex,
            progress,
          };
        });

        // After arrival, wait briefly then return home
        const withReturn = updated.map((v) => {
          if (v.status === 'arrived' && v.arrivalTime !== null) {
            const elapsed = now - v.arrivalTime;
            if (elapsed > 2500) {
              if (v.type === 'drone') {
                // Drone flies straight home
                const path = straightLinePath(
                  Math.round(v.row),
                  Math.round(v.col),
                  v.homeRow,
                  v.homeCol
                );
                if (path.length >= 2) {
                  changed = true;
                  return {
                    ...v,
                    path,
                    pathIndex: 0,
                    progress: 0,
                    status: 'enroute' as const,
                    targetCrisisId: null,
                  } as Vehicle;
                }
              } else {
                const result = computeVehiclePath(v, {
                  id: 'home',
                  row: v.homeRow,
                  col: v.homeCol,
                  severity: 'low',
                  time: 0,
                  resolved: false,
                  resolvedBy: null,
                } as Crisis, roadBlocks);
                if (result) {
                  changed = true;
                  return {
                    ...v,
                    path: result.path,
                    pathIndex: 0,
                    progress: 0,
                    status: 'enroute' as const,
                    targetCrisisId: null,
                  } as Vehicle;
                }
              }
            }
          }

          // If returning home and arrived home
          if (v.status === 'enroute' && v.path.length >= 2) {
            const lastCell = v.path[v.path.length - 1];
            if (
              lastCell.row === v.homeRow &&
              lastCell.col === v.homeCol &&
              v.pathIndex >= v.path.length - 1 &&
              v.targetCrisisId === null
            ) {
              changed = true;
              return {
                ...v,
                row: v.homeRow,
                col: v.homeCol,
                status: 'idle' as const,
                path: [],
                pathIndex: 0,
                progress: 0,
              } as Vehicle;
            }
          }

          return v;
        });

        return changed ? withReturn : prev;
      });

      frameId = requestAnimationFrame(animate);
    };

    lastTime.current = performance.now();
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [isRunning, roadBlocks]);

  // Update stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setVehicles((prevVehicles) => {
        setStats((prevStats) => ({
          ...prevStats,
          activeCrises: crises.filter((c) => !c.resolved).length,
          idleVehicles: prevVehicles.filter((v) => v.status === 'idle').length,
        }));
        return prevVehicles;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [crises]);

  const pendingCrises = crises.filter((c) => !c.resolved).length;
  const idleCount = vehicles.filter((v) => v.status === 'idle').length;
  const canDeploy = pendingCrises > 0 && idleCount > 0;

  return {
    vehicles,
    crises,
    roadBlocks,
    isRunning,
    autoDispatch,
    selectedVehicleId,
    stats,
    canDeploy,
    pendingCrises,
    idleCount,
    setIsRunning,
    setAutoDispatch,
    setSelectedVehicleId,
    dispatchVehicle,
    deployAll,
    addCrisis,
    handleCellClick,
    resetAll,
  };
}
