require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const initSqlJs = require('sql.js');
const { getFullCatalog } = require('./seedData');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'mediatracker_super_secret_key_2026';
const isVercel = Boolean(process.env.VERCEL);
const DB_FILE = process.env.DB_PATH || (isVercel ? '/tmp/database.sqlite' : path.join(__dirname, 'database.sqlite'));

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Ensure DB is initialized before handling any API request (critical for Vercel Serverless)
let dbInitPromise = null;
app.use(async (req, res, next) => {
  if (!db) {
    if (!dbInitPromise) dbInitPromise = initDB();
    await dbInitPromise;
  }
  next();
});

// Server-side poster proxy: fetches official movie/anime posters from Vercel cloud so users in RF see real posters without regional blocks
app.get('/api/poster-proxy', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl || !targetUrl.startsWith('http')) {
    return res.status(400).send('Invalid URL');
  }
  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
      }
    });
    if (!response.ok) {
      return res.status(response.status).send('Upstream error');
    }
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    res.status(502).send('Proxy fetch failed');
  }
});

let db = null;

function saveDatabase() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_FILE, buffer);
}

function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function queryOne(sql, params = []) {
  const rows = queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

function executeSql(sql, params = []) {
  db.run(sql, params);
  saveDatabase();
}

function generateTempPassword() {
  const part1 = crypto.randomInt(1000, 9999);
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let part2 = '';
  for (let i = 0; i < 4; i++) {
    part2 += chars[crypto.randomInt(0, chars.length)];
  }
  return `MT-${part1}-${part2}`;
}

async function initDB() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(fileBuffer);
    console.log('База данных загружена с диска:', DB_FILE);
  } else {
    db = new SQL.Database();
    console.log('Создана новая реляционная база данных SQLite:', DB_FILE);
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      must_change_password INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      original_title TEXT NOT NULL,
      type TEXT NOT NULL,
      release_year INTEGER NOT NULL,
      duration INTEGER NOT NULL,
      total_episodes INTEGER NOT NULL DEFAULT 1,
      age_rating TEXT NOT NULL DEFAULT '16+',
      genres TEXT NOT NULL,
      rating REAL NOT NULL DEFAULT 8.0,
      poster TEXT NOT NULL,
      description TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      media_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      episodes_watched INTEGER NOT NULL DEFAULT 0,
      user_score INTEGER,
      completed_at TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, media_id),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(media_id) REFERENCES media(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      media_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      username TEXT NOT NULL,
      score INTEGER NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      has_spoilers INTEGER NOT NULL DEFAULT 0,
      helpful_up INTEGER NOT NULL DEFAULT 0,
      helpful_down INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(media_id) REFERENCES media(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS complaints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      review_id INTEGER NOT NULL,
      media_id INTEGER NOT NULL,
      media_title TEXT NOT NULL,
      author_name TEXT NOT NULL,
      reason TEXT NOT NULL,
      comment_excerpt TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  const userCount = queryOne('SELECT COUNT(*) as cnt FROM users').cnt;
  if (userCount === 0) {
    const adminHash = bcrypt.hashSync('adminpassword', 10);
    const userHash = bcrypt.hashSync('password123', 10);

    db.run('INSERT INTO users (username, email, password_hash, role, must_change_password) VALUES (?, ?, ?, ?, 0)', ['admin_mark', 'admin@tracker.ru', adminHash, 'admin']);
    db.run('INSERT INTO users (username, email, password_hash, role, must_change_password) VALUES (?, ?, ?, ?, 0)', ['alex_critic', 'alex@example.com', userHash, 'user']);
    db.run('INSERT INTO users (username, email, password_hash, role, must_change_password) VALUES (?, ?, ?, ?, 0)', ['elena_movie', 'elena@example.com', userHash, 'user']);
  }

  const mediaCount = queryOne('SELECT COUNT(*) as cnt FROM media').cnt;
  if (mediaCount === 0) {
    const catalog = getFullCatalog();
    const insertStmt = db.prepare(`
      INSERT INTO media (title, original_title, type, release_year, duration, total_episodes, age_rating, genres, rating, poster, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const m of catalog) {
      insertStmt.run([
        m.title,
        m.originalTitle,
        m.type,
        m.releaseYear,
        m.duration,
        m.totalEpisodes,
        m.ageRating,
        JSON.stringify(m.genres),
        m.rating,
        m.poster,
        m.description
      ]);
    }
    insertStmt.free();
  }

  const revCount = queryOne('SELECT COUNT(*) as cnt FROM reviews').cnt;
  if (revCount === 0) {
    db.run(`INSERT INTO reviews (media_id, user_id, username, score, title, body, has_spoilers, helpful_up, helpful_down, created_at)
            VALUES (1, 2, 'alex_critic', 9, 'Невероятная химия персонажей', 'Дуэт Брайана Крэнстона и Аарона Пола вытягивает каждую драматическую сцену. Сценарий прописан до мельчайших деталей без проходных эпизодов.', 0, 14, 1, '15 февраля 2026')`);
    db.run(`INSERT INTO reviews (media_id, user_id, username, score, title, body, has_spoilers, helpful_up, helpful_down, created_at)
            VALUES (1, 3, 'elena_movie', 10, 'Идеальный сюжетный твист в финале сезона', 'Финальное противостояние Уолтера Уайта и Гуса Фринга в доме престарелых — один из самых напряженных моментов в истории телевидения, когда Гектор Саламанка нажимает на звонок!', 0, 21, 0, '01 марта 2026')`);
    db.run(`INSERT INTO reviews (media_id, user_id, username, score, title, body, has_spoilers, helpful_up, helpful_down, created_at)
            VALUES (2, 3, 'elena_movie', 8, 'Неожиданная правда о титанах', 'Во втором сезоне выясняется, что Райнер и Бертольт на самом деле и есть Бронированный и Колоссальный титаны, которые разрушили стену Мария.', 0, 9, 4, '10 марта 2026')`);

    db.run(`INSERT INTO complaints (review_id, media_id, media_title, author_name, reason, comment_excerpt, created_at)
            VALUES (2, 1, 'Во все тяжкие (Breaking Bad)', 'elena_movie', 'Раскрытие ключевого сюжетного поворота финала 4-го сезона без флага спойлера (has_spoilers = false)', '«Финальное противостояние Уолтера Уайта и Гуса Фринга в доме престарелых — один из самых напряженных моментов в истории телевидения, когда Гектор Саламанка нажимает на звонок!»', '12 марта 2026, 14:20')`);
    db.run(`INSERT INTO complaints (review_id, media_id, media_title, author_name, reason, comment_excerpt, created_at)
            VALUES (3, 2, 'Атака титанов (Attack on Titan)', 'elena_movie', 'Прямое раскрытие личности главных антагонистов без предупреждения для новых зрителей', '«Во втором сезоне выясняется, что Райнер и Бертольт на самом деле и есть Бронированный и Колоссальный титаны, которые разрушили стену Мария.»', '14 марта 2026, 18:05')`);
  }

  saveDatabase();
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Недействительный или истекший токен' });
  }
}

function adminMiddleware(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Доступ разрешен только администратору' });
  }
  next();
}

// ==========================================================================
// AUTH ROUTES
// ==========================================================================
app.post('/api/auth/register', (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || username.trim().length < 3) {
      return res.status(400).json({ error: 'Имя пользователя должно содержать минимум 3 символа' });
    }
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Укажите корректный email' });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Пароль должен содержать минимум 8 символов' });
    }

    const existing = queryOne('SELECT id FROM users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)', [username.trim(), email.trim()]);
    if (existing) {
      return res.status(409).json({ error: 'Пользователь с таким логином или email уже существует' });
    }

    const hash = bcrypt.hashSync(password, 10);
    executeSql('INSERT INTO users (username, email, password_hash, role, must_change_password) VALUES (?, ?, ?, ?, 0)', [username.trim(), email.trim(), hash, 'user']);

    const newUser = queryOne('SELECT id, username, email, role, must_change_password FROM users WHERE LOWER(email) = LOWER(?)', [email.trim()]);
    const userPayload = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      mustChangePassword: Boolean(newUser.must_change_password)
    };
    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ user: userPayload, token });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера при регистрации: ' + err.message });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Введите логин/email и пароль' });
    }

    const userRow = queryOne(
      'SELECT * FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?)',
      [identifier.trim(), identifier.trim()]
    );

    if (!userRow || !bcrypt.compareSync(password, userRow.password_hash)) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    const userPayload = {
      id: userRow.id,
      username: userRow.username,
      email: userRow.email,
      role: userRow.role,
      mustChangePassword: Boolean(userRow.must_change_password)
    };
    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: userPayload, token });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера при входе: ' + err.message });
  }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const userRow = queryOne('SELECT id, username, email, role, must_change_password FROM users WHERE id = ?', [req.user.id]);
  if (!userRow) return res.status(404).json({ error: 'Пользователь не найден' });
  res.json({
    user: {
      id: userRow.id,
      username: userRow.username,
      email: userRow.email,
      role: userRow.role,
      mustChangePassword: Boolean(userRow.must_change_password)
    }
  });
});

// Complete onboarding after entering via temporary password (set new username + permanent password)
app.post('/api/auth/complete-setup', authMiddleware, (req, res) => {
  try {
    const { newUsername, newPassword } = req.body;
    if (!newUsername || newUsername.trim().length < 3) {
      return res.status(400).json({ error: 'Новое имя пользователя должно содержать минимум 3 символа' });
    }
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Постоянный пароль должен содержать минимум 8 символов' });
    }

    const duplicate = queryOne('SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND id != ?', [newUsername.trim(), req.user.id]);
    if (duplicate) {
      return res.status(409).json({ error: 'Это имя пользователя уже занято, выберите другое' });
    }

    const hash = bcrypt.hashSync(newPassword, 10);
    executeSql(
      'UPDATE users SET username = ?, password_hash = ?, must_change_password = 0 WHERE id = ?',
      [newUsername.trim(), hash, req.user.id]
    );

    const updated = queryOne('SELECT id, username, email, role, must_change_password FROM users WHERE id = ?', [req.user.id]);
    const userPayload = {
      id: updated.id,
      username: updated.username,
      email: updated.email,
      role: updated.role,
      mustChangePassword: false
    };
    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: userPayload, token });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка обновления учетной записи: ' + err.message });
  }
});

// Admin self password change
app.post('/api/admin/change-password', authMiddleware, adminMiddleware, (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'Новый пароль должен содержать минимум 8 символов' });
  }
  const hash = bcrypt.hashSync(newPassword, 10);
  executeSql('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?', [hash, req.user.id]);
  res.json({ message: 'Пароль администратора успешно обновлен' });
});

// Admin account handover (generates one-time temporary password and forces username/password setup on next login)
app.post('/api/admin/handover-account', authMiddleware, adminMiddleware, (req, res) => {
  const tempPassword = generateTempPassword();
  const hash = bcrypt.hashSync(tempPassword, 10);
  executeSql('UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?', [hash, req.user.id]);
  res.json({
    email: req.user.email,
    tempPassword,
    message: 'Временный пароль для передачи аккаунта сгенерирован'
  });
});

// List all admins
app.get('/api/admin/admins', authMiddleware, adminMiddleware, (req, res) => {
  const rows = queryAll('SELECT id, username, email, role, must_change_password, created_at FROM users WHERE role = "admin" ORDER BY id ASC');
  res.json(rows);
});

// Create a new admin with auto-generated temporary password
app.post('/api/admin/create-admin', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { email, initialUsername } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Укажите корректный служебный email нового администратора' });
    }
    const baseLogin = (initialUsername && initialUsername.trim().length >= 3)
      ? initialUsername.trim()
      : `admin_${crypto.randomInt(100, 999)}`;

    const existing = queryOne('SELECT id FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(username) = LOWER(?)', [email.trim(), baseLogin]);
    if (existing) {
      return res.status(409).json({ error: 'Пользователь с таким email или логином уже зарегистрирован' });
    }

    const tempPassword = generateTempPassword();
    const hash = bcrypt.hashSync(tempPassword, 10);

    executeSql(
      'INSERT INTO users (username, email, password_hash, role, must_change_password) VALUES (?, ?, ?, ?, 1)',
      [baseLogin, email.trim(), hash, 'admin']
    );

    res.status(201).json({
      username: baseLogin,
      email: email.trim(),
      tempPassword
    });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка при создании администратора: ' + err.message });
  }
});

// ==========================================================================
// MEDIA CATALOG ROUTES
// ==========================================================================
app.get('/api/media', (req, res) => {
  const rows = queryAll('SELECT * FROM media ORDER BY rating DESC, id ASC');
  const formatted = rows.map(r => ({
    id: r.id,
    title: r.title,
    originalTitle: r.original_title,
    type: r.type,
    releaseYear: r.release_year,
    duration: r.duration,
    totalEpisodes: r.total_episodes,
    ageRating: r.age_rating,
    genres: JSON.parse(r.genres || '[]'),
    rating: r.rating,
    poster: r.poster,
    description: r.description
  }));
  res.json(formatted);
});

// Add new media (Admin only)
app.post('/api/media', authMiddleware, adminMiddleware, (req, res) => {
  const { title, originalTitle, type, releaseYear, duration, totalEpisodes, ageRating, genres, poster, description } = req.body;
  if (!title) return res.status(400).json({ error: 'Название произведения обязательно' });

  const ep = type === 'series' ? (parseInt(totalEpisodes, 10) || parseInt(duration, 10) || 10) : 1;
  const dur = parseInt(duration, 10) || 120;
  const yr = parseInt(releaseYear, 10) || 2025;
  const genreStr = JSON.stringify(Array.isArray(genres) && genres.length > 0 ? genres : ['Фантастика', 'Драма']);
  const finalPoster = (poster && poster.trim()) ? poster.trim() : 'https://static.tvmaze.com/uploads/images/medium_portrait/0/2400.jpg';

  executeSql(
    `INSERT INTO media (title, original_title, type, release_year, duration, total_episodes, age_rating, genres, rating, poster, description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      title.trim(),
      (originalTitle || title).trim(),
      type || 'movie',
      yr,
      dur,
      ep,
      ageRating || '16+',
      genreStr,
      8.5,
      finalPoster,
      description || 'Новое произведение, добавленное администратором в каталог MediaTracker.'
    ]
  );

  res.status(201).json({ message: 'Медиаединица успешно сохранена в базу данных' });
});

// Edit existing media (Admin only)
app.put('/api/media/:id', authMiddleware, adminMiddleware, (req, res) => {
  const mediaId = req.params.id;
  const existing = queryOne('SELECT * FROM media WHERE id = ?', [mediaId]);
  if (!existing) return res.status(404).json({ error: 'Карточка произведения не найдена' });

  const { title, originalTitle, type, releaseYear, duration, totalEpisodes, ageRating, genres, poster, description } = req.body;
  const nextType = type || existing.type;
  const nextEp = nextType === 'series'
    ? (parseInt(totalEpisodes, 10) || existing.total_episodes)
    : 1;
  const nextGenres = Array.isArray(genres) && genres.length > 0
    ? JSON.stringify(genres)
    : existing.genres;

  executeSql(
    `UPDATE media
     SET title = ?, original_title = ?, type = ?, release_year = ?, duration = ?, total_episodes = ?, age_rating = ?, genres = ?, poster = ?, description = ?
     WHERE id = ?`,
    [
      (title || existing.title).trim(),
      (originalTitle || existing.original_title).trim(),
      nextType,
      parseInt(releaseYear, 10) || existing.release_year,
      parseInt(duration, 10) || existing.duration,
      nextEp,
      ageRating || existing.age_rating,
      nextGenres,
      (poster && poster.trim()) ? poster.trim() : existing.poster,
      (description || existing.description).trim(),
      mediaId
    ]
  );

  res.json({ message: 'Изменения в карточке произведения сохранены в БД' });
});

// ==========================================================================
// USER LISTS ROUTES (STRICTLY FOR REGULAR USERS — ADMINS CANNOT ADD TO LISTS)
// ==========================================================================
app.get('/api/lists', authMiddleware, (req, res) => {
  if (req.user.role === 'admin') {
    return res.json([]);
  }
  const rows = queryAll('SELECT * FROM user_lists WHERE user_id = ?', [req.user.id]);
  const formatted = rows.map(r => ({
    id: r.id,
    userId: r.user_id,
    mediaId: r.media_id,
    status: r.status,
    episodesWatched: r.episodes_watched,
    userScore: r.user_score,
    completedAt: r.completed_at
  }));
  res.json(formatted);
});

app.post('/api/lists', authMiddleware, (req, res) => {
  if (req.user.role === 'admin') {
    return res.status(403).json({ error: 'Администратор не может добавлять тайтлы в личные списки' });
  }

  const { mediaId, status, episodesWatched, userScore } = req.body;
  const media = queryOne('SELECT * FROM media WHERE id = ?', [mediaId]);
  if (!media) return res.status(404).json({ error: 'Тайтл не найден' });

  const existing = queryOne('SELECT * FROM user_lists WHERE user_id = ? AND media_id = ?', [req.user.id, mediaId]);
  let finalStatus = status || (existing ? existing.status : 'watching');
  let finalEp = episodesWatched !== undefined ? episodesWatched : (existing ? existing.episodes_watched : (finalStatus === 'watching' ? 1 : 0));
  let completedAt = existing ? existing.completed_at : null;

  if (finalStatus === 'completed' || finalEp >= media.total_episodes) {
    finalStatus = 'completed';
    finalEp = media.total_episodes;
    completedAt = completedAt || new Date().toLocaleDateString('ru-RU');
  }

  if (existing) {
    executeSql(
      'UPDATE user_lists SET status = ?, episodes_watched = ?, user_score = COALESCE(?, user_score), completed_at = ? WHERE id = ?',
      [finalStatus, finalEp, userScore || null, completedAt, existing.id]
    );
  } else {
    executeSql(
      'INSERT INTO user_lists (user_id, media_id, status, episodes_watched, user_score, completed_at) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, mediaId, finalStatus, finalEp, userScore || null, completedAt]
    );
  }

  res.json({ status: finalStatus, episodesWatched: finalEp });
});

// ==========================================================================
// REVIEWS & DETAILED COMPLAINTS ROUTES
// ==========================================================================
app.get('/api/reviews', (req, res) => {
  const rows = queryAll('SELECT * FROM reviews ORDER BY id DESC');
  const formatted = rows.map(r => ({
    id: r.id,
    mediaId: r.media_id,
    userId: r.user_id,
    username: r.username,
    score: r.score,
    title: r.title,
    body: r.body,
    hasSpoilers: Boolean(r.has_spoilers),
    helpfulUp: r.helpful_up,
    helpfulDown: r.helpful_down,
    date: r.created_at
  }));
  res.json(formatted);
});

app.post('/api/reviews', authMiddleware, (req, res) => {
  if (req.user.role === 'admin') {
    return res.status(403).json({ error: 'Администратор не может оценивать произведения и оставлять зрительские рецензии' });
  }

  const { mediaId, score, title, body, hasSpoilers } = req.body;

  // Check rule #2: user MUST have this media in user_lists with status != 'plan'
  const listEntry = queryOne('SELECT * FROM user_lists WHERE user_id = ? AND media_id = ?', [req.user.id, mediaId]);
  if (!listEntry || listEntry.status === 'plan') {
    return res.status(403).json({
      error: 'Оставить рецензию можно только на тайтл, который находится у вас в статусе «Смотрю», «Просмотрено» или «Брошено»'
    });
  }

  if (!title || !body || body.trim().length < 50) {
    return res.status(400).json({ error: 'Заголовок обязателен, а текст рецензии должен быть не менее 50 символов' });
  }

  const dateStr = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
  executeSql(
    `INSERT INTO reviews (media_id, user_id, username, score, title, body, has_spoilers, helpful_up, helpful_down, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0, ?)`,
    [mediaId, req.user.id, req.user.username, parseInt(score, 10) || 10, title.trim(), body.trim(), hasSpoilers ? 1 : 0, dateStr]
  );

  executeSql('UPDATE user_lists SET user_score = ? WHERE id = ?', [parseInt(score, 10) || 10, listEntry.id]);

  res.status(201).json({ message: 'Отзыв опубликован' });
});

app.post('/api/reviews/:id/vote', (req, res) => {
  const { dir } = req.body;
  const col = dir === 'up' ? 'helpful_up' : 'helpful_down';
  executeSql(`UPDATE reviews SET ${col} = ${col} + 1 WHERE id = ?`, [req.params.id]);
  res.json({ ok: true });
});

// User can report a review (creates detailed complaint for admin)
app.post('/api/reviews/:id/report', authMiddleware, (req, res) => {
  const rev = queryOne('SELECT * FROM reviews WHERE id = ?', [req.params.id]);
  if (!rev) return res.status(404).json({ error: 'Рецензия не найдена' });
  const media = queryOne('SELECT title, original_title FROM media WHERE id = ?', [rev.media_id]);
  const mediaTitle = media ? `${media.title} (${media.original_title})` : `Тайтл #${rev.media_id}`;
  const reason = (req.body && req.body.reason) ? req.body.reason.trim() : 'Жалоба пользователя: спойлеры без метки или нарушение правил сообщества';
  const nowStr = new Date().toLocaleString('ru-RU');

  executeSql(
    `INSERT INTO complaints (review_id, media_id, media_title, author_name, reason, comment_excerpt, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [rev.id, rev.media_id, mediaTitle, rev.username, reason, `«${rev.body}»`, nowStr]
  );

  res.json({ message: 'Жалоба отправлена модератору' });
});

app.get('/api/admin/complaints', authMiddleware, adminMiddleware, (req, res) => {
  const rows = queryAll('SELECT * FROM complaints ORDER BY id DESC');
  res.json(rows);
});

app.post('/api/admin/complaints/:id/resolve', authMiddleware, adminMiddleware, (req, res) => {
  const { action } = req.body;
  const comp = queryOne('SELECT * FROM complaints WHERE id = ?', [req.params.id]);
  if (comp) {
    if (action === 'spoiler') {
      executeSql('UPDATE reviews SET has_spoilers = 1 WHERE id = ?', [comp.review_id]);
    } else if (action === 'delete') {
      executeSql('DELETE FROM reviews WHERE id = ?', [comp.review_id]);
    }
    executeSql('DELETE FROM complaints WHERE id = ?', [comp.id]);
  }
  res.json({ ok: true });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (!isVercel) {
  dbInitPromise = initDB();
  dbInitPromise.then(() => {
    app.listen(PORT, () => {
      console.log(`==========================================================`);
      console.log(`MediaTracker Full-Stack v3.0 успешно запущен!`);
      console.log(`Откройте в браузере: http://localhost:${PORT}`);
      console.log(`==========================================================`);
    });
  });
}

module.exports = app;
