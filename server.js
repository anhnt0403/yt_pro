
const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'yt-manager-pro-ultra-hardcore-2025';

/* ===================== MIDDLEWARE ===================== */
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true }));

/* ===================== DATABASE ===================== */
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'yt_manager_pro_db',
  waitForConnections: true,
  connectionLimit: 20
});

/* ===================== AUTH HELPER ===================== */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Missing token' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Admin permission required' });
  }
  next();
};

// UPDATED: isManager bao gồm USER để họ có thể lấy dữ liệu (như doanh thu team)
const isManager = (req, res, next) => {
  if (req.user.role === 'ADMIN' || req.user.role === 'LEADER' || req.user.role === 'USER') {
    next();
  } else {
    return res.status(403).json({ message: 'Manager permission required' });
  }
};

/* ===================== SYSTEM LOG ===================== */
const addSystemLog = async (level, message) => {
  try {
    await pool.execute(
      'INSERT INTO system_logs (level, message) VALUES (?, ?)',
      [level, message]
    );
  } catch (e) {
    console.error('Log error:', e.message);
  }
};

/* ===================== AUTH LOGIN ===================== */
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await pool.execute('SELECT * FROM users WHERE email=?', [email]);
    if (!rows.length) return res.status(404).json({ message: 'User not found' });

    const user = rows[0];
    const ok = password === user.password || (user.password.length > 20 && await bcrypt.compare(password, user.password));
    if (!ok) return res.status(401).json({ message: 'Invalid password' });
    if (user.status !== 'ACTIVE') return res.status(403).json({ message: 'User inactive' });

    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    await addSystemLog('SUCCESS', `Login: ${user.email}`);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatar_url,
        status: user.status,
        leaderId: user.leader_id
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/* ===================== USERS ===================== */
app.get('/api/users', authenticateToken, async (req, res) => {
  let sql = 'SELECT id, name, email, role, status, leader_id AS leaderId, avatar_url AS avatarUrl, created_at AS createdAt FROM users';
  let params = [];
  
  if (req.user.role === 'LEADER') {
    sql += ' WHERE leader_id = ? OR id = ?';
    params = [req.user.id, req.user.id];
  } else if (req.user.role === 'USER') {
    // UPDATED: User nhìn thấy đồng đội trong cùng team
    sql += ` WHERE leader_id = (SELECT leader_id FROM (SELECT leader_id FROM users WHERE id = ?) AS t) 
             OR id = (SELECT leader_id FROM (SELECT leader_id FROM users WHERE id = ?) AS t2)
             OR id = ?`;
    params = [req.user.id, req.user.id, req.user.id];
  }
  
  sql += ' ORDER BY created_at DESC';
  const [rows] = await pool.execute(sql, params);
  res.json(rows);
});

// UPDATED: Chặn quyền tạo USER nếu role là USER
app.post('/api/users', authenticateToken, isManager, async (req, res) => {
  if (req.user.role === 'USER') {
    return res.status(403).json({ message: 'User role cannot create users' });
  }
  const { id, name, email, password, role, avatarUrl, leaderId } = req.body;
  const finalLeaderId = req.user.role === 'LEADER' ? req.user.id : leaderId;
  const finalRole = req.user.role === 'LEADER' ? 'USER' : role;
  try {
    const [exist] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (exist.length > 0) return res.status(400).json({ message: 'Email already exists' });
    const hash = password ? await bcrypt.hash(password, 10) : await bcrypt.hash('123456', 10);
    const userId = id || `user-${Date.now()}`;
    await pool.execute(
      'INSERT INTO users (id, name, email, password, role, avatar_url, leader_id) VALUES (?,?,?,?,?,?,?)',
      [userId, name, email, hash, finalRole, avatarUrl, finalLeaderId || null]
    );
    res.json({ message: 'User created' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// UPDATED: Chặn quyền sửa người khác nếu role là USER (ngoại trừ chính mình nếu cần)
app.put('/api/users/:id', authenticateToken, isManager, async (req, res) => {
  if (req.user.role === 'USER' && req.params.id !== req.user.id) {
    return res.status(403).json({ message: 'User can only edit themselves' });
  }
  const { name, role, avatarUrl, status, password, leaderId } = req.body;
  try {
    if (req.user.role === 'LEADER') {
      if (req.params.id !== req.user.id) {
          const [check] = await pool.execute('SELECT leader_id FROM users WHERE id=?', [req.params.id]);
          if (!check.length || check[0].leader_id !== req.user.id) {
              return res.status(403).json({ message: 'Unauthorized' });
          }
      }
    }
    const finalRole = (req.user.role === 'LEADER' || req.user.role === 'USER') ? 'USER' : role; 
    const finalLeaderId = (req.user.role === 'LEADER' || req.user.role === 'USER') ? (req.user.leader_id || req.user.id) : leaderId;
    const params = [name, finalRole, avatarUrl, status, finalLeaderId];
    let sql = 'UPDATE users SET name=?, role=?, avatar_url=?, status=?, leader_id=?';
    if (password && password.trim() !== '') {
      sql += ', password=?';
      params.push(await bcrypt.hash(password, 10));
    }
    sql += ' WHERE id=?';
    params.push(req.params.id);
    await pool.execute(sql, params);
    res.json({ message: 'User updated' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// UPDATED: Chặn quyền xóa nhân sự nếu role là USER
app.delete('/api/users/:id', authenticateToken, isManager, async (req, res) => {
  if (req.user.role === 'USER') {
    return res.status(403).json({ message: 'User role cannot delete users' });
  }
  try {
    if (req.user.role === 'LEADER') {
      const [check] = await pool.execute('SELECT leader_id FROM users WHERE id=?', [req.params.id]);
      if (!check.length || check[0].leader_id !== req.user.id) {
          return res.status(403).json({ message: 'Unauthorized' });
      }
    }
    await pool.execute('DELETE FROM users WHERE id=?', [req.params.id]);
    res.json({ message: 'User deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* ===================== CHANNELS ===================== */
app.get('/api/channels', authenticateToken, async (_, res) => {
  const [rows] = await pool.execute(`SELECT * FROM channels ORDER BY subscriber_count DESC`);
  res.json(rows);
});

app.post('/api/channels', authenticateToken, isAdmin, async (req, res) => {
  const c = req.body;
  await pool.execute(
    `INSERT INTO channels
    (id, name, niche, subscriber_count, view_count, status, gmail, thumbnail_url, is_monetized,
     assigned_staff_id, network_name, revenue_share_percent, channel_category, channel_origin)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON DUPLICATE KEY UPDATE
      name=VALUES(name),
      subscriber_count=VALUES(subscriber_count),
      view_count=VALUES(view_count),
      is_monetized=VALUES(is_monetized),
      assigned_staff_id=VALUES(assigned_staff_id),
      network_name=VALUES(network_name),
      revenue_share_percent=VALUES(revenue_share_percent),
      channel_category=VALUES(channel_category),
      channel_origin=VALUES(channel_origin)`,
    [
      c.id, c.name, c.niche || 'General',
      c.subscriberCount || 0, c.viewCount || 0,
      c.status || 'LIVE', c.gmail || 'OAuth',
      c.thumbnailUrl, c.isMonetized ? 1 : 0,
      c.assignedStaffId || null, c.networkName || null,
      c.revenueSharePercent || 100,
      c.channelCategory || null,
      c.channelOrigin || 'COLD'
    ]
  );
  res.json({ message: 'Channel saved' });
});

app.delete('/api/channels/:id', authenticateToken, isAdmin, async (req, res) => {
  await pool.execute('DELETE FROM channels WHERE id=?', [req.params.id]);
  res.json({ message: 'Channel deleted' });
});

/* ===================== REVENUE ===================== */
app.get('/api/manual-revenue', authenticateToken, async (req, res) => {
  const { year, channelId } = req.query;
  let sql = 'SELECT * FROM manual_revenue WHERE 1=1';
  const params = [];
  if (year) { sql += ' AND year=?'; params.push(year); }
  if (channelId) { sql += ' AND channel_id=?'; params.push(channelId); }
  const [rows] = await pool.execute(sql, params);
  res.json(rows);
});

// UPDATED: Cho phép USER lưu doanh thu nhờ isManager middleware
app.post('/api/manual-revenue', authenticateToken, isManager, async (req, res) => {
  const { channelId, year, monthlyData } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (let i = 0; i < 12; i++) {
      await conn.execute(
        `INSERT INTO manual_revenue (channel_id, year, month, amount)
         VALUES (?,?,?,?)
         ON DUPLICATE KEY UPDATE amount=VALUES(amount)`,
        [channelId, year, i + 1, monthlyData[i] || 0]
      );
    }
    await conn.commit();
    res.json({ message: 'Revenue saved' });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ error: e.message });
  } finally {
    conn.release();
  }
});

/* ===================== GOOGLE ACCOUNTS ===================== */
async function refreshGoogleAccessToken(clientId, clientSecret, refreshToken) {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    const data = await response.json();
    return response.ok ? data : null;
  } catch (error) { return null; }
}

// UPDATED: Mở rộng quyền lấy Google accounts cho isManager (bao gồm USER) để đồng bộ API
app.get('/api/google-accounts', authenticateToken, isManager, async (_, res) => {
  try {
    const [configRows] = await pool.execute('SELECT client_id, client_secret FROM system_config WHERE id=1');
    const config = configRows[0];
    const [accounts] = await pool.execute(`SELECT * FROM google_accounts`);
    const result = [];
    for (const acc of accounts) {
      let currentAccessToken = acc.access_token;
      let currentExpiry = acc.expiry_date;
      const now = Date.now();
      if (config && config.client_id && config.client_secret && acc.refresh_token) {
        if (Number(currentExpiry) < now + 5 * 60 * 1000) {
          const newData = await refreshGoogleAccessToken(config.client_id, config.client_secret, acc.refresh_token);
          if (newData && newData.access_token) {
            currentAccessToken = newData.access_token;
            currentExpiry = now + (newData.expires_in * 1000); 
            await pool.execute(
              'UPDATE google_accounts SET access_token=?, expiry_date=? WHERE email=?',
              [currentAccessToken, currentExpiry, acc.email]
            );
          }
        }
      }
      const [chs] = await pool.execute(
        'SELECT channel_id FROM account_channels WHERE account_email=?',
        [acc.email]
      );
      result.push({
        email: acc.email,
        accessToken: currentAccessToken,
        refreshToken: acc.refresh_token,
        expiryDate: currentExpiry,
        ownedChannelIds: chs.map(c => c.channel_id)
      });
    }
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/google-accounts', authenticateToken, isAdmin, async (req, res) => {
  const { email, accessToken, refreshToken, expiryDate, channelIds } = req.body;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(
      `INSERT INTO google_accounts (email, access_token, refresh_token, expiry_date)
       VALUES (?,?,?,?)
       ON DUPLICATE KEY UPDATE access_token=VALUES(access_token),
       refresh_token=VALUES(refresh_token),
       expiry_date=VALUES(expiry_date)`,
      [email, accessToken, refreshToken, expiryDate]
    );
    await conn.execute('DELETE FROM account_channels WHERE account_email=?', [email]);
    for (const cid of channelIds || []) {
      await conn.execute(
        'INSERT INTO account_channels (account_email, channel_id) VALUES (?,?)',
        [email, cid]
      );
    }
    await conn.commit();
    res.json({ message: 'Google account saved' });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ error: e.message });
  } finally {
    conn.release();
  }
});

/* ===================== SYSTEM CONFIG ===================== */
app.get('/api/system/config', authenticateToken, async (_, res) => {
  const [rows] = await pool.execute(`
    SELECT client_id AS clientId, client_secret AS clientSecret, api_keys AS apiKeys, language, redirect_uri_override AS redirectUriOverride 
    FROM system_config WHERE id=1
  `);
  res.json(rows[0] || {});
});

app.post('/api/system/config', authenticateToken, isAdmin, async (req, res) => {
  const { clientId, clientSecret, apiKeys, language, redirectUriOverride } = req.body;
  try {
    await pool.execute(
      `INSERT INTO system_config (id, client_id, client_secret, api_keys, language, redirect_uri_override)
       VALUES (1,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE client_id=VALUES(client_id), client_secret=VALUES(client_secret),
       api_keys=VALUES(api_keys), language=VALUES(language), redirect_uri_override=VALUES(redirect_uri_override)`,
      [clientId, clientSecret, JSON.stringify(apiKeys), language, redirectUriOverride]
    );
    res.json({ message: 'Config saved' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

/* ===================== SYSTEM LOGS ===================== */
app.get('/api/system/logs', authenticateToken, isAdmin, async (_, res) => {
  const [rows] = await pool.execute('SELECT id, timestamp, level, message FROM system_logs ORDER BY timestamp DESC LIMIT 300');
  res.json(rows);
});

app.post('/api/system/logs', authenticateToken, async (req, res) => {
  await addSystemLog(req.body.level, req.body.message);
  res.json({ message: 'Log added' });
});

app.delete('/api/system/logs', authenticateToken, isAdmin, async (_, res) => {
  await pool.execute('DELETE FROM system_logs');
  res.json({ message: 'Logs cleared' });
});

/* ===================== TASKS ===================== */
app.get('/api/tasks', authenticateToken, async (_, res) => {
  const [rows] = await pool.execute('SELECT id, channel_id AS channelId, video_title AS videoTitle, status, progress, created_at AS createdAt FROM upload_tasks ORDER BY created_at DESC');
  res.json(rows);
});

/* ===================== MUSIC ASSETS ===================== */
const uploadDir = path.join(__dirname, 'uploads/music');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname))
});
const upload = multer({ storage: storage, limits: { fileSize: 50 * 1024 * 1024 } });

app.get('/api/music', authenticateToken, async (_, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM music_assets ORDER BY created_at DESC');
    res.json(rows.map(m => ({ ...m, tags: typeof m.tags === 'string' ? JSON.parse(m.tags) : (m.tags || []) })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/music/upload', authenticateToken, isAdmin, upload.single('audioFile'), async (req, res) => {
  try {
    const { title, artist, genre, mood, bpm, tags } = req.body;
    if (!req.file) return res.status(400).json({ error: 'Vui lòng chọn tệp âm thanh' });
    const fileUrl = `/uploads/music/${req.file.filename}`;
    const musicId = `m-${Date.now()}`;
    await pool.execute(`INSERT INTO music_assets (id, title, artist, duration, genre, mood, bpm, url, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [musicId, title || req.file.originalname, artist || 'Unknown Artist', '0:00', genre || 'Other', mood || 'Neutral', bpm || 120, fileUrl, tags || '[]']);
    res.json({ message: 'Tải lên thành công', id: musicId, url: fileUrl });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/music/genres', authenticateToken, async (_, res) => {
  const [rows] = await pool.execute('SELECT * FROM music_genres ORDER BY name ASC');
  res.json(rows);
});

app.post('/api/music/genres', authenticateToken, isAdmin, async (req, res) => {
  const { name } = req.body;
  const slug = name.toLowerCase().trim().replace(/\s+/g, '-');
  await pool.execute('INSERT INTO music_genres (name, slug) VALUES (?, ?)', [name, slug]);
  res.json({ message: 'Genre added' });
});

app.delete('/api/music/genres/:id', authenticateToken, isAdmin, async (req, res) => {
  await pool.execute('DELETE FROM music_genres WHERE id=?', [req.params.id]);
  res.json({ message: 'Genre deleted' });
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 YT MANAGER PRO API running at http://0.0.0.0:${PORT}`);
});
