-- ============================================================================
-- DDL-СКРИПТ РЕЛЯЦИОННОЙ БАЗЫ ДАННЫХ MEDIATRACKER (3NF)
-- Совместим с SQLite (локальный файл database.sqlite) и PostgreSQL 16
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(64) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(16) NOT NULL DEFAULT 'user', -- 'user' | 'admin'
    must_change_password INTEGER NOT NULL DEFAULT 0, -- 1 = обязательная смена логина и пароля при входе
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(255) NOT NULL,
    original_title VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'movie' | 'series'
    release_year INTEGER NOT NULL,
    duration INTEGER NOT NULL,
    total_episodes INTEGER NOT NULL DEFAULT 1,
    age_rating VARCHAR(10) NOT NULL DEFAULT '16+',
    genres TEXT NOT NULL,
    rating REAL NOT NULL DEFAULT 8.0,
    poster TEXT NOT NULL,
    description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    media_id INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL, -- 'watching' | 'plan' | 'completed' | 'dropped'
    episodes_watched INTEGER NOT NULL DEFAULT 0,
    user_score INTEGER,
    completed_at VARCHAR(32),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, media_id),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(media_id) REFERENCES media(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    media_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    username VARCHAR(64) NOT NULL,
    score INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    has_spoilers BOOLEAN NOT NULL DEFAULT 0,
    helpful_up INTEGER NOT NULL DEFAULT 0,
    helpful_down INTEGER NOT NULL DEFAULT 0,
    created_at VARCHAR(64) NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(media_id) REFERENCES media(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS complaints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    review_id INTEGER NOT NULL,
    media_id INTEGER NOT NULL,
    media_title VARCHAR(255) NOT NULL,
    author_name VARCHAR(64) NOT NULL,
    reason TEXT NOT NULL,
    comment_excerpt TEXT NOT NULL,
    created_at VARCHAR(64) NOT NULL
);
