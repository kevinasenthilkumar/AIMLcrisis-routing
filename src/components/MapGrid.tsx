import { useMemo } from 'react';
import type { GridCell, Vehicle, Crisis, RoadBlock } from '@/types';
import { buildGrid, GRID_ROWS, GRID_COLS, ROAD_ROWS, ROAD_COLS } from '@/lib/pathfinding';

interface MapGridProps {
  crises: Crisis[];
  vehicles: Vehicle[];
  roadBlocks: RoadBlock[];
  onCellClick: (row: number, col: number) => void;
  showPathFor: string | null;
}

const BLOCK_ICONS: Record<RoadBlock['type'], string> = {
  traffic: 'T',
  collapse: 'X',
  debris: 'D',
};

const BLOCK_COLORS: Record<RoadBlock['type'], string> = {
  traffic: 'bg-orange-600 text-orange-100',
  collapse: 'bg-red-700 text-red-100',
  debris: 'bg-yellow-700 text-yellow-100',
};

export default function MapGrid({
  crises,
  vehicles,
  roadBlocks,
  onCellClick,
  showPathFor,
}: MapGridProps) {
  const grid = useMemo(() => buildGrid(), []);

  const blockMap = useMemo(() => {
    const m = new Map<string, RoadBlock>();
    for (const b of roadBlocks) m.set(`${b.row},${b.col}`, b);
    return m;
  }, [roadBlocks]);

  // Collect all path cells from enroute vehicles, colored by vehicle type
  const allPathCells = useMemo(() => {
    const cellMap = new Map<string, 'ambulance' | 'drone'>();
    for (const v of vehicles) {
      if (v.status === 'enroute' && v.path.length >= 2) {
        for (let i = v.pathIndex; i < v.path.length; i++) {
          const p = v.path[i];
          const key = `${p.row},${p.col}`;
          // Don't overwrite drone path with ambulance or vice versa - just record first
          if (!cellMap.has(key)) cellMap.set(key, v.type);
        }
      }
    }
    return cellMap;
  }, [vehicles]);

  // Destination cells for enroute vehicles
  const destinations = useMemo(() => {
    const dests = new Map<string, Vehicle>();
    for (const v of vehicles) {
      if (v.status === 'enroute' && v.path.length >= 2) {
        const last = v.path[v.path.length - 1];
        dests.set(`${last.row},${last.col}`, v);
      }
    }
    return dests;
  }, [vehicles]);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900 shadow-2xl">
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
          gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)`,
          aspectRatio: `${GRID_COLS} / ${GRID_ROWS}`,
          width: '100%',
        }}
      >
        {grid.map((rowCells, r) =>
          rowCells.map((cell: GridCell, c) => {
            const isIntersection = ROAD_ROWS.includes(r) && ROAD_COLS.includes(c);
            const crisisHere = crises.find((cr) => cr.row === r && cr.col === c);
            const vehicleHere = vehicles.find(
              (v) => Math.round(v.row) === r && Math.round(v.col) === c
            );
            const blockHere = blockMap.get(`${r},${c}`);
            const pathType = allPathCells.get(`${r},${c}`);
            const destVehicle = destinations.get(`${r},${c}`);
            const isSelectedPath =
              showPathFor &&
              vehicles.find((v) => v.id === showPathFor)?.path.some(
                (p, idx) =>
                  idx >= (vehicles.find((v) => v.id === showPathFor)?.pathIndex ?? 0) &&
                  p.row === r &&
                  p.col === c
              );

            let bg = 'bg-slate-800';

            if (cell.type === 'building') {
              bg = 'bg-slate-800/60';
            } else if (cell.type === 'water') {
              bg = 'bg-sky-900/70';
            } else if (cell.type === 'hospital') {
              bg = 'bg-emerald-600';
            } else if (cell.type === 'road') {
              bg = isIntersection ? 'bg-slate-600' : 'bg-slate-700';
            }

            return (
              <div
                key={`${r}-${c}`}
                onClick={() => onCellClick(r, c)}
                className={`relative flex items-center justify-center cursor-pointer transition-colors duration-150 hover:bg-slate-600/40 ${bg}`}
              >
                {cell.type === 'road' && !isIntersection && (
                  <div className="w-full h-full flex items-center justify-center">
                    {ROAD_COLS.includes(c) && (
                      <div className="absolute w-px h-full border-l border-dashed border-slate-500/40" />
                    )}
                    {ROAD_ROWS.includes(r) && (
                      <div className="absolute h-px w-full border-t border-dashed border-slate-500/40" />
                    )}
                  </div>
                )}
                {cell.type === 'hospital' && (
                  <span className="text-emerald-200 text-[0.5rem] font-bold leading-none text-center">
                    H
                  </span>
                )}
                {cell.type === 'water' && (
                  <span className="text-sky-500/50 text-[0.4rem]">~</span>
                )}

                {/* Path highlight - amber for ambulances, cyan for drones */}
                {pathType && !vehicleHere && cell.type !== 'hospital' && (
                  <div
                    className={`absolute inset-0 rounded-sm ${
                      pathType === 'drone'
                        ? isSelectedPath
                          ? 'bg-cyan-400/40 ring-1 ring-cyan-300'
                          : 'bg-cyan-400/20 ring-1 ring-cyan-400/30'
                        : isSelectedPath
                        ? 'bg-amber-400/50 ring-1 ring-amber-300'
                        : 'bg-amber-400/25 ring-1 ring-amber-400/40'
                    }`}
                  />
                )}

                {/* Road hazard/block */}
                {blockHere && !vehicleHere && (
                  <div
                    className={`absolute inset-0.5 rounded-sm ${BLOCK_COLORS[blockHere.type]} flex items-center justify-center z-10`}
                  >
                    <span className="text-[0.4rem] font-bold leading-none">
                      {BLOCK_ICONS[blockHere.type]}
                    </span>
                  </div>
                )}

                {/* Destination marker for enroute vehicles */}
                {destVehicle && !vehicleHere && (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div
                      className={`w-[50%] h-[50%] rounded-full border-2 border-dashed ${
                        destVehicle.type === 'ambulance'
                          ? 'border-blue-400'
                          : 'border-cyan-300'
                      } animate-pulse`}
                    />
                    <div
                      className={`absolute w-1.5 h-1.5 rounded-full ${
                        destVehicle.type === 'ambulance' ? 'bg-blue-400' : 'bg-cyan-300'
                      }`}
                    />
                  </div>
                )}

                {crisisHere && !crisisHere.resolved && (
                  <CrisisMarker severity={crisisHere.severity} />
                )}
                {crisisHere && crisisHere.resolved && (
                  <div className="absolute inset-0 flex items-center justify-center bg-green-500/20 rounded-sm">
                    <span className="text-green-300 text-[0.5rem]">✓</span>
                  </div>
                )}
                {vehicleHere && <VehicleMarker vehicle={vehicleHere} />}
              </div>
            );
          })
        )}
      </div>

      {/* Legend overlay */}
      <div className="absolute bottom-3 left-3 flex flex-wrap gap-3 rounded-lg bg-slate-900/85 px-3 py-2 text-[0.65rem] backdrop-blur-sm border border-slate-700/50">
        <LegendItem color="bg-emerald-500" label="Hospital" />
        <LegendItem color="bg-slate-600" label="Road" />
        <LegendItem color="bg-sky-900" label="Water" />
        <LegendItem color="bg-red-500" label="Crisis" />
        <LegendItem color="bg-blue-400" label="Ambulance" />
        <LegendItem color="bg-cyan-300" label="Drone" />
        <LegendItem color="bg-amber-400" label="Amb. Path" />
        <LegendItem color="bg-cyan-400" label="Drone Path" />
        <LegendItem color="bg-orange-600" label="Hazard" />
      </div>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`h-2.5 w-2.5 rounded-sm ${color}`} />
      <span className="text-slate-300">{label}</span>
    </div>
  );
}

function CrisisMarker({ severity }: { severity: 'low' | 'medium' | 'high' }) {
  const colors = {
    low: 'bg-yellow-500',
    medium: 'bg-orange-500',
    high: 'bg-red-600',
  };
  const ring = {
    low: 'ring-yellow-400',
    medium: 'ring-orange-400',
    high: 'ring-red-400',
  };
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div
        className={`absolute ${colors[severity]} rounded-full ring-2 ${ring[severity]} animate-ping opacity-60`}
        style={{ width: '70%', height: '70%' }}
      />
      <div
        className={`relative ${colors[severity]} rounded-full ring-2 ${ring[severity]} flex items-center justify-center`}
        style={{ width: '60%', height: '60%' }}
      >
        <span className="text-white text-[0.4rem] font-bold">!</span>
      </div>
    </div>
  );
}

function VehicleMarker({ vehicle }: { vehicle: Vehicle }) {
  if (vehicle.type === 'ambulance') {
    return (
      <div className="absolute inset-0 flex items-center justify-center z-20">
        <div className="relative w-[80%] h-[80%] bg-blue-500 rounded-sm ring-2 ring-blue-300 shadow-lg shadow-blue-500/50 flex items-center justify-center transition-all">
          <span className="text-white text-[0.45rem] font-bold leading-none">A</span>
          {vehicle.status === 'enroute' && (
            <div className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-blue-200 rounded-full animate-pulse" />
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="absolute inset-0 flex items-center justify-center z-20">
      <div className="relative w-[75%] h-[75%] bg-cyan-300 rounded-full ring-2 ring-cyan-100 shadow-lg shadow-cyan-400/50 flex items-center justify-center">
        <span className="text-cyan-900 text-[0.4rem] font-bold leading-none">D</span>
        {vehicle.status === 'enroute' && (
          <div className="absolute -inset-1 border border-cyan-200/50 rounded-full animate-ping" />
        )}
      </div>
    </div>
  );
}
