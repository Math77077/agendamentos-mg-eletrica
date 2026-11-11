import { useEffect, useState } from 'react'
import { api } from '../services/api';


export default function List() {
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    async function fetchAppointments() {
      try {
        const response = await api.get('/appointments');
        setAppointments(response.data);
      } catch (error) {
        console.error('Erro ao buscar agendamentos:', error);
      }
    }

    fetchAppointments();
  }, []);

  return (
    <div>
      <h1>Painel de agendamentos</h1>
      <p>Lista de agendamentos confirmados e pendentes.</p>
      
      <ul> 
        {appointments.map((item) => (
          <li key={item._id} style={{ marginBotton: '10px' }}>
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
    </div>
  );
}