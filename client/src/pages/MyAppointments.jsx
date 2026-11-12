import { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { api } from '../services/api';
import AppHeader from '../components/AppHeader';

const STATUS_LABELS = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

export default function MyAppointments() {
  const { user, logout } = useContext(AuthContext);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let active = true;

    async function fetchAppointments() {
      try {
        const response = await api.get('/appointments/my');
        if (active) {
          setAppointments(response.data);
        }
      } catch (error) {
        console.error('Erro ao buscar seus agendamentos:', error);
        if (active) {
          setErrorMessage(error.response?.data?.message || 'Não foi possível carregar seus agendamentos.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchAppointments();

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="page-shell">
      <AppHeader title="Meus agendamentos">
        <Link to="/">Calendário</Link>
        <button type="button" onClick={() => logout()}>Sair</button>
      </AppHeader>
      <p>Conta: {user?.name} ({user?.email})</p>

      {loading && <p aria-live="polite">Carregando seus agendamentos...</p>}
      {errorMessage && <p role="alert">{errorMessage}</p>}
      {!loading && !errorMessage && appointments.length === 0 && (
        <p>Você ainda não tem agendamentos.</p>
      )}

      {!loading && appointments.length > 0 && (
        <ul aria-label="Seus agendamentos" style={{ padding: 0, listStyle: 'none' }}>
          {appointments.map((appointment) => (
            <li key={appointment._id} style={{ border: '1px solid #ddd', borderRadius: '6px', padding: '16px', marginBottom: '12px' }}>
              <article aria-labelledby={`appointment-${appointment._id}`}>
                <h2 id={`appointment-${appointment._id}`}>
                  {appointment.service?.title || 'Serviço'}
                </h2>
                <dl>
                  <div><dt>Data e horário</dt><dd>{new Date(appointment.appointmentDate).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</dd></div>
                  <div>
                    <dt>Status</dt>
                    <dd>
                      <span className={`status-badge status-badge--${appointment.status}`}>
                        {STATUS_LABELS[appointment.status] || appointment.status}
                      </span>
                    </dd>
                  </div>
                  <div><dt>Telefone</dt><dd>{appointment.phone || 'Não informado'}</dd></div>
                  <div><dt>Endereço</dt><dd>{appointment.address || 'Não informado'}</dd></div>
                </dl>
              </article>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
