import { useEffect, useState, useContext } from 'react'
import { io } from 'socket.io-client'
import { Link } from 'react-router-dom';
import { api } from '../services/api'
import { AuthContext } from '../contexts/AuthContext';
import AppHeader from '../components/AppHeader';

const APPOINTMENT_TIME_ZONE = 'America/Manaus';
const IMMUTABLE_SCHEDULE_STATUSES = ['cancelled', 'completed'];
const STATUS_LABELS = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
  completed: 'Concluído',
};

const mergeAppointmentUpdate = (appointment, update) => ({
  ...appointment,
  ...update,
  user: update.user && typeof update.user === 'object' ? update.user : appointment.user,
  service: update.service && typeof update.service === 'object' ? update.service : appointment.service,
});

const toDateTimeInputValue = (date) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APPOINTMENT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
};

export default function List() {
  const [appointments, setAppointments] = useState([]);
  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [servicesError, setServicesError] = useState('');
  const [loading, setLoading] = useState(true);
  const { logout } = useContext(AuthContext);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    serviceId: '',
    name: '',
    phone: '',
    address: '',
    appointmentDate: ''
  });

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

    async function fetchServices() {
      try {
        const response = await api.get('/services');
        setServices(response.data);
      } catch (error) {
        console.error('Erro ao buscar serviços:', error);
        setServicesError('Não foi possível carregar os serviços para edição.');
      } finally {
        setServicesLoading(false);
      }
    }

    fetchServices();

    const socket = io('http://localhost:5000');

    socket.on('appointment_created', (newAppointment) => {
      setAppointments((prev) => [newAppointment, ...prev]);
    });

    socket.on('appointment_updated', (updatedAppointment) => {
      setAppointments((prev) =>
        prev.map((item) => item._id === updatedAppointment._id
          ? mergeAppointmentUpdate(item, updatedAppointment)
          : item)
      );
    });

    return () => {
      socket.disconnect();
    }
  }, []);

  const handleStatusChange = async (id, newStatus) => {
    try {
      const response = await api.patch(`/appointments/${id}/status`, { status: newStatus });

      setAppointments((prev) =>
        prev.map((item) =>
          item._id === id ? mergeAppointmentUpdate(item, response.data) : item
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

  const handleStartEdit = (item) => {
    setEditingId(item._id);
    setEditForm({
      serviceId: item.service?._id || '',
      phone: item.phone || '',
      address: item.address || '',
      name: item.name || item.user?.name || '',
      appointmentDate: item.appointmentDate ? toDateTimeInputValue(new Date(item.appointmentDate)) : ''
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  // envia os dados atualizados para a API e atualiza a tela
  const handleSaveEdit = async (id) => {
    try {
      const response = await api.put(`/appointments/${id}`, {
        serviceId: editForm.serviceId,
        name: editForm.name.trim(),
        phone: editForm.phone.replace(/\D/g, ''),
        address: editForm.address.trim(),
        appointmentDate: editForm.appointmentDate
      });

      setAppointments((prev) =>
        prev.map((item) => (item._id === id ? response.data : item))
      );

      setEditingId(null);
    } catch (error) {
      console.error('Erro ao editar agendamento:', error);
      alert(error.response?.data?.message || 'Erro ao salvar alterações do agendamento.');
    }
  };

  return (
    <main className="page-shell">
      <AppHeader title="Painel de agendamentos">
          <Link to="/">Ver calendário</Link>
          <button type="button" onClick={() => logout()}>Sair</button>
      </AppHeader>

      <p>Lista de agendamentos confirmados e pendentes.</p>
      
      {appointments.length === 0 ? (
        <p>Nenhum agendamento encontrado.</p>  
      ) : (
        <ul aria-label="Agendamentos">
          {appointments.map((item) => {
            const scheduleIsImmutable = IMMUTABLE_SCHEDULE_STATUSES.includes(item.status);

            return (
            <li key={item._id} style={{ marginBottom: '10px' }}>
              {editingId === item._id ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSaveEdit(item._id);
                  }}
                >
                  <h2>Editando agendamento {item._id.slice(-5)}</h2>
                  {servicesError && <p role="alert">{servicesError}</p>}
                  <div style={{ marginTop: '8px' }}>
                    <label htmlFor={`service-${item._id}`}>Serviço desejado: </label>
                    <select
                      id={`service-${item._id}`}
                      value={editForm.serviceId}
                      onChange={(e) => setEditForm({ ...editForm, serviceId: e.target.value })}
                      required
                      disabled={servicesLoading || Boolean(servicesError)}
                      style={{ width: '100%', padding: '8px' }}
                    >
                      {!services.some((service) => service._id === editForm.serviceId) && item.service && (
                        <option value={item.service._id}>
                          {item.service.title} (serviço inativo)
                        </option>
                      )}
                      {services.map((service) => (
                        <option key={service._id} value={service._id}>
                          {service.title} - {service.price > 0 ? `R$ ${service.price}` : 'Preço sob avaliação'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ marginTop: '8px' }}>
                    <label htmlFor={`name-${item._id}`}>Nome: </label>
                    <input
                      id={`name-${item._id}`}
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div style={{ marginTop: '8px' }}>
                    <label htmlFor={`phone-${item._id}`}>Telefone: </label>
                    <input
                      id={`phone-${item._id}`}
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      required
                    />
                  </div>
                  <div style={{ marginTop: '8px' }}>
                    <label htmlFor={`address-${item._id}`}>Endereço: </label>
                    <input
                      id={`address-${item._id}`}
                      type="text"
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      required
                    />
                  </div>
                  <div style={{ marginTop: '8px' }}>
                    <label htmlFor={`appointment-date-${item._id}`}>Data/Hora: </label>
                    <input
                      id={`appointment-date-${item._id}`}
                      type="datetime-local"
                      value={editForm.appointmentDate}
                      onChange={(e) => setEditForm({ ...editForm, appointmentDate: e.target.value })}
                      disabled={scheduleIsImmutable}
                      required
                    />
                  </div>
                  {scheduleIsImmutable && (
                    <p role="status">
                      A data e o horário não podem ser alterados porque este agendamento está {item.status === 'cancelled' ? 'cancelado' : 'concluído'}.
                    </p>
                  )}
                  <div style={{ marginTop: '10px' }}>
                    <button
                      type="submit"
                      style={{ marginRight: '8px' }}
                      disabled={servicesLoading || Boolean(servicesError)}
                    >
                      Salvar
                    </button>
                    <button type="button" onClick={handleCancelEdit}>Cancelar</button>
                  </div>
                </form>
              ) : (
                <article aria-labelledby={`appointment-${item._id}`}>
                  <h2 id={`appointment-${item._id}`}>Agendamento {item._id.slice(-5)}</h2>
                  <dl>
                    <div>
                      <dt>Serviço</dt>
                      <dd>{item.service?.title || 'Não informado'}</dd>
                    </div>
                    <div>
                      <dt>Cliente</dt>
                      <dd>{item.name || item.user?.name || 'Não informado'}</dd>
                    </div>
                    <div>
                      <dt>Telefone</dt>
                      <dd>{item.phone || 'Não informado'}</dd>
                    </div>
                    <div>
                      <dt>Endereço</dt>
                      <dd>{item.address || 'Não informado'}</dd>
                    </div>
                    <div>
                      <dt>Data</dt>
                      <dd>{new Date(item.appointmentDate).toLocaleString('pt-BR', {
                        dateStyle: 'short',
                        timeStyle: 'short'
                      })}</dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>
                        <span className={`status-badge status-badge--${item.status}`}>
                          {STATUS_LABELS[item.status] || item.status}
                        </span>
                      </dd>
                    </div>
                  </dl>

                  <div role="group" aria-label={`Ações do agendamento ${item._id.slice(-5)}`} style={{ marginTop: '5px' }}>
                    <button
                      type="button"
                      onClick={() => handleStartEdit(item)}
                      disabled={servicesLoading || Boolean(servicesError)}
                      style={{ marginRight: '8px' }}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange(item._id, 'confirmed')}
                      disabled={item.status === 'confirmed'}
                      style={{ marginRight: '8px' }}
                    >
                      Confirmar
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStatusChange(item._id, 'cancelled')}
                      disabled={item.status === 'cancelled'}
                      style={{ marginRight: '8px' }}
                    >
                      Cancelar
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStatusChange(item._id, 'completed')}
                      disabled={item.status === 'completed'}
                    >
                      Concluído
                    </button>
                  </div>
                </article>
              )}
            </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}