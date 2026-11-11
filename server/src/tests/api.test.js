const request = require('supertest');
const app = require('../app');
const { registerValidation, loginValidation } = require('../validations/authValidation');

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