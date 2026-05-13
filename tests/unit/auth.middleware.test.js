const jwt = require('jsonwebtoken');
const authMiddleware = require('../../src/middlewares/auth.middleware');

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('Unit - auth.middleware', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'unit-test-secret';
  });

  test('returns 401 when Authorization header is missing', () => {
    const req = { headers: {} };
    const res = createRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Token no proporcionado' });
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 with TOKEN_INVALID for malformed token', () => {
    const req = { headers: { authorization: 'Bearer malformed-token' } };
    const res = createRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Token inválido',
        code: 'TOKEN_INVALID',
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test('calls next and assigns req.user for valid token', () => {
    const token = jwt.sign({ id: 77, role: 'USER' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = createRes();
    const next = jest.fn();

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toEqual(expect.objectContaining({ id: 77, role: 'USER' }));
  });
});
