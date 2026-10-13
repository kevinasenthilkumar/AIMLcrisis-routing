import { useCallback } from 'react';
import { Siren, Radio, Navigation } from 'lucide-react';
import MapGrid from '@/components/MapGrid';
import ControlPanel from '@/components/ControlPanel';
import { useSimulation } from '@/hooks/useSimulation';
import { GRID_ROWS, GRID_COLS } from '@/lib/pathfinding';

export default function App() {
  const sim = useSimulation();

  const handleAddRandomCrisis = useCallback(() => {
    const row = Math.floor(Math.random() * (GRID_ROWS - 2)) + 1;
    const col = Math.floor(Math.random() * (GRID_COLS - 2)) + 1;
    sim.addCrisis(row, col);
  }, [sim]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-orange-600 shadow-lg shadow-red-600/30">
              <Siren className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight">
                Crisis Routing System
              </h1>
              <p className="text-xs text-slate-400 hidden sm:block">
                Emergency vehicle dispatch & shortest-path navigation
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>Live Dispatch</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Navigation className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-300">A* Pathfinding</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 h-[calc(100vh-72px)]">
          {/* Map area */}
          <div className="flex flex-col gap-3 min-h-0">
            <div className="flex-1 min-h-0 flex items-center justify-center">
              <MapGrid
                crises={sim.crises}
                vehicles={sim.vehicles}
                roadBlocks={sim.roadBlocks}
                onCellClick={sim.handleCellClick}
                showPathFor={sim.selectedVehicleId}
              />
            </div>
            <div className="rounded-xl bg-slate-900/60 border border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs">
              <span className="text-slate-400">
                Click the map to mark crisis locations. Road hazards appear near crises -- ambulances reroute, drones fly over. Press Deploy to send all units.
              </span>
              <span className="text-slate-500 hidden sm:inline">
                Grid: {GRID_ROWS} × {GRID_COLS}
              </span>
            </div>
          </div>

          {/* Side panel */}
          <aside className="rounded-2xl bg-slate-900/60 border border-slate-800 p-4 overflow-hidden flex flex-col min-h-0">
            <ControlPanel
              vehicles={sim.vehicles}
              crises={sim.crises}
              roadBlocks={sim.roadBlocks}
              stats={sim.stats}
              isRunning={sim.isRunning}
              autoDispatch={sim.autoDispatch}
              selectedVehicleId={sim.selectedVehicleId}
              canDeploy={sim.canDeploy}
              pendingCrises={sim.pendingCrises}
              onToggleRun={() => sim.setIsRunning(!sim.isRunning)}
              onToggleAutoDispatch={() => sim.setAutoDispatch(!sim.autoDispatch)}
              onSelectVehicle={sim.setSelectedVehicleId}
              onReset={sim.resetAll}
              onAddRandomCrisis={handleAddRandomCrisis}
              onDeploy={sim.deployAll}
            />
          </aside>
        </div>
      </main>
    </div>
  );
}
