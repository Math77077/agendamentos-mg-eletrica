import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';

import Home from './pages/Home';
import Login from './pages/Login';
import List from './pages/List';
import Register from './pages/Register';
import MyAppointments from './pages/MyAppointments';

function App() {
  return (
    <Routes>
      {/* rota pública para clientes */}
      <Route path="/" element={<Home />} />
      
      {/* rota de autenticação */}
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Register />} />
      
      {/* rota do painel */}
      <Route path="/admin" element={
        <ProtectedRoute>
          <List />
        </ProtectedRoute>
      } />
      <Route path="/meus-agendamentos" element={
        <ProtectedRoute requiredRole="user">
          <MyAppointments />
        </ProtectedRoute>
      } />
    </Routes>
  );
}

export default App;