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
        loading = true;
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}