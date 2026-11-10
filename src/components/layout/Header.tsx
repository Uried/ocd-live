import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowUpRight, Menu } from 'lucide-react';
import type { NavigationItem } from '../../types/content';
import { Button } from '../ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Container } from '../common/Container';
import { Logo } from './Logo';

export function Header({ navigation, onBook }: { navigation: NavigationItem[]; onBook: () => void }) {
  const [open, setOpen] = useState(false);
  const { hash, pathname } = useLocation();
  const anchor = pathname === '/' ? `/${hash || '#accueil'}` : null;
  const isCurrent = (href: string) => href === anchor || (pathname !== '/' && href === pathname);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const close = () => { if (media.matches) setOpen(false); };
    media.addEventListener('change', close);
    return () => media.removeEventListener('change', close);
  }, []);
  return (
    <header className="site-header">
      <Container className="header-inner">
        <Logo />
        <nav className="desktop-nav" aria-label="Navigation principale">
          {navigation.map((item) => <Link key={item.href} to={item.href} aria-current={isCurrent(item.href) ? 'location' : undefined}>{item.label}</Link>)}
        </nav>
        <div className="header-actions">
          <Button onClick={onBook} variant="accent" size="small" className="header-book">Réserver un live <ArrowUpRight size={16} aria-hidden="true" /></Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button id="mobile-menu-trigger" variant="ghost" size="icon" className="mobile-toggle" aria-label="Ouvrir le menu"><Menu size={25} /></Button></DialogTrigger>
            <DialogContent className="mobile-menu">
              <DialogTitle className="eyebrow">OCD LIVE · NAVIGATION</DialogTitle>
              <DialogDescription className="sr-only">Accédez aux sections de la page d’accueil.</DialogDescription>
              <nav aria-label="Navigation mobile">
                {navigation.map((item, index) => <DialogClose key={item.href} asChild><Link to={item.href} aria-current={isCurrent(item.href) ? 'location' : undefined}><span>0{index + 1}</span>{item.label}<ArrowUpRight size={23} aria-hidden="true" /></Link></DialogClose>)}
              </nav>
              <DialogClose asChild><Button variant="accent" onClick={onBook}>Réserver un live <ArrowUpRight size={18} aria-hidden="true" /></Button></DialogClose>
              <p className="mobile-menu-note">Votre activité, au premier plan.<br />Au Togo et à distance.</p>
            </DialogContent>
          </Dialog>
        </div>
      </Container>
    </header>
  );
}
