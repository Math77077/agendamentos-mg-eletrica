import { Link } from 'react-router-dom';
import logo from '../assets/logo-MG.png';

export default function AppHeader({ title, children }) {
  return (
    <header className="app-header">
      <Link to="/" className="app-header__brand" aria-label="MG Elétrica — início">
        <img src={logo} alt="MG Elétrica" />
      </Link>
      <h1>{title}</h1>
      <nav aria-label="Navegação" className="app-header__nav">
        {children}
      </nav>
    </header>
  );
}
