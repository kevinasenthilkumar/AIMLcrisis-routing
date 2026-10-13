export type CellType = 'road' | 'building' | 'water' | 'hospital' | 'crisis';

export interface GridCell {
  row: number;
  col: number;
  type: CellType;
}

export type VehicleType = 'ambulance' | 'drone';

export type VehicleStatus = 'idle' | 'dispatched' | 'enroute' | 'arrived';

export interface Vehicle {
  id: string;
  type: VehicleType;
  name: string;
  row: number;
  col: number;
  homeRow: number;
  homeCol: number;
  path: GridCell[];
  pathIndex: number;
  targetCrisisId: string | null;
  status: VehicleStatus;
  speed: number;
  progress: number;
  dispatchTime: number;
  arrivalTime: number | null;
}

export interface Crisis {
  id: string;
  row: number;
  col: number;
  severity: 'low' | 'medium' | 'high';
  time: number;
  resolved: boolean;
  resolvedBy: string | null;
}

export interface RoadBlock {
  row: number;
  col: number;
  type: 'traffic' | 'collapse' | 'debris';
}

export interface SimulationStats {
  totalDispatched: number;
  totalResolved: number;
  avgResponseTime: number;
  activeCrises: number;
  idleVehicles: number;
}

export interface MapNode {
  row: number;
  col: number;
  g: number;
  h: number;
  f: number;
  parent: MapNode | null;
}
