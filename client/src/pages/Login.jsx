import { useState, useContext } from "react"
import { AuthContext} from '../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const { login } = useContext(AuthContext);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      await login(email, password);
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Erro ao tentar fazer login.');
    }
  };

  return (
    <div>
      <h1>Acesso administrativo</h1>

      <form onSubmit={handleSubmit}>
        
        <div>
          <label>Email:</label>
          <input 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required 
          />
        </div>

        <div>
          <label>Senha:</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
        </div>

        <button type="submit">Entrar</button>

      </form>
      {errorMsg && <p style={{ color: 'red', fontWeight: 'bold' }}>{errorMsg}</p>}
      
    </div>
  );
}

