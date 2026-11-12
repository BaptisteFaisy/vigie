/**
 * Hook partagé de l'UI Forge : invoque une fonction du resolver et gère le
 * chargement. Une seule implémentation pour tous les écrans (zéro duplication).
 *
 * Règle : fichiers < 500 lignes, fonctions < 50 lignes.
 */
import { useEffect, useState } from 'react';
import { invoke } from '@forge/bridge';

export interface InvokeState<T> {
  data: T | null;
  loading: boolean;
  error: boolean;
}

/** Appelle `invoke(key, payload)` une fois au montage. */
export function useInvoke<T>(key: string, payload: Record<string, unknown> = {}): InvokeState<T> {
  const [state, setState] = useState<InvokeState<T>>({ data: null, loading: true, error: false });
  const payloadKey = JSON.stringify(payload);

  useEffect(() => {
    let alive = true;
    invoke<T>(key, JSON.parse(payloadKey) as Record<string, unknown>)
      .then((data) => { if (alive) setState({ data, loading: false, error: false }); })
      .catch(() => { if (alive) setState({ data: null, loading: false, error: true }); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, payloadKey]);

  return state;
}
