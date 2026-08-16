import pool from '../database/init';

class DatabaseThrottle {
  async execute<T>(query: string, params: any[] = []): Promise<T> {
    return pool.query(query, params) as Promise<T>;
  }
}

export const dbThrottle = new DatabaseThrottle();
