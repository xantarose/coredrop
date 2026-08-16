import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 50,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  maxIdle: 20,
  idleTimeout: 60000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
})

export const initDatabase = async () => {
  const connection = await pool.getConnection()

  try {
    await connection.query('SELECT 1')

    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        avatar_url VARCHAR(500) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        last_login TIMESTAMP NULL,
        is_active BOOLEAN DEFAULT TRUE,
        INDEX idx_email (email),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    await connection.query(`
      ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500) NULL
    `).catch(() => {})

    await connection.query(`
      ALTER TABLE users ADD COLUMN email_changed_at TIMESTAMP NULL
    `).catch(() => {})

    await connection.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id VARCHAR(512) PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address VARCHAR(45),
        user_agent TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_expires_at (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    await connection.query(`DELETE FROM sessions WHERE expires_at < NOW()`).catch(() => {})

    await connection.query(`
      CREATE TABLE IF NOT EXISTS folders (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        name VARCHAR(255) NOT NULL,
        parent_id BIGINT UNSIGNED NULL,
        is_deleted BOOLEAN DEFAULT FALSE,
        is_favorite BOOLEAN DEFAULT FALSE,
        deleted_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_parent_id (parent_id),
        INDEX idx_is_deleted (is_deleted),
        INDEX idx_is_favorite (is_favorite)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    await connection.query(`
      ALTER TABLE folders
      ADD CONSTRAINT fk_folders_parent
      FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
    `).catch(() => {})

    await connection.query(`
      CREATE TABLE IF NOT EXISTS files (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        filename VARCHAR(500) NOT NULL,
        original_name VARCHAR(500) NOT NULL,
        mime_type VARCHAR(100),
        size_bytes BIGINT UNSIGNED NOT NULL,
        path VARCHAR(1000) NOT NULL,
        folder_id BIGINT UNSIGNED NULL,
        is_deleted BOOLEAN DEFAULT FALSE,
        is_favorite BOOLEAN DEFAULT FALSE,
        deleted_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL,
        INDEX idx_user_id (user_id),
        INDEX idx_folder_id (folder_id),
        INDEX idx_is_deleted (is_deleted),
        INDEX idx_is_favorite (is_favorite),
        INDEX idx_user_deleted (user_id, is_deleted),
        INDEX idx_last_accessed (last_accessed_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    await connection.query(`
      ALTER TABLE files ADD COLUMN last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `).catch(() => {})

    await connection.query(`
      ALTER TABLE files ADD COLUMN is_favorite BOOLEAN DEFAULT FALSE
    `).catch(() => {})

    await connection.query(`
      ALTER TABLE files ADD INDEX idx_user_deleted_favorite (user_id, is_deleted, is_favorite)
    `).catch(() => {})

    await connection.query(`
      ALTER TABLE files ADD INDEX idx_user_created (user_id, created_at)
    `).catch(() => {})

    await connection.query(`
      ALTER TABLE files ADD INDEX idx_user_folder (user_id, folder_id)
    `).catch(() => {})

    await connection.query(`
      ALTER TABLE files ADD INDEX idx_created_sorted (created_at DESC)
    `).catch(() => {})

    await connection.query(`
      ALTER TABLE folders ADD COLUMN is_favorite BOOLEAN DEFAULT FALSE
    `).catch(() => {})

    await connection.query(`
      ALTER TABLE folders ADD INDEX idx_user_deleted (user_id, is_deleted)
    `).catch(() => {})

    await connection.query(`
      ALTER TABLE folders ADD INDEX idx_user_parent (user_id, parent_id)
    `).catch(() => {})

    await connection.query(`
      CREATE TABLE IF NOT EXISTS shared_links (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        file_id BIGINT UNSIGNED NOT NULL,
        user_id BIGINT UNSIGNED NOT NULL,
        token VARCHAR(64) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        download_count INT UNSIGNED DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_token (token),
        INDEX idx_file_id (file_id),
        INDEX idx_user_id (user_id),
        INDEX idx_expires_at (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_activities (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        action_type VARCHAR(50) NOT NULL,
        file_id BIGINT UNSIGNED NULL,
        folder_id BIGINT UNSIGNED NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE SET NULL,
        FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL,
        INDEX idx_user_id (user_id),
        INDEX idx_action_type (action_type),
        INDEX idx_created_at (created_at),
        INDEX idx_user_created (user_id, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    await connection.query(`
      ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE
    `).catch(() => {})

    await connection.query(`
      ALTER TABLE users ADD COLUMN two_factor_secret TEXT NULL
    `).catch(() => {})

    await connection.query(`
      ALTER TABLE users ADD COLUMN backup_codes TEXT NULL
    `).catch(() => {})

    await connection.query(`
      ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE
    `).catch(() => {})

    await connection.query(`
      ALTER TABLE users ADD COLUMN registration_ip VARCHAR(45)
    `).catch(() => {})

    await connection.query(`
      ALTER TABLE users ADD COLUMN referral_code VARCHAR(50)
    `).catch(() => {})

    await connection.query(`
      ALTER TABLE users ADD INDEX idx_is_admin (is_admin)
    `).catch(() => {})

    await connection.query(`
      CREATE TABLE IF NOT EXISTS login_history (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status ENUM('success', 'failed') NOT NULL,
        failure_reason VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_login_time (login_time),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    await connection.query(`
      CREATE TABLE IF NOT EXISTS pending_2fa_sessions (
        id VARCHAR(64) PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        temp_token VARCHAR(512) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        attempts INT DEFAULT 0,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_temp_token (temp_token),
        INDEX idx_expires_at (expires_at),
        INDEX idx_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    await connection.query(`
      ALTER TABLE login_history ADD INDEX idx_user_status (user_id, status)
    `).catch(() => {})

    await connection.query(`
      ALTER TABLE login_history ADD INDEX idx_user_login_time (user_id, login_time)
    `).catch(() => {})

    await connection.query(`
      ALTER TABLE shared_links ADD INDEX idx_user_created (user_id, created_at)
    `).catch(() => {})

    await connection.query(`
      CREATE TABLE IF NOT EXISTS password_reset_codes (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        code VARCHAR(6) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        attempts INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_code (code),
        INDEX idx_expires_at (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    await connection.query(`DELETE FROM password_reset_codes WHERE expires_at < NOW()`).catch(() => {})

    await connection.query(`
      CREATE TABLE IF NOT EXISTS email_verifications (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        token VARCHAR(255) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        verified_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_token (token),
        INDEX idx_user_id (user_id),
        INDEX idx_expires_at (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)

    await connection.query(`
      ALTER TABLE users ADD COLUMN is_email_verified BOOLEAN DEFAULT FALSE
    `).catch(() => {})

    console.log('Базы данных таблицы успешно созданы')
  } finally {
    connection.release()
  }
}

export default pool
