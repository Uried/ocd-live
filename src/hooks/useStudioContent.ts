import { useCallback, useEffect, useState } from 'react';
import { contentRepository } from '../services/repositories';
import type { HomeContent, StudioContent } from '../types/content';

type StudioState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; home: HomeContent; studio: StudioContent };

export function useStudioContent() {
  const [state, setState] = useState<StudioState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    Promise.all([contentRepository.getHome(), contentRepository.getStudio()]).then(
      ([home, studio]) => { if (active) setState({ status: 'ready', home, studio }); },
      () => { if (active) setState({ status: 'error' }); },
    );
    return () => { active = false; };
  }, [attempt]);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  return { state, retry };
}
