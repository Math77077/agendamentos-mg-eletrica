import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

export default function Home() {
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('09:00');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    async function fetchServices() {
      try {
        const response = await api.get('/services');
        setServices(response.data);
        if (response.data.length > 0) {
          setSelectedService(response.data[0]._id);
        }
      } catch (error) {
        console.error('Erro ao buscar serviços:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchServices();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedService || !selectedDate || !selectedTime || !name.trim() || !phone.trim() || !address.trim()) {
      setFeedback({ type: 'error', text: 'Preencha todos os campos obrigatórios.' });
      return;
    }

    try {
      setSubmitting(true);
      setFeedback(null);

      const appointmentDate = new Date(`${selectedDate}T${selectedTime}`).toISOString();

      await api.post('/appointments', {
        serviceId: selectedService,
        appointmentDate,
        name: name.trim(),
        phone: phone.replace(/\D/g, ''),
        address,
      });

      setFeedback({ type: 'success', text: 'Agendamento solicitado com sucesso!' });
      setSelectedDate('');
      setName('');
      setPhone('');
      setAddress('');
    } catch (error) {
      console.error('Erro ao solicitar agendamento:', error);
      setFeedback({
        type: 'error',
        text: error.response?.data?.message || 'Falha ao solicitar agendamento.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div style={{ maxWidth: '500px', margin: '20px auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
        <h1>Solicitar Agendamento</h1>
        <Link
          to="/login"
          style={{
            padding: '10px 16px',
            backgroundColor: '#007bff',
            color: '#fff',
            borderRadius: '4px',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          Login
        </Link>
      </header>
      {loading ? (
        <p>Carregando serviços disponíveis...</p>
      ) : (
        <>
          <p>Selecione um dia no calendário para abrir os detalhes da solicitação.</p>

          {feedback && (
            <div style={{
              padding: '10px',
              marginBottom: '15px',
              borderRadius: '4px',
              backgroundColor: feedback.type === 'success' ? '#d4edda' : '#f8d7da',
              color: feedback.type === 'success' ? '#155724' : '#721c24'
            }}>
              {feedback.text}
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>
              Escolha a Data:
            </label>
            <input
              type="date"
              min={today}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ width: '100%', padding: '10px', fontSize: '16px' }}
            />
          </div>

          {selectedDate && (
            <form onSubmit={handleSubmit} style={{ borderTop: '2px solid #eee', paddingTop: '15px' }}>
              <h3>Horário e Serviço para {new Date(`${selectedDate}T00:00:00`).toLocaleDateString('pt-BR')}</h3>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Serviço Desejado:</label>
                <select
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  style={{ width: '100%', padding: '8px' }}
                >
                  {services.map((service) => (
                    <option key={service._id} value={service._id}>
                      {service.title} - {service.price > 0 ? `R$ ${service.price}` : 'Preço sob avaliação'}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Nome:</label>
                <input
                  type="text"
                  placeholder="Seu nome para contato"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', padding: '8px' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Telefone / WhatsApp:</label>
                <input
                  type="tel"
                  placeholder="(00) 90000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{ width: '100%', padding: '8px' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Endereço Completo:</label>
                <input
                  type="text"
                  placeholder="Rua, número, bairro..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  style={{ width: '100%', padding: '8px' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Horário:</label>
                <input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  style={{ width: '100%', padding: '8px' }}
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
                  cursor: submitting ? 'not-allowed' : 'pointer'
                }}
              >
                {submitting ? 'Enviando solicitação...' : 'Confirmar Solicitação'}
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}