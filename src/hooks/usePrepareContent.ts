import { useCallback, useEffect, useState } from 'react';
import { contentRepository } from '../services/repositories';
import type { HomeContent, PrepareContent } from '../types/content';

type PrepareState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; home: HomeContent; prepare: PrepareContent };

export function usePrepareContent() {
  const [state, setState] = useState<PrepareState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    Promise.all([contentRepository.getHome(), contentRepository.getPrepare()]).then(
      ([home, prepare]) => { if (active) setState({ status: 'ready', home, prepare }); },
      () => { if (active) setState({ status: 'error' }); },
    );
    return () => { active = false; };
  }, [attempt]);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  return { state, retry };
}
