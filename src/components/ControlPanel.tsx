import {
  Ambulance,
  Plane,
  Activity,
  Pause,
  Play,
  RotateCcw,
  Zap,
  MapPin,
  Send,
  Target,
  AlertTriangle,
} from 'lucide-react';
import type { Vehicle, Crisis, RoadBlock } from '@/types';
import type { SimulationStats } from '@/types';

interface ControlPanelProps {
  vehicles: Vehicle[];
  crises: Crisis[];
  roadBlocks: RoadBlock[];
  stats: SimulationStats;
  isRunning: boolean;
  autoDispatch: boolean;
  selectedVehicleId: string | null;
  canDeploy: boolean;
  pendingCrises: number;
  onToggleRun: () => void;
  onToggleAutoDispatch: () => void;
  onSelectVehicle: (id: string | null) => void;
  onReset: () => void;
  onAddRandomCrisis: () => void;
  onDeploy: () => void;
}

export default function ControlPanel({
  vehicles,
  crises,
  roadBlocks,
  stats,
  isRunning,
  autoDispatch,
  selectedVehicleId,
  canDeploy,
  pendingCrises,
  onToggleRun,
  onToggleAutoDispatch,
  onSelectVehicle,
  onReset,
  onAddRandomCrisis,
  onDeploy,
}: ControlPanelProps) {
  const idleCount = vehicles.filter((v) => v.status === 'idle').length;

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-amber-400" />
          Dispatch Control
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Step 1: Click the map to mark crisis locations. Step 2: Press Deploy to route vehicles.
        </p>
      </div>

      {/* Deploy button - primary action */}
      <button
        onClick={onDeploy}
        disabled={!canDeploy}
        className={`flex items-center justify-center gap-2.5 rounded-xl px-4 py-3.5 text-base font-bold transition-all ${
          canDeploy
            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-900 hover:from-amber-400 hover:to-orange-400 shadow-lg shadow-amber-500/30 active:scale-[0.98]'
            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
        }`}
      >
        <Send className="w-5 h-5" />
        Deploy Units
        {pendingCrises > 0 && (
          <span
            className={`ml-1 rounded-full px-2 py-0.5 text-xs font-bold ${
              canDeploy ? 'bg-slate-900/20 text-slate-900' : 'bg-slate-700 text-slate-500'
            }`}
          >
            {pendingCrises} pending
          </span>
        )}
      </button>

      {/* Secondary action buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onAddRandomCrisis}
          className="flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold bg-red-600/80 text-white hover:bg-red-500 transition-all"
        >
          <Zap className="w-4 h-4" />
          Random Crisis
        </button>
        <button
          onClick={onToggleAutoDispatch}
          className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all ${
            autoDispatch
              ? 'bg-amber-500 text-slate-900 hover:bg-amber-400'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          <Zap className="w-4 h-4" />
          Auto {autoDispatch ? 'ON' : 'OFF'}
        </button>
        <button
          onClick={onToggleRun}
          className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all ${
            isRunning
              ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
              : 'bg-emerald-600 text-white hover:bg-emerald-500'
          }`}
        >
          {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {isRunning ? 'Pause' : 'Resume'}
        </button>
        <button
          onClick={onReset}
          className="flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold bg-slate-700 text-slate-300 hover:bg-slate-600 transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>
      </div>

      {/* Deploy status banner */}
      {pendingCrises > 0 && !canDeploy && idleCount === 0 && (
        <div className="rounded-lg bg-amber-900/30 border border-amber-700/40 px-3 py-2 text-xs text-amber-300 flex items-center gap-2">
          <Target className="w-3.5 h-3.5" />
          All units busy. Crises will be handled when units return.
        </div>
      )}

      {/* Road hazards banner */}
      {roadBlocks.length > 0 && (
        <div className="rounded-lg bg-orange-900/20 border border-orange-700/30 px-3 py-2 text-xs text-orange-300 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            {roadBlocks.length} road hazard{roadBlocks.length !== 1 ? 's' : ''} detected.
            Ambulances reroute; drones fly over.
          </span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Active Crises" value={stats.activeCrises} color="text-red-400" />
        <StatCard label="Idle Units" value={stats.idleVehicles} color="text-emerald-400" />
        <StatCard label="Resolved" value={stats.totalResolved} color="text-sky-400" />
        <StatCard
          label="Avg Response"
          value={stats.avgResponseTime > 0 ? `${stats.avgResponseTime.toFixed(1)}s` : '--'}
          color="text-amber-400"
        />
      </div>

      {/* Vehicle list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Fleet Status
        </h3>
        <div className="space-y-2">
          {vehicles.map((v) => (
            <VehicleCard
              key={v.id}
              vehicle={v}
              isSelected={selectedVehicleId === v.id}
              onClick={() =>
                onSelectVehicle(selectedVehicleId === v.id ? null : v.id)
              }
            />
          ))}
        </div>
      </div>

      {/* Active crises list */}
      {crises.filter((c) => !c.resolved).length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Active Crises
          </h3>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {crises
              .filter((c) => !c.resolved)
              .map((c) => {
                const assignedVehicle = vehicles.find(
                  (v) => v.targetCrisisId === c.id && v.status === 'enroute'
                );
                return (
                  <div
                    key={c.id}
                    className="flex items-center gap-2 rounded-lg bg-slate-800/60 px-2.5 py-1.5 text-xs"
                  >
                    <MapPin
                      className={`w-3 h-3 ${
                        c.severity === 'high'
                          ? 'text-red-500'
                          : c.severity === 'medium'
                          ? 'text-orange-500'
                          : 'text-yellow-500'
                      }`}
                    />
                    <span className="text-slate-300">
                      Sector {c.row},{c.col}
                    </span>
                    {assignedVehicle && (
                      <span className="text-amber-400 text-[0.65rem] font-semibold">
                        {assignedVehicle.name}
                      </span>
                    )}
                    <span
                      className={`ml-auto rounded px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase ${
                        c.severity === 'high'
                          ? 'bg-red-900/50 text-red-300'
                          : c.severity === 'medium'
                          ? 'bg-orange-900/50 text-orange-300'
                          : 'bg-yellow-900/50 text-yellow-300'
                      }`}
                    >
                      {c.severity}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="rounded-lg bg-slate-800/60 border border-slate-700/40 px-3 py-2">
      <div className="text-[0.65rem] text-slate-400 uppercase tracking-wider">{label}</div>
      <div className={`text-lg font-bold ${color}`}>{value}</div>
    </div>
  );
}

function VehicleCard({
  vehicle,
  isSelected,
  onClick,
}: {
  vehicle: Vehicle;
  isSelected: boolean;
  onClick: () => void;
}) {
  const Icon = vehicle.type === 'ambulance' ? Ambulance : Plane;
  const statusColor =
    vehicle.status === 'idle'
      ? 'bg-emerald-500'
      : vehicle.status === 'enroute'
      ? 'bg-amber-500 animate-pulse'
      : vehicle.status === 'arrived'
      ? 'bg-sky-500'
      : 'bg-slate-500';

  const statusLabel =
    vehicle.status === 'idle'
      ? 'Standby'
      : vehicle.status === 'enroute'
      ? vehicle.targetCrisisId
        ? 'En Route'
        : 'Returning'
      : vehicle.status === 'arrived'
      ? 'On Scene'
      : 'Idle';

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all text-left ${
        isSelected
          ? 'bg-slate-700 ring-1 ring-amber-400/50'
          : 'bg-slate-800/60 hover:bg-slate-800'
      }`}
    >
      <div
        className={`flex items-center justify-center w-8 h-8 rounded-lg ${
          vehicle.type === 'ambulance' ? 'bg-blue-900/50' : 'bg-cyan-900/50'
        }`}
      >
        <Icon
          className={`w-4 h-4 ${
            vehicle.type === 'ambulance' ? 'text-blue-400' : 'text-cyan-300'
          }`}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-slate-200 truncate">{vehicle.name}</div>
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${statusColor}`} />
          <span className="text-xs text-slate-400">{statusLabel}</span>
        </div>
      </div>
    </button>
  );
}
