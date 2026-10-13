import { isRoad } from './pathfinding';
import type { RoadBlock } from '@/types';

export function isPassableForAmbulance(
  r: number,
  c: number,
  blocks: RoadBlock[] = []
): boolean {
  if (!isRoad(r, c)) return false;
  return !blocks.some((b) => b.row === r && b.col === c);
}

export function isPassableForDrone(
  _r: number,
  _c: number,
  _blocks: RoadBlock[] = []
): boolean {
  return true;
}
