import { createContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  // estado inicial 'null' significa que ninguém está logado
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // verifica se já existe uma sessão salva ao recarregar a página
  useEffect(() => {
    const storageUser = localStorage.getItem('user');
    const storageToken = localStorage.getItem('token');

    if (storageUser && storageToken && storageUser !== 'undefined') {
      try {
        setUser(JSON.parse(storageUser));
        api.defaults.headers.common['Authorization'] = `Bearer ${storageToken}`;
      } catch (error) {
        console.error('Dados de sessão inválidos no localStorage:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    // chamada para a rota de login pública
    const response = await api.post('/auth/login', { email, password });
    const { token, ...userData } = response.data;

    // salva a sessão no armazenamento do navegador
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));

    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);

    // redireciona de acordo com o papel do usuário
    if (userData.role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
