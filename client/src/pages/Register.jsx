import { useContext, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import AppHeader from '../components/AppHeader';

export default function Register() {
  const { register, user, logout, loading } = useContext(AuthContext);
  const location = useLocation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isAdmin = user?.role === 'admin';

  if (loading) {
    return <p>Verificando sessão...</p>;
  }

  if (user && !isAdmin) {
    return <Navigate replace to="/" />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setSubmitting(true);

    try {
      await register(name.trim(), email.trim(), password, {
        booking: location.state?.booking,
      });
    } catch (error) {
      console.error('Erro ao criar conta:', error);
      setErrorMessage(error.response?.data?.message || 'Não foi possível criar sua conta.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="page-shell page-shell--narrow">
      <AppHeader title="Criar conta de usuário">
        <Link to="/">Início</Link>
      </AppHeader>
      <p>O cadastro é para clientes. Contas administrativas são criadas separadamente.</p>

      {isAdmin ? (
        <section>
          <p>Você está conectado como administrador. Saia dessa conta para cadastrar um usuário comum.</p>
          <button type="button" onClick={() => logout('/registro')}>Sair e continuar cadastro</button>
        </section>
      ) : (
        <>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '15px' }}>
              <label htmlFor="register-name">Nome:</label>
              <input
                id="register-name"
                type="text"
                autoComplete="name"
                minLength={2}
                maxLength={100}
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                style={{ display: 'block', width: '100%', padding: '10px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label htmlFor="register-email">Email:</label>
              <input
                id="register-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                style={{ display: 'block', width: '100%', padding: '10px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label htmlFor="register-password">Senha (mínimo 6 caracteres):</label>
              <input
                id="register-password"
                type="password"
                autoComplete="new-password"
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                style={{ display: 'block', width: '100%', padding: '10px', boxSizing: 'border-box' }}
              />
            </div>

            {errorMessage && <p role="alert" style={{ color: '#b00020' }}>{errorMessage}</p>}

            <button type="submit" disabled={submitting} style={{ padding: '10px 16px' }}>
              {submitting ? 'Criando conta...' : 'Criar conta'}
            </button>
          </form>

          <p>Já tem cadastro? <Link to="/login" state={location.state}>Entrar</Link></p>
        </>
      )}
    </main>
  );
}
