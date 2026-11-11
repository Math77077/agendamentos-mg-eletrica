import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';

import Home from './pages/Home';
import Login from './pages/Login';
import List from './pages/List';

function App() {
  return (
    <Routes>
      {/* rota pública para clientes */}
      <Route path="/" element={<Home />} />
      
      {/* rota de autenticação */}
      <Route path="/login" element={<Login />} />
      
      {/* rota do painel */}
      <Route path="/admin" element={
        <ProtectedRoute>
          <List />
        </ProtectedRoute>
      } />
    </Routes>
  );
}

export default App;