/** A brief compositor fade for an already accepted doorway. */
export function mountDoorLight(layer: HTMLElement) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let current: Animation | undefined;
  const stop = () => {
    current?.cancel();
    current = undefined;
  };
  reduced.addEventListener('change', () => {
    if (reduced.matches) stop();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
  });
  return () => {
    if (reduced.matches || document.hidden || typeof layer.animate !== 'function') return;
    stop();
    current = layer.animate([{ opacity: .56 }, { opacity: 0 }], {
      duration: 220,
      easing: 'ease-out',
    });
  };
}
