import type { ReactNode } from 'react';
import type { HomeContent } from '../types/content';
import { Header } from '../components/layout/Header';
import { Footer } from '../components/layout/Footer';

export function PublicLayout({ content, onBook, children }: { content: HomeContent; onBook: () => void; children: ReactNode }) {
  return <><a className="skip-link" href="#main-content">Aller au contenu</a><Header navigation={content.navigation} onBook={onBook} /><main id="main-content" tabIndex={-1}>{children}</main><Footer content={content} /></>;
}
