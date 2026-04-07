import * as SQLite from 'expo-sqlite';

export interface DatabaseRecord {
  id: string;
  [key: string]: any;
}

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      this.db = await SQLite.openDatabaseAsync('property_inspection.db');
      
      // Create tables
      await this.createTables();
      this.initialized = true;
    } catch (error) {
      console.error('Database initialization error:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const tables = [
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        company TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS properties (
        id TEXT PRIMARY KEY,
        address TEXT NOT NULL,
        type TEXT NOT NULL,
        bedrooms INTEGER,
        bathrooms INTEGER,
        area INTEGER,
        rent_price REAL NOT NULL,
        deposit REAL NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        type TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        avatar TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS inspections (
        id TEXT PRIMARY KEY,
        property_id TEXT NOT NULL,
        client_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        scheduled_date INTEGER NOT NULL,
        completed_date INTEGER,
        general_notes TEXT,
        tenant_signature TEXT,
        agent_signature TEXT,
        report_url TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (property_id) REFERENCES properties (id),
        FOREIGN KEY (client_id) REFERENCES clients (id),
        FOREIGN KEY (agent_id) REFERENCES agents (id)
      )`,
      `CREATE TABLE IF NOT EXISTS inspection_items (
        id TEXT PRIMARY KEY,
        inspection_id TEXT NOT NULL,
        category TEXT NOT NULL,
        item TEXT NOT NULL,
        condition TEXT NOT NULL,
        notes TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (inspection_id) REFERENCES inspections (id)
      )`,
      `CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        inspection_id TEXT NOT NULL,
        title TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        generated_date INTEGER,
        file_path TEXT,
        notes TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (inspection_id) REFERENCES inspections (id)
      )`,
      `CREATE TABLE IF NOT EXISTS media_files (
        id TEXT PRIMARY KEY,
        inspection_id TEXT NOT NULL,
        inspection_item_id TEXT,
        type TEXT NOT NULL,
        uri TEXT NOT NULL,
        filename TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (inspection_id) REFERENCES inspections (id),
        FOREIGN KEY (inspection_item_id) REFERENCES inspection_items (id)
      )`,
      `CREATE TABLE IF NOT EXISTS pending_operations (
        id TEXT PRIMARY KEY,
        \`table\` TEXT NOT NULL,
        operation TEXT NOT NULL,
        data TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        retryCount INTEGER DEFAULT 0
      )`
    ];

    for (const table of tables) {
      await this.db.execAsync(table);
    }
  }

  async insert(table: string, data: DatabaseRecord): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const values = Object.values(data);

    const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
    await this.db.runAsync(sql, values);
  }

  async update(table: string, id: string, data: Partial<DatabaseRecord>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(data), id];

    const sql = `UPDATE ${table} SET ${setClause} WHERE id = ?`;
    await this.db.runAsync(sql, values);
  }

  async delete(table: string, id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const sql = `DELETE FROM ${table} WHERE id = ?`;
    await this.db.runAsync(sql, [id]);
  }

  async findById(table: string, id: string): Promise<DatabaseRecord | null> {
    if (!this.db) throw new Error('Database not initialized');

    const sql = `SELECT * FROM ${table} WHERE id = ?`;
    const result = await this.db.getFirstAsync(sql, [id]);
    return result as DatabaseRecord | null;
  }

  async findAll(table: string, where?: string, params?: any[]): Promise<DatabaseRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    let sql = `SELECT * FROM ${table}`;
    if (where) {
      sql += ` WHERE ${where}`;
    }

    const result = await this.db.getAllAsync(sql, params || []);
    return result as DatabaseRecord[];
  }

  async query(sql: string, params?: any[]): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');
    return await this.db.getAllAsync(sql, params || []);
  }

  async execute(sql: string, params?: any[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.runAsync(sql, params || []);
  }

  generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }
}

export const databaseService = new DatabaseService();
