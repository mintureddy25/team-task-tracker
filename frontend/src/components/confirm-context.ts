import { createContext, useContext } from 'react';

export interface ConfirmOptions {
  title?: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

export type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

export const ConfirmContext = createContext<ConfirmFn>(() => Promise.resolve(false));

/** `const confirm = useConfirm(); if (!(await confirm({...}))) return;` */
export function useConfirm() {
  return useContext(ConfirmContext);
}
