/** Per-route shell options, set via the route's `handle` (e.g. Ask Efendi is full-height). */
export interface ShellHandle {
  hideFooter?: boolean;
  hideFab?: boolean;
}

export function isShellHandle(handle: unknown): handle is ShellHandle {
  return typeof handle === 'object' && handle !== null;
}
