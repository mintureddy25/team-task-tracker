import { useCallback, useRef, useState } from 'react';
import Modal from './Modal';
import { ConfirmContext, type ConfirmFn, type ConfirmOptions } from './confirm-context';

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>(options => {
    setOpts(options);
    return new Promise<boolean>(resolve => {
      resolver.current = resolve;
    });
  }, []);

  function settle(value: boolean) {
    resolver.current?.(value);
    resolver.current = null;
    setOpts(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal open={!!opts} onClose={() => settle(false)} title={opts?.title ?? 'Confirm'}>
        {opts && (
          <>
            <div className="text-sm text-ink-soft leading-relaxed">{opts.message}</div>
            <div className="flex gap-2 justify-end pt-4 mt-4 border-t border-line">
              <button type="button" className="btn-secondary" onClick={() => settle(false)}>
                {opts.cancelText ?? 'Cancel'}
              </button>
              <button
                type="button"
                className={opts.danger ? 'btn-danger' : 'btn-primary'}
                onClick={() => settle(true)}
              >
                {opts.confirmText ?? 'Confirm'}
              </button>
            </div>
          </>
        )}
      </Modal>
    </ConfirmContext.Provider>
  );
}
