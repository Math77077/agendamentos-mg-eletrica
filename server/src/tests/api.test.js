const request = require('supertest');
const app = require('../app');
const { registerValidation, loginValidation } = require('../validations/authValidation');
const { appointmentUpdateValidation } = require('../validations/appointmentValidation');

describe('Solarev Backend Unit Tests', () => {
  
  describe('GET /api/health', () => {
    it('should return 200 OK with server status message', async () => {
      const response = await request(app).get('/api/health');
      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('message', 'Solarev Server is running');
    });
  });

  describe('Auth Validation Schemas (Joi)', () => {
    it('should validate a correct user registration payload', () => {
      const validPayload = {
        name: 'Carlos Silva',
        email: 'carlos@solarev.com',
        password: 'password123',
        role: 'user',
      };
      const { error } = registerValidation(validPayload);
      expect(error).toBeUndefined();
    });

    describe('Appointment update validation schema (Joi)', () => {
      it('should validate the required appointment details', () => {
        const validPayload = {
          name: 'Carlos Silva',
          phone: '11999999999',
          address: 'Rua das Flores, 123',
          appointmentDate: new Date(Date.now() + 86400000).toISOString(),
        };

        const { error } = appointmentUpdateValidation(validPayload);
        expect(error).toBeUndefined();
      });

      it('should allow editing an appointment with a date in the past', () => {
        const validPayload = {
          name: 'Carlos Silva',
          phone: '11999999999',
          address: 'Rua das Flores, 123',
          appointmentDate: new Date(Date.now() - 86400000).toISOString(),
        };

        const { error } = appointmentUpdateValidation(validPayload);
        expect(error).toBeUndefined();
      });

      describe('PUT /api/appointments/:id', () => {
        it('should require authentication', async () => {
          const response = await request(app)
            .put('/api/appointments/507f1f77bcf86cd799439011')
            .send({});

          expect(response.statusCode).toBe(401);
        });
      });

      it('should reject an invalid phone number', () => {
        const invalidPayload = {
          name: 'Carlos Silva',
          phone: '123',
          address: 'Rua das Flores, 123',
          appointmentDate: new Date(Date.now() + 86400000).toISOString(),
        };

        const { error } = appointmentUpdateValidation(invalidPayload);
        expect(error).toBeDefined();
      });
    });

    it('should fail validation if email format is invalid', () => {
      const invalidPayload = {
        name: 'Carlos Silva',
        email: 'not-an-email',
        password: 'password123',
      };
      const { error } = registerValidation(invalidPayload);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('"email" must be a valid email');
    });

    it('should fail validation if password is too short', () => {
      const invalidPayload = {
        name: 'Carlos Silva',
        email: 'carlos@solarev.com',
        password: '123',
      };
      const { error } = registerValidation(invalidPayload);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('"password" length must be at least 6 characters long');
    });
  });

  describe('POST /api/auth/register', () => {
    it('should return 400 Bad Request when mandatory fields are missing', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'incomplete@solarev.com' });

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('message');
    });
  });
});