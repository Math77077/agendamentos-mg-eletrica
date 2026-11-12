import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { api } from '../services/api';
import { AuthContext } from '../contexts/AuthContext';
import AppHeader from '../components/AppHeader';

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const MONTH_FORMATTER = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const DATE_FORMATTER = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full', timeZone: 'UTC' });

const getMonthKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const getDateForMonthDay = (year, month, day) =>
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

const formatDate = (dateKey) => DATE_FORMATTER.format(new Date(`${dateKey}T12:00:00Z`));

const getDayStatusColor = (status) => ({
  pending: '#dc3545',
  confirmed: '#ffc107',
  completed: '#28a745',
}[status] || '#6c757d');

export default function Home() {
  const { user, logout, loading: authLoading } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';
  const canBook = user?.role === 'user';
  const canCreateAppointment = canBook || isAdmin;
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(() => location.state?.booking?.serviceId || '');
  const [selectedDate, setSelectedDate] = useState(() => location.state?.booking?.date || '');
  const [selectedTime, setSelectedTime] = useState(() => location.state?.booking?.time || '');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [calendarDays, setCalendarDays] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [calendarError, setCalendarError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    async function fetchServices() {
      try {
        const response = await api.get('/services');
        setServices(response.data);
        if (response.data.length > 0) {
          setSelectedService((current) =>
            response.data.some((service) => service._id === current)
              ? current
              : response.data[0]._id
          );
        }
      } catch (error) {
        console.error('Erro ao buscar serviços:', error);
        setFeedback({
          type: 'error',
          text: error.response?.data?.message || 'Não foi possível carregar os serviços.',
        });
      } finally {
        setLoading(false);
      }
    }

    fetchServices();
  }, []);

  useEffect(() => {
    if (location.state?.booking) {
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  const fetchAvailability = useCallback(async () => {
    if (authLoading || (!isAdmin && !selectedService)) {
      return;
    }

    setCalendarLoading(true);
    setCalendarError('');
    try {
      const params = { month: getMonthKey(calendarMonth) };
      if (selectedService) {
        params.serviceId = selectedService;
      }
      const endpoint = isAdmin ? '/appointments/availability/admin' : '/appointments/availability';
      const response = await api.get(endpoint, { params });
      setCalendarDays(response.data.days);
    } catch (error) {
      console.error('Erro ao buscar disponibilidade:', error);
      setCalendarError(error.response?.data?.message || 'Não foi possível carregar a disponibilidade.');
      setCalendarDays([]);
    } finally {
      setCalendarLoading(false);
    }
  }, [authLoading, calendarMonth, isAdmin, selectedService]);

  useEffect(() => {
    if (authLoading || (!isAdmin && !selectedService)) {
      return undefined;
    }

    let active = true;
    const params = { month: getMonthKey(calendarMonth) };
    if (selectedService) {
      params.serviceId = selectedService;
    }
    const endpoint = isAdmin ? '/appointments/availability/admin' : '/appointments/availability';

    api.get(endpoint, { params })
      .then((response) => {
        if (active) {
          setCalendarDays(response.data.days);
          setCalendarError('');
        }
      })
      .catch((error) => {
        console.error('Erro ao buscar disponibilidade:', error);
        if (active) {
          setCalendarError(error.response?.data?.message || 'Não foi possível carregar a disponibilidade.');
          setCalendarDays([]);
        }
      })
      .finally(() => {
        if (active) {
          setCalendarLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [authLoading, calendarMonth, isAdmin, selectedService]);

  useEffect(() => {
    if (!isAdmin || authLoading) {
      return undefined;
    }

    const socket = io('http://localhost:5000');
    socket.on('availability_changed', fetchAvailability);

    return () => socket.disconnect();
  }, [authLoading, fetchAvailability, isAdmin]);

  const daysByDate = useMemo(
    () => new Map(calendarDays.map((day) => [day.date, day])),
    [calendarDays]
  );
  const selectedDay = daysByDate.get(selectedDate);
  const availableSlots = selectedDay?.slots.filter((slot) => slot.available) || [];
  const firstWeekday = (new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay() + 6) % 7;
  const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
  const calendarCells = [
    ...Array.from({ length: firstWeekday }, (_, index) => ({ key: `empty-${index}` })),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const date = getDateForMonthDay(calendarMonth.getFullYear(), calendarMonth.getMonth(), index + 1);
      return { key: date, date, data: daysByDate.get(date) };
    }),
  ];
  while (calendarCells.length % 7 !== 0) {
    calendarCells.push({ key: `empty-end-${calendarCells.length}` });
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    const customerName = name.trim() || user?.name?.trim() || '';
    const normalizedPhone = phone.replace(/\D/g, '');
    const missingFields = [];

    if (!selectedService) missingFields.push('serviço');
    if (!selectedDate) missingFields.push('data');
    if (!selectedTime) missingFields.push('horário');
    if (!customerName) missingFields.push('nome');
    if (!normalizedPhone) missingFields.push('telefone / WhatsApp');
    if (!address.trim()) missingFields.push('endereço completo');

    if (missingFields.length > 0) {
      setFeedback({
        type: 'error',
        text: `Preencha os campos obrigatórios: ${missingFields.join(', ')}.`,
      });
      return;
    }

    if (!/^[0-9]{10,11}$/.test(normalizedPhone)) {
      setFeedback({ type: 'error', text: 'Informe um telefone com DDD e 10 ou 11 dígitos.' });
      return;
    }

    const selectedSlot = availableSlots.find((slot) => slot.time === selectedTime);
    if (!selectedSlot) {
      setFeedback({ type: 'error', text: 'Esse horário não está mais disponível. Escolha outro horário.' });
      await fetchAvailability();
      return;
    }

    try {
      setSubmitting(true);
      setFeedback(null);

      await api.post('/appointments', {
        serviceId: selectedService,
        appointmentDate: selectedSlot.appointmentDate,
        name: customerName,
        phone: normalizedPhone,
        address: address.trim(),
      });

      setFeedback({ type: 'success', text: 'Agendamento solicitado com sucesso!' });
      setSelectedDate('');
      setSelectedTime('');
      setName('');
      setPhone('');
      setAddress('');
      await fetchAvailability();
    } catch (error) {
      console.error('Erro ao solicitar agendamento:', error);
      setFeedback({
        type: 'error',
        text: error.response?.data?.message || 'Falha ao solicitar agendamento.',
      });
      if (error.response?.status === 409) {
        await fetchAvailability();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const changeMonth = (amount) => {
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
    setSelectedDate('');
    setSelectedTime('');
    setCalendarLoading(true);
  };

  const handleServiceChange = (event) => {
    setSelectedService(event.target.value);
    setCalendarLoading(true);
  };

  const serviceSelector = (
    <div style={{ marginBottom: '15px' }}>
      <label htmlFor="service" style={{ display: 'block', marginBottom: '5px' }}>
        Serviço desejado:
      </label>
      <select
        id="service"
        value={selectedService}
        onChange={handleServiceChange}
        style={{ width: '100%', padding: '10px', fontSize: '16px' }}
      >
        {services.map((service) => (
          <option key={service._id} value={service._id}>
            {service.title} - {service.price > 0 ? `R$ ${service.price}` : 'Preço sob avaliação'}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <main className="page-shell">
      <AppHeader title="Solicitar agendamento">
          {isAdmin && <Link to="/admin">Painel administrativo</Link>}
          {canBook && <Link to="/meus-agendamentos">Meus agendamentos</Link>}
          {!user && <Link to="/login">Entrar</Link>}
          {!canBook && <Link to="/registro">Cadastro de usuário</Link>}
          {user && <button type="button" onClick={() => logout()}>Sair</button>}
      </AppHeader>

      {loading || authLoading ? (
        <p>Carregando serviços disponíveis...</p>
      ) : (
        <>
          <p>Escolha um serviço e consulte o calendário para ver os horários disponíveis.</p>

          {feedback && (
            <div
              role="status"
              style={{
                padding: '10px',
                marginBottom: '15px',
                borderRadius: '4px',
                backgroundColor: feedback.type === 'success' ? '#d4edda' : '#f8d7da',
                color: feedback.type === 'success' ? '#155724' : '#721c24',
              }}
            >
              {feedback.text}
            </div>
          )}

          {services.length === 0 ? (
            <p>Nenhum serviço disponível para agendamento.</p>
          ) : (
            <>
              <section aria-labelledby="availability-heading" style={{ marginBottom: '24px' }}>
                <h2 id="availability-heading">Disponibilidade</h2>
                <p>Segunda a sexta, das 08h às 18h; sábado, das 08h às 12h. Horários de hora em hora.</p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <button className="calendar-nav-button" type="button" onClick={() => changeMonth(-1)} aria-label="Mês anterior">‹</button>
                  <h3 style={{ textTransform: 'capitalize', margin: 0 }}>
                    {MONTH_FORMATTER.format(new Date(Date.UTC(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1)))}
                  </h3>
                  <button className="calendar-nav-button" type="button" onClick={() => changeMonth(1)} aria-label="Próximo mês">›</button>
                </div>

                {calendarError && <p role="alert">{calendarError}</p>}
                {calendarLoading && <p aria-live="polite">Atualizando calendário...</p>}

                <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
                  <caption style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)' }}>
                    Calendário de disponibilidade para {MONTH_FORMATTER.format(new Date(Date.UTC(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1)))}
                  </caption>
                  <thead>
                    <tr>
                      {WEEKDAYS.map((weekday) => (
                        <th key={weekday} scope="col" style={{ padding: '6px' }}>{weekday}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: calendarCells.length / 7 }, (_, weekIndex) => (
                      <tr key={`week-${weekIndex}`}>
                        {calendarCells.slice(weekIndex * 7, weekIndex * 7 + 7).map((cell) => {
                          const day = cell.data;
                          const isSelected = selectedDate === cell.date;
                          const isUnavailable = day?.isOpen && !day.slots.some((slot) => slot.available);

                          return (
                            <td key={cell.key} style={{ border: '1px solid #ddd', height: '90px', verticalAlign: 'top', padding: '3px' }}>
                              {cell.date && day && (
                                <button
                                  className="calendar-day-button"
                                  type="button"
                                  onClick={() => {
                                    setSelectedDate(cell.date);
                                    setSelectedTime('');
                                  }}
                                  disabled={day.isPast || !day.isOpen || calendarLoading}
                                  aria-pressed={isSelected}
                                  aria-label={`${cell.date}${!day.isOpen ? ', sem atendimento' : isUnavailable ? ', sem horários disponíveis' : ''}`}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    minHeight: '82px',
                                    border: isSelected ? '2px solid #007bff' : '1px solid transparent',
                                    borderRadius: '4px',
                                    backgroundColor: isUnavailable ? '#f8d7da' : '#fff',
                                    textAlign: 'left',
                                    padding: '4px',
                                    cursor: day.isPast || !day.isOpen ? 'not-allowed' : 'pointer',
                                    opacity: day.isPast || !day.isOpen ? 0.5 : 1,
                                  }}
                                >
                                  <strong>{Number(cell.date.slice(-2))}</strong>
                                  {isAdmin ? (
                                    <div style={{ fontSize: '11px', marginTop: '3px' }}>
                                      {day.appointments?.slice(0, 3).map((appointment, index) => (
                                        <div
                                          key={`${appointment.time}-${appointment.status}-${index}`}
                                          title={`${appointment.time} - ${appointment.serviceTitle}`}
                                          style={{
                                            overflow: 'hidden',
                                            whiteSpace: 'nowrap',
                                            textOverflow: 'ellipsis',
                                            backgroundColor: getDayStatusColor(appointment.status),
                                            color: appointment.status === 'confirmed' ? '#212529' : '#fff',
                                            borderRadius: '3px',
                                            padding: '1px 2px',
                                            marginTop: '2px',
                                          }}
                                        >
                                          {appointment.time} {appointment.status === 'pending' ? 'Pendente' : appointment.status === 'confirmed' ? 'Confirmado' : 'Concluído'}
                                        </div>
                                      ))}
                                      {(day.appointments?.length || 0) > 3 && <span>+{day.appointments.length - 3}</span>}
                                    </div>
                                  ) : (
                                    <div style={{ fontSize: '11px', marginTop: '4px' }}>
                                      {!day.isOpen
                                        ? 'Sem atendimento'
                                        : isUnavailable
                                          ? 'Indisponível'
                                          : `${day.slots.filter((slot) => slot.available).length} horários livres`}
                                    </div>
                                  )}
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {isAdmin && (
                  <ul aria-label="Legenda de status" style={{ display: 'flex', gap: '16px', listStyle: 'none', padding: 0 }}>
                    <li><span style={{ color: getDayStatusColor('pending') }}>■</span> Pendente</li>
                    <li><span style={{ color: getDayStatusColor('confirmed') }}>■</span> Confirmado</li>
                    <li><span style={{ color: getDayStatusColor('completed') }}>■</span> Concluído</li>
                  </ul>
                )}
              </section>

              {selectedDate && selectedDay && (
                <section aria-labelledby="selected-day-heading">
                  <h2 id="selected-day-heading">{formatDate(selectedDate)}</h2>

                  {isAdmin && selectedDay.appointments?.length > 0 && (
                    <ul aria-label="Agendamentos do dia">
                      {selectedDay.appointments.map((appointment, index) => (
                        <li key={`${appointment.time}-${appointment.status}-${index}`}>
                          <span style={{ color: getDayStatusColor(appointment.status) }}>
                            {appointment.time} — {appointment.status === 'pending' ? 'Pendente' : appointment.status === 'confirmed' ? 'Confirmado' : 'Concluído'}
                          </span>
                          {' — '}{appointment.serviceTitle}
                        </li>
                      ))}
                    </ul>
                  )}

                  <fieldset style={{ margin: '12px 0', padding: '12px' }}>
                    <legend>Horários</legend>
                    {selectedDay.slots.length === 0 ? (
                      <p>Não há atendimento nesta data.</p>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {selectedDay.slots.map((slot) => (
                          <button
                            className="calendar-slot-button"
                            key={slot.time}
                            type="button"
                            disabled={!slot.available}
                            aria-pressed={selectedTime === slot.time}
                            onClick={() => setSelectedTime(slot.time)}
                            style={{
                              padding: '8px 12px',
                              backgroundColor: selectedTime === slot.time ? '#007bff' : slot.available ? '#d4edda' : '#f8d7da',
                              color: selectedTime === slot.time ? '#fff' : '#212529',
                              border: '1px solid #ccc',
                              borderRadius: '4px',
                              cursor: slot.available ? 'pointer' : 'not-allowed',
                              opacity: slot.available ? 1 : 0.75,
                            }}
                          >
                            {slot.time} — {slot.available ? 'Disponível' : 'Indisponível'}
                          </button>
                        ))}
                      </div>
                    )}
                  </fieldset>

                  {!user && selectedDate && selectedDay && (
                    <aside aria-label="Cadastro necessário" style={{ padding: '14px', backgroundColor: '#f0f4f8', borderRadius: '4px' }}>
                      {serviceSelector}
                      {selectedTime && availableSlots.some((slot) => slot.time === selectedTime) ? (
                        <>
                          <p>Para solicitar este horário, crie uma conta ou entre na sua conta.</p>
                          <Link
                            to="/registro"
                            state={{ booking: { serviceId: selectedService, date: selectedDate, time: selectedTime } }}
                            style={{ marginRight: '12px' }}
                          >
                            Criar conta e continuar
                          </Link>
                          <Link
                            to="/login"
                            state={{ booking: { serviceId: selectedService, date: selectedDate, time: selectedTime } }}
                          >
                            Já tenho conta
                          </Link>
                        </>
                      ) : (
                        <p>Escolha um horário disponível para continuar com o cadastro.</p>
                      )}
                    </aside>
                  )}

                  {canCreateAppointment && selectedDate && selectedDay && (
                    <form onSubmit={handleSubmit} style={{ borderTop: '2px solid #eee', paddingTop: '15px' }}>
                      <h3>
                        {selectedTime && availableSlots.some((slot) => slot.time === selectedTime)
                          ? `${isAdmin ? 'Registrar agendamento' : 'Solicitar'} ${selectedTime}`
                          : 'Novo agendamento'}
                      </h3>

                      {serviceSelector}

                      {selectedTime && availableSlots.some((slot) => slot.time === selectedTime) ? (
                        <>
                      <div style={{ marginBottom: '15px' }}>
                        <label htmlFor="name" style={{ display: 'block', marginBottom: '5px' }}>Nome:</label>
                        <input
                          id="name"
                          type="text"
                          placeholder={isAdmin ? 'Nome do cliente' : 'Seu nome para contato'}
                          value={name || (canBook ? user.name : '')}
                          onChange={(e) => setName(e.target.value)}
                          style={{ width: '100%', padding: '8px' }}
                          required
                        />
                      </div>

                      {canBook && (
                        <div style={{ marginBottom: '15px' }}>
                          <label htmlFor="email" style={{ display: 'block', marginBottom: '5px' }}>Email da conta:</label>
                          <input
                            id="email"
                            type="email"
                            value={user.email}
                            readOnly
                            style={{ width: '100%', padding: '8px', backgroundColor: '#f2f2f2' }}
                          />
                        </div>
                      )}

                      <div style={{ marginBottom: '15px' }}>
                        <label htmlFor="phone" style={{ display: 'block', marginBottom: '5px' }}>Telefone / WhatsApp:</label>
                        <input
                          id="phone"
                          type="tel"
                          placeholder="(00) 90000-0000"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          style={{ width: '100%', padding: '8px' }}
                          required
                        />
                      </div>

                      <div style={{ marginBottom: '15px' }}>
                        <label htmlFor="address" style={{ display: 'block', marginBottom: '5px' }}>Endereço completo:</label>
                        <input
                          id="address"
                          type="text"
                          placeholder="Rua, número, bairro..."
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          style={{ width: '100%', padding: '8px' }}
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={submitting}
                        style={{
                          width: '100%',
                          padding: '12px',
                          backgroundColor: '#007bff',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '16px',
                          cursor: submitting ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {submitting
                          ? (isAdmin ? 'Registrando agendamento...' : 'Enviando solicitação...')
                          : (isAdmin ? 'Registrar agendamento' : 'Confirmar solicitação')}
                      </button>
                        </>
                      ) : (
                        <p>Escolha um horário disponível no calendário para preencher os dados do agendamento.</p>
                      )}
                    </form>
                  )}
                </section>
              )}
            </>
          )}
        </>
      )}
    </main>
  );
}
