const request = require('supertest');
const app = require('../app');

describe('Appointment availability routes', () => {
  it('does not expose administrator calendar data to unauthenticated users', async () => {
    const response = await request(app)
      .get('/api/appointments/availability/admin?month=2026-11');

    expect(response.statusCode).toBe(401);
  });

  it('requires a valid month for the public calendar', async () => {
    const response = await request(app)
      .get('/api/appointments/availability?month=invalid');

    expect(response.statusCode).toBe(400);
  });

  it('requires a service selection to calculate public availability', async () => {
    const response = await request(app)
      .get('/api/appointments/availability?month=2026-11');

    expect(response.statusCode).toBe(400);
  });
});
