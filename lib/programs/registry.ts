import { DRIVER_PROGRAM } from "./driver-program";
import type { Program } from "./types";

/**
 * Registry of all available programs. Add new programs here.
 * Adding a program = create a new file in this directory + add to this array.
 * No UI changes needed.
 */
export const PROGRAMS: Program[] = [
  DRIVER_PROGRAM,
  // Future: PUTTING_PROGRAM, IRON_PROGRAM, SHORT_GAME_PROGRAM, etc.
];

export function getProgramById(id: string): Program | undefined {
  return PROGRAMS.find(p => p.id === id);
}
