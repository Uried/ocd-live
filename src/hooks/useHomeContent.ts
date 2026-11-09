import { useCallback, useEffect, useState } from 'react';
import { contentRepository } from '../services/repositories';
import type { HomeContent } from '../types/content';

type ContentState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; content: HomeContent };

export function useHomeContent() {
  const [state, setState] = useState<ContentState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    contentRepository.getHome().then(
      (content) => { if (active) setState({ status: 'ready', content }); },
      () => { if (active) setState({ status: 'error' }); },
    );
    return () => { active = false; };
  }, [attempt]);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  return { state, retry };
}
