import { useState, useCallback } from 'react';

let toastFn = null;

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((msg, type = 'default') => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  }, []);

  return { toasts, showToast };
}

export function ToastContainer({ toasts }) {
  return (
    <>
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>{t.msg}</div>
      ))}
    </>
  );
}
