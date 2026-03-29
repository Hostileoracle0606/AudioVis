/**
 * AppScreen manages the alternate terminal screen buffer.
 * Entering the alternate screen hides existing terminal content;
 * exiting restores it exactly as it was.
 */

let _active = false;

export function enterAlternateScreen(): void {
  if (_active) return;
  _active = true;
  process.stdout.write(
    "\x1b[?1049h" +  // enter alternate screen
    "\x1b[?25l"  +   // hide cursor
    "\x1b[2J"    +   // clear screen
    "\x1b[H"         // cursor home
  );
}

export function exitAlternateScreen(): void {
  if (!_active) return;
  _active = false;
  process.stdout.write(
    "\x1b[?25h" +   // show cursor
    "\x1b[?1049l"   // exit alternate screen
  );
}

export function getTerminalSize(): { cols: number; rows: number } {
  return {
    cols: process.stdout.columns ?? 80,
    rows: process.stdout.rows ?? 24,
  };
}
