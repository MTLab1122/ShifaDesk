import { validateEnvironment } from './env.config';

describe('validateEnvironment', () => {
  it('should validate a valid configuration', () => {
    const config = {
      NODE_ENV: 'development',
      PORT: 4000,
      API_PREFIX: '/api/v1',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/matabai_test',
      JWT_SECRET: 'super-secure-jwt-key-32-chars-long-test-environment',
    };

    const validated = validateEnvironment(config);
    expect(validated.PORT).toBe(4000);
    expect(validated.NODE_ENV).toBe('development');
    expect(validated.API_PREFIX).toBe('/api/v1');
  });

  it('should throw an error when required DATABASE_URL is missing', () => {
    const config = {
      NODE_ENV: 'development',
    };

    expect(() => validateEnvironment(config)).toThrow(
      /Environment validation failed/,
    );
  });
});
