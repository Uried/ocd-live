import { Link } from 'react-router-dom';
import type { HomeContent } from '../../types/content';
import { Container } from '../common/Container';
import { Logo } from './Logo';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '../ui/dialog';

export function Footer({ content }: { content: HomeContent }) {
  return (
    <footer className="site-footer">
      <Container>
        <div className="footer-main">
          <div className="footer-brand"><Logo inverse /><p>Des activités à découvrir.<br />Des histoires à faire entendre.</p></div>
          <div><h3>EXPLORER</h3><nav aria-label="Navigation de pied de page">{content.navigation.map((item) => <Link key={item.href} to={item.href}>{item.label}</Link>)}</nav></div>
          <div><h3>NOUS TROUVER</h3><p>{content.footer.location}</p><p>{content.footer.contact}</p><span className="footer-status">Contacts officiels à venir</span></div>
          <div><h3>RESTONS CONNECTÉS</h3>{content.footer.social.map((social) => <p key={social} className="social-placeholder">{social}<span>À venir</span></p>)}</div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} OCD Live</span>
          <span>Version de démonstration · Aucune réservation réelle</span>
          <Dialog>
            <DialogTrigger className="legal-trigger">Mentions légales & confidentialité</DialogTrigger>
            <DialogContent>
              <DialogTitle className="dialog-title">Informations sur cette version</DialogTitle>
              <DialogDescription>Cette interface est un prototype frontend. Les informations légales définitives restent à renseigner avant publication.</DialogDescription>
              <div className="legal-body"><h3>Éditeur et contacts</h3><p>Raison sociale, adresse, responsable de publication, hébergeur et contacts officiels : à confirmer.</p><h3>Données personnelles</h3><p>Aucun compte, paiement ou enregistrement de réservation n’est effectué. La préparation de session est temporaire et n’est ni sauvegardée ni transmise.</p><h3>Photographies</h3><p>Images d’illustration sous licence Unsplash, sans lien avec les locaux ou les clients réels d’OCD Live.</p><ul>{[content.hero.photo, ...content.modes.map((mode) => mode.photo)].filter((photo, index, all) => all.findIndex((item) => item.source === photo.source) === index).map((photo) => <li key={photo.source}><a href={photo.source} target="_blank" rel="noreferrer">{photo.credit} · Unsplash</a></li>)}</ul></div>
            </DialogContent>
          </Dialog>
        </div>
      </Container>
    </footer>
  );
}
