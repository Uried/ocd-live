import { Link, useLocation } from 'react-router-dom';
import credits from '../../assets/images/credits.json';
import type { HomeContent } from '../../types/content';
import { Container } from '../common/Container';
import { Logo } from './Logo';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '../ui/dialog';

export function Footer({ content }: { content: HomeContent }) {
  const { hash, pathname } = useLocation();
  const anchor = pathname === '/' ? `/${hash || '#accueil'}` : null;
  return (
    <footer className="site-footer">
      <Container>
        <div className="footer-main">
          <div className="footer-brand"><Logo inverse /><p>Des activités à découvrir.<br />Des histoires à faire entendre.</p></div>
          <div><h3>EXPLORER</h3><nav aria-label="Navigation de pied de page">{content.navigation.map((item) => <Link key={item.href} to={item.href} aria-current={item.href === anchor || (pathname !== '/' && item.href === pathname) ? 'location' : undefined}>{item.label}</Link>)}</nav></div>
          <div><h3>NOS MODES DE PARTICIPATION</h3><p>{content.footer.location}</p>{content.footer.contact && <p>{content.footer.contact}</p>}<span className="footer-status">Une session à votre image</span></div>
          <div><h3>RESTONS CONNECTÉS</h3>{content.footer.social.map((social) => <p key={social} className="social-placeholder">{social}</p>)}</div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} OCD Live</span>
          <span>Le live shopping, au service de votre activité.</span>
          <Dialog>
            <DialogTrigger className="legal-trigger">Confidentialité & crédits</DialogTrigger>
            <DialogContent>
              <DialogTitle className="dialog-title">Confidentialité & crédits</DialogTitle>
              <DialogDescription>Les informations utiles sur votre navigation et les ressources visuelles d’OCD Live.</DialogDescription>
              <div className="legal-body"><h3>Votre participation</h3><p>Choisissez votre mode de participation et préparez les produits ou services que vous souhaitez présenter.</p><h3>Données personnelles</h3><p>Le choix de votre mode de participation ne demande aucune donnée personnelle.</p><h3>Crédits photographiques</h3><p>La photographie des locaux OCD Live a été fournie pour le projet, ainsi que certains visuels d’illustration. Les autres photographies sont des illustrations sous licence Unsplash.</p><ul>{credits.photos.map((photo) => <li key={photo.source}><a href={photo.source} target="_blank" rel="noreferrer">{photo.author} · Unsplash</a></li>)}</ul></div>
            </DialogContent>
          </Dialog>
        </div>
      </Container>
    </footer>
  );
}
