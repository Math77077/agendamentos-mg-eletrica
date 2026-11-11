import { useEffect, useState, useContext } from 'react'
import { io } from 'socket.io-client'
import { api } from '../services/api'
import { AuthContext } from '../contexts/AuthContext';


export default function List() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const { logout } = useContext(AuthContext);

  useEffect(() => {
    async function fetchAppointments() {
      try {
        const response = await api.get('/appointments');
        setAppointments(response.data);
      } catch (error) {
        console.error('Erro ao buscar agendamentos:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAppointments();

    const socket = io('http://localhost:5000');

    socket.on('appointment_created', (newAppointment) => {
      setAppointments((prev) => [newAppointment, ...prev]);
    });

    return () => {
      socket.disconnect();
    }
  }, []);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.patch(`/appointments/${id}/status`, { status: newStatus });

      setAppointments((prev) =>
        prev.map((item) =>
          item._id === id ? { ...item, status: newStatus } : item
        )
      );
    } catch (error) {
      console.error('Erro ao atualizar status do agendamento:', error);
      alert(`Erro ao atualizar status: ${error.response?.data?.message || 'Falha na requisição'}`);
    }
  };

  if (loading) {
    return <p>Carregando agendamentos...</p>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Painel de agendamentos</h1>
        <button onClick={logout}>Sair</button>
      </div>

      <p>Lista de agendamentos confirmados e pendentes.</p>
      
      {appointments.length === 0 ? (
        <p>Nenhum agendamento encontrado.</p>  
      ) : (
        <ul> 
          {appointments.map((item) => (
            <li key={item._id} style={{ marginBottom: '10px' }}>
              <strong>ID:</strong> {item._id.slice(-5)} | {' '} 
              <strong>Serviço:</strong> {item.service?.title} | {' '}
              <strong>Cliente:</strong> {item.user?.name} | {' '}
              <strong>Data:</strong> {new Date(item.appointmentDate).toLocaleString('pt-BR', {
                dateStyle: 'short',
                timeStyle: 'short'
              })} | {' '}
              <strong>Status:</strong> {item.status}
              
              <div style={{ marginTop: '5px' }}>
                <button
                  onClick={() => handleStatusChange(item._id, 'confirmed')}
                  disabled={item.status === 'confirmed'}
                  style={{ marginRight: '8px' }}
                >
                  Confirmar
                </button>

                <button
                  onClick={() => handleStatusChange(item._id, 'cancelled')}
                  disabled={item.status === 'cancelled'}
                  style={{ marginRight: '8px' }}
                >
                  Cancelar
                </button>

                <button
                  onClick={() => handleStatusChange(item._id, 'completed')}
                  disabled={item.status === 'completed'}
                >
                  Concluido
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}