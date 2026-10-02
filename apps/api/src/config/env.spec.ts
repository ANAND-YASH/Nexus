import { validateEnv } from './env';

const database = {
  DATABASE_HOST: 'localhost',
  DATABASE_PORT: '5432',
  DATABASE_USER: 'nexus',
  DATABASE_PASSWORD: 'secret',
  DATABASE_NAME: 'nexus',
};

describe('validateEnv', () => {
  it('applies defaults and parses database settings', () => {
    expect(validateEnv(database)).toEqual({
      NODE_ENV: 'development',
      API_PORT: 4000,
      CORS_ORIGIN: 'http://localhost:3000',
      DATABASE_HOST: 'localhost',
      DATABASE_PORT: 5432,
      DATABASE_USER: 'nexus',
      DATABASE_PASSWORD: 'secret',
      DATABASE_NAME: 'nexus',
    });
  });

  it('lists every missing database variable', () => {
    expect(() => validateEnv({ DATABASE_HOST: 'localhost' })).toThrow(
      'Missing required environment variable(s): DATABASE_PORT, DATABASE_USER, DATABASE_PASSWORD, DATABASE_NAME',
    );
  });

  it('treats blank values as missing', () => {
    expect(() => validateEnv({ ...database, DATABASE_PASSWORD: '  ' })).toThrow(
      /DATABASE_PASSWORD/,
    );
  });

  it('rejects an invalid port', () => {
    expect(() => validateEnv({ ...database, API_PORT: 'abc' })).toThrow(
      /API_PORT/,
    );
    expect(() => validateEnv({ ...database, DATABASE_PORT: '70000' })).toThrow(
      /DATABASE_PORT/,
    );
  });

  it('rejects an unknown NODE_ENV', () => {
    expect(() => validateEnv({ ...database, NODE_ENV: 'staging' })).toThrow(
      /NODE_ENV/,
    );
  });
});
