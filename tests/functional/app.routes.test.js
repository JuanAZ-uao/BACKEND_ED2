const request = require('supertest');
const app = require('../../src/app');

describe('Functional - API routes', () => {
  test('GET / returns API metadata', async () => {
    const res = await request(app).get('/');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        message: 'TicketMaster API funcionando',
        version: '1.0.0',
      })
    );
  });

  test('GET /health returns service health', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  test('GET /api/users/me requires authentication token', async () => {
    const res = await request(app).get('/api/users/me');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: 'Token no proporcionado' });
  });

  test('GET /api/users/me rejects invalid bearer token', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', 'Bearer invalid-token');

    expect(res.status).toBe(401);
    expect(res.body).toEqual(
      expect.objectContaining({
        message: 'Token inválido',
        code: 'TOKEN_INVALID',
      })
    );
  });
});
