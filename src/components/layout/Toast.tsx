import { useView } from '../../state/view';

export function Toast() {
  const toast = useView((s) => s.toast);
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-20 z-[70] flex justify-center px-4 lg:bottom-6"
    >
      {toast && (
        <div className="glass bg-panel-solid px-4 py-2 text-sm font-medium shadow-xl">{toast}</div>
      )}
    </div>
  );
}
