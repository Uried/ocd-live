import { Link } from 'react-router-dom';
import logo from '../../assets/images/ocd-logo.png';

export function Logo({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link to="/#accueil" className={`logo${inverse ? ' logo-inverse' : ''}`} aria-label="OCD Live — Accueil">
      <span className="logo-lockup">
        <img className="logo-image" src={logo} alt="" width="169" height="64" decoding="async" />
        <span className="logo-live">Live</span>
      </span>
    </Link>
  );
}
