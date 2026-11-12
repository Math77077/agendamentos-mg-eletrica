import { useState, useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import AppHeader from '../components/AppHeader';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const { login } = useContext(AuthContext);
  const location = useLocation();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      await login(email, password, location.state);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Erro ao tentar fazer login.');
    }
  };

  return (
    <main className="page-shell page-shell--narrow">
      <AppHeader title="Entrar na sua conta">
        <Link to="/">Início</Link>
      </AppHeader>

      <form onSubmit={handleSubmit}>
        
        <div>
          <label htmlFor="login-email">Email:</label>
          <input 
            id="login-email"
            type="email" 
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required 
          />
        </div>

        <div>
          <label htmlFor="login-password">Senha:</label>
          <input 
            id="login-password"
            type="password" 
            autoComplete="current-password"
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
        </div>

        <button type="submit">Entrar</button>

      </form>
      {errorMsg && <p style={{ color: 'red', fontWeight: 'bold' }}>{errorMsg}</p>}
      <p>Não tem conta? <Link to="/registro" state={location.state}>Cadastre-se</Link></p>
    </main>
  );
}
