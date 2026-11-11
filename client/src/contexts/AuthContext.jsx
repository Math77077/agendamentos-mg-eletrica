import { createContext, useState } from 'react'
import { api } from '../services/api'
import { useNavigate } from 'react-router-dom';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  // estado inicial 'null' significa que ninguém está logado
  const [user, setUser] = useState(null); 
  const navigate = useNavigate();

  // verifica se já existe uma sessão salva ao recarregar a página
  useEffect(() => {
    const storedUser = localStorage.getItem('@solarev:user');
    const storedToken = localStorage.getItem('@solarev:token');

    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = async (email, password) => {
    try {
      // chamada para a rota de login pública
      const response = await api.post('/auth/login', { email, password });
      
      const { token, ...userData } = response.data;

      // salva a sessão no armazenamento do navegador
      localStorage.setItem('@solarev:token', token);
      localStorage.setItem('@solarev:user', JSON.stringify(userData));

      setUser(userData);
      
      // redireciona de acordo com o papel do usuário
      if (userData.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('Erro no login:', error.response?.data?.message || error.message);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('@solarev:token');
    localStorage.removeItem('@solarev:user');
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
