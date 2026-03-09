import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pg from 'pg';
import Database from 'better-sqlite3';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Stripe from 'stripe';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database configuration
const isProduction = process.env.NODE_ENV === 'production';
let connectionString = process.env.DATABASE_URL;

// Check if DATABASE_URL is a placeholder or invalid
if (connectionString && (connectionString.includes('postgresql://user:password') || connectionString.includes('@base'))) {
  console.log('⚠️ DATABASE_URL appears to be a placeholder. Falling back to SQLite.');
  connectionString = undefined;
}

let realPool: any;
let sqliteDb: any;
let dbType: 'postgres' | 'sqlite' = 'postgres';

const initSqlite = () => {
  const dbPath = process.env.VERCEL ? '/tmp/local.db' : 'local.db';
  console.log(`⚠️ Initializing SQLite database (${dbPath})...`);
  try {
    sqliteDb = new Database(dbPath);
    dbType = 'sqlite';
    console.log('✅ SQLite initialized successfully.');
  } catch (err) {
    console.error('❌ Failed to initialize SQLite:', err);
    throw err;
  }
};

if (connectionString) {
  realPool = new Pool({
    connectionString: connectionString,
    ssl: isProduction ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 5000, // Fail fast
  });
  dbType = 'postgres';
} else {
  console.log('⚠️ DATABASE_URL not found or invalid. Falling back to SQLite.');
  initSqlite();
}

// Unified pool interface
const pool = {
  query: async (text: string, params: any[] = []): Promise<any> => {
    if (dbType === 'postgres') {
      try {
        return await realPool.query(text, params);
      } catch (err: any) {
        // If Postgres fails with connection error, try to fallback if not already handled
        if (err.code === 'ECONNREFUSED' || err.toString().includes('getaddrinfo')) {
           console.error('❌ Postgres query failed (connection issue). Switching to SQLite fallback...');
           // Attempt to switch to SQLite on the fly if not already
           try {
             if (!sqliteDb) initSqlite();
             dbType = 'sqlite';
             // Retry the query with SQLite
             return pool.query(text, params);
           } catch (sqliteErr) {
             console.error('❌ SQLite fallback failed:', sqliteErr);
             throw err; // Throw original error
           }
        }
        throw err;
      }
    } else {
      // SQLite adapter
      if (!sqliteDb) {
        throw new Error('SQLite database not initialized');
      }
      let sql = text.replace(/\$(\d+)/g, '?');
      
      // Handle RETURNING clause
      const isInsert = sql.trim().toUpperCase().startsWith('INSERT');
      const hasReturning = sql.toUpperCase().includes('RETURNING');
      
      if (isInsert && hasReturning) {
        sql = sql.split('RETURNING')[0];
      }

      try {
        const stmt = sqliteDb.prepare(sql);
        
        if (sql.trim().toUpperCase().startsWith('SELECT')) {
          const rows = stmt.all(...params);
          return { rows, rowCount: rows.length };
        } else {
          const info = stmt.run(...params);
          if (isInsert && hasReturning) {
             return { rows: [{ id: info.lastInsertRowid }], rowCount: info.changes };
          }
          return { rows: [], rowCount: info.changes };
        }
      } catch (err) {
        console.error("SQLite Query Error:", err);
        throw err;
      }
    }
  },
  connect: async () => {
    if (dbType === 'postgres') {
      return realPool.connect();
    } else {
      // Mock client for SQLite transactions
      return {
        query: async (text: string, params: any[] = []) => {
          if (text === 'BEGIN') return; 
          if (text === 'COMMIT') return;
          if (text === 'ROLLBACK') return;
          return pool.query(text, params);
        },
        release: () => {}
      };
    }
  }
};

const JWT_SECRET = process.env.JWT_SECRET || 'ff-tournament-secret-key-2024';
let isDbReady = false;

// Initialize Database
const initDb = async () => {
  try {
    if (dbType === 'postgres') {
      try {
        // Check connection
        const client = await realPool.connect();
        client.release();
        console.log('✅ Connected to Postgres successfully.');
      } catch (err) {
        console.error('❌ Failed to connect to Postgres:', err);
        console.log('🔄 Switching to SQLite fallback...');
        initSqlite();
      }
    }
    
    console.log(`Initializing ${dbType} database...`);

    if (dbType === 'postgres') {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          phone TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          raw_password TEXT,
          uid TEXT UNIQUE,
          ign TEXT,
          role TEXT DEFAULT 'user',
          wallet_balance REAL DEFAULT 0,
          bonus_balance REAL DEFAULT 0,
          winning_balance REAL DEFAULT 0,
          status TEXT DEFAULT 'active',
          referral_code TEXT UNIQUE,
          referred_by TEXT,
          profile_photo_url TEXT,
          header_bg_url TEXT,
          is_verified INTEGER DEFAULT 0,
          reset_token TEXT,
          reset_token_expiry TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS notifications (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          type TEXT DEFAULT 'info',
          is_read INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS tournaments (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          entry_fee REAL NOT NULL,
          prize_pool REAL NOT NULL,
          game_type TEXT NOT NULL,
          map TEXT NOT NULL,
          total_slots INTEGER NOT NULL,
          filled_slots INTEGER DEFAULT 0,
          match_time TIMESTAMP NOT NULL,
          status TEXT DEFAULT 'upcoming',
          thumbnail_url TEXT,
          room_id TEXT,
          room_password TEXT,
          rules TEXT,
          prize_details TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      try {
        await pool.query('ALTER TABLE users ADD COLUMN raw_password TEXT');
      } catch (e) {
        // column might already exist
      }

      await pool.query(`
        CREATE TABLE IF NOT EXISTS tournament_participants (
          id SERIAL PRIMARY KEY,
          tournament_id INTEGER NOT NULL REFERENCES tournaments(id),
          user_id INTEGER NOT NULL REFERENCES users(id),
          player_names TEXT NOT NULL,
          status TEXT DEFAULT 'joined',
          kills INTEGER DEFAULT 0,
          rank INTEGER,
          winnings REAL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(tournament_id, user_id)
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS payments (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          method TEXT NOT NULL,
          transaction_id TEXT UNIQUE NOT NULL,
          amount REAL NOT NULL,
          screenshot_url TEXT,
          status TEXT DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS wallet_transactions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          type TEXT NOT NULL,
          amount REAL NOT NULL,
          description TEXT,
          status TEXT DEFAULT 'completed',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS withdraw_requests (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          amount REAL NOT NULL,
          method TEXT NOT NULL,
          account_number TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      await pool.query(`
        CREATE TABLE IF NOT EXISTS match_results (
          id SERIAL PRIMARY KEY,
          tournament_id INTEGER NOT NULL REFERENCES tournaments(id),
          user_id INTEGER NOT NULL REFERENCES users(id),
          kills INTEGER DEFAULT 0,
          rank INTEGER,
          screenshot_url TEXT,
          status TEXT DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);

    } else {
      // SQLite Schema
      const tables = [
        `CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          phone TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          raw_password TEXT,
          uid TEXT UNIQUE,
          ign TEXT,
          role TEXT DEFAULT 'user',
          wallet_balance REAL DEFAULT 0,
          bonus_balance REAL DEFAULT 0,
          winning_balance REAL DEFAULT 0,
          status TEXT DEFAULT 'active',
          referral_code TEXT UNIQUE,
          referred_by TEXT,
          profile_photo_url TEXT,
          header_bg_url TEXT,
          is_verified INTEGER DEFAULT 0,
          reset_token TEXT,
          reset_token_expiry DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          type TEXT DEFAULT 'info',
          is_read INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(user_id) REFERENCES users(id)
        )`,
        `CREATE TABLE IF NOT EXISTS tournaments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          entry_fee REAL NOT NULL,
          prize_pool REAL NOT NULL,
          game_type TEXT NOT NULL,
          map TEXT NOT NULL,
          total_slots INTEGER NOT NULL,
          filled_slots INTEGER DEFAULT 0,
          match_time DATETIME NOT NULL,
          status TEXT DEFAULT 'upcoming',
          thumbnail_url TEXT,
          room_id TEXT,
          room_password TEXT,
          rules TEXT,
          prize_details TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
      ];
      
      for (const q of tables) {
        await pool.query(q);
      }

      try {
        await pool.query('ALTER TABLE users ADD COLUMN raw_password TEXT');
      } catch (e) {
        // column might already exist
      }

      const tables2 = [
        `CREATE TABLE IF NOT EXISTS tournament_participants (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tournament_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          player_names TEXT NOT NULL,
          status TEXT DEFAULT 'joined',
          kills INTEGER DEFAULT 0,
          rank INTEGER,
          winnings REAL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(tournament_id, user_id),
          FOREIGN KEY(tournament_id) REFERENCES tournaments(id),
          FOREIGN KEY(user_id) REFERENCES users(id)
        )`,
        `CREATE TABLE IF NOT EXISTS payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          method TEXT NOT NULL,
          transaction_id TEXT UNIQUE NOT NULL,
          amount REAL NOT NULL,
          screenshot_url TEXT,
          status TEXT DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(user_id) REFERENCES users(id)
        )`,
        `CREATE TABLE IF NOT EXISTS wallet_transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          type TEXT NOT NULL,
          amount REAL NOT NULL,
          description TEXT,
          status TEXT DEFAULT 'completed',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(user_id) REFERENCES users(id)
        )`,
        `CREATE TABLE IF NOT EXISTS withdraw_requests (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          amount REAL NOT NULL,
          method TEXT NOT NULL,
          account_number TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(user_id) REFERENCES users(id)
        )`,
        `CREATE TABLE IF NOT EXISTS match_results (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tournament_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          kills INTEGER DEFAULT 0,
          rank INTEGER,
          screenshot_url TEXT,
          status TEXT DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(tournament_id) REFERENCES tournaments(id),
          FOREIGN KEY(user_id) REFERENCES users(id)
        )`,
        `CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )`
      ];

      for (const sql of tables2) {
        await pool.query(sql);
      }
    }


    console.log('Database schema initialized');
    isDbReady = true;
  } catch (e) {
    console.error('Error initializing database schema:', e);
  }
};

// Migrations
const runMigrations = async () => {
  try {
    const client = await pool.connect();
    try {
      const addColumn = async (table: string, column: string, type: string) => {
        try {
          await client.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
        } catch (e) {
          // Ignore if fails (e.g. column exists)
        }
      };
  
      await addColumn('users', 'profile_photo_url', 'TEXT');
      await addColumn('tournaments', 'thumbnail_url', 'TEXT');
      await addColumn('users', 'header_bg_url', 'TEXT');
      await addColumn('tournaments', 'rules', 'TEXT');
      await addColumn('tournaments', 'prize_details', 'TEXT');
      await addColumn('tournament_participants', 'kills', 'INTEGER DEFAULT 0');
      await addColumn('tournament_participants', 'rank', 'INTEGER');
      await addColumn('tournament_participants', 'winnings', 'REAL DEFAULT 0');
      await addColumn('tournament_participants', 'player_names', 'TEXT');
      await addColumn('users', 'is_verified', 'INTEGER DEFAULT 0');
      await addColumn('users', 'reset_token', 'TEXT');
      await addColumn('users', 'reset_token_expiry', 'TIMESTAMP');
    } finally {
      client.release();
    }
  } catch (e) {
    console.error('Migration error:', e);
  }
};

// Seed Default Admin
const seedAdmin = async () => {
  try {
    const res = await pool.query('SELECT id FROM users WHERE email = $1', ['admin@eliteff.com']);
    if (res.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await pool.query(
        'INSERT INTO users (name, email, phone, password, role, referral_code) VALUES ($1, $2, $3, $4, $5, $6)',
        ['Super Admin', 'admin@eliteff.com', '01700000000', hashedPassword, 'super_admin', 'ADMIN777']
      );
      console.log('Default admin created: admin@eliteff.com / admin123');
    }
  } catch (e) {
    console.error('Seed admin error:', e);
  }
};

// Seed Firebase Config
const seedSettings = async () => {
  try {
    const firebaseConfig = {
      apiKey: "AIzaSyBr0bf5OYNlYhv_nzgQDxoa_yyWcqmx8F4",
      authDomain: "elite-ff-tunament.firebaseapp.com",
      databaseURL: "https://elite-ff-tunament-default-rtdb.firebaseio.com",
      projectId: "elite-ff-tunament",
      storageBucket: "elite-ff-tunament.firebasestorage.app",
      messagingSenderId: "926806930190",
      appId: "1:926806930190:web:bb23d085f9dc1b502a9d5f",
      measurementId: "G-66B6695QL0"
    };
    
    if (dbType === 'postgres') {
      await pool.query(
        'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
        ['firebase_config', JSON.stringify(firebaseConfig)]
      );
    } else {
      await pool.query(
        'INSERT OR REPLACE INTO settings (key, value) VALUES ($1, $2)',
        ['firebase_config', JSON.stringify(firebaseConfig)]
      );
    }
    console.log('Firebase config permanently saved/updated in database');
  } catch (e) {
    console.error('Seed settings error:', e);
  }
};

// Ensure uploads directory exists
const uploadsDir = process.env.VERCEL ? '/tmp/uploads' : 'uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

const seedTournaments = async () => {
  try {
    const res = await pool.query('SELECT COUNT(*) as count FROM tournaments');
    const count = parseInt(res.rows[0].count);
    if (count === 0) {
      await pool.query(`
        INSERT INTO tournaments (title, entry_fee, prize_pool, game_type, map, total_slots, match_time)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, ['Elite FF Solo Cup', 20, 1000, 'Solo', 'Bermuda', 48, new Date(Date.now() + 86400000).toISOString()]);
      console.log('Seeded initial tournament');
    }
    const countRes = await pool.query('SELECT COUNT(*) as count FROM tournaments');
    console.log(`Total tournaments in DB: ${countRes.rows[0].count}`);
  } catch (e) {
    console.error('Seed tournaments error:', e);
  }
};

function setupRoutes(app: express.Application) {
  console.log('Configuring routes...');
  
  const PORT = 3000;

  app.use(cors());
  // Webhook needs raw body
  app.post('/api/payment/webhook', express.raw({ type: 'application/json' }), async (req: any, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!endpointSecret) {
      return res.status(400).send('Webhook secret not configured');
    }

    let event;
    try {
      const stripe = getStripe();
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err: any) {
      console.error('Webhook Error:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;
      const amount = (session.amount_total || 0) / 100;

      if (userId) {
        try {
          await pool.query('BEGIN');
          // Add to wallet balance
          await pool.query('UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2', [amount, userId]);
          // Record transaction
          await pool.query(
            'INSERT INTO payments (user_id, method, transaction_id, amount, status) VALUES ($1, $2, $3, $4, $5)',
            [userId, 'Stripe', session.payment_intent as string, amount, 'approved']
          );
          await pool.query(
            'INSERT INTO wallet_transactions (user_id, type, amount, description) VALUES ($1, $2, $3, $4)',
            [userId, 'deposit', amount, 'Stripe deposit']
          );
          await pool.query('COMMIT');
        } catch (error) {
          await pool.query('ROLLBACK');
          console.error('Error processing successful payment:', error);
        }
      }
    }

    res.json({ received: true });
  });

  app.use(express.json());
  app.use(cookieParser());
  app.use('/uploads', express.static(uploadsDir));

  // Request Logger
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', dbReady: isDbReady });
  });

  // DB Readiness Middleware
  app.use((req, res, next) => {
    if (!isDbReady && req.path.startsWith('/api') && !req.path.startsWith('/api/health')) {
      return res.status(503).json({ 
        error: 'Database initializing', 
        message: 'Please wait a moment while the database connects.' 
      });
    }
    next();
  });

  // Background initialization will be started separately
  
  // ... (rest of the file)

  // Auth Middleware
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  const isAdmin = (req: any, res: any, next: any) => {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };

  // --- Auth Routes ---
  app.post('/api/auth/register', async (req, res) => {
    const { name, email, phone, password, referralCode, uid, ign } = req.body;
    try {
      const existingEmail = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existingEmail.rows.length > 0) return res.status(400).json({ error: 'Email already in use' });
      
      const existingPhone = await pool.query('SELECT id FROM users WHERE phone = $1', [phone]);
      if (existingPhone.rows.length > 0) return res.status(400).json({ error: 'Phone number already in use' });

      if (uid) {
        const existingUid = await pool.query('SELECT id FROM users WHERE uid = $1', [uid]);
        if (existingUid.rows.length > 0) return res.status(400).json({ error: 'UID already in use' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const myReferralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const result = await pool.query(
        'INSERT INTO users (name, email, phone, password, raw_password, referral_code, referred_by, uid, ign) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id',
        [name, email, phone, hashedPassword, password, myReferralCode, referralCode || null, uid || null, ign || null]
      );
      
      const userRes = await pool.query(
        'SELECT id, name, email, phone, role, wallet_balance, bonus_balance, winning_balance, referral_code, uid, ign FROM users WHERE id = $1',
        [result.rows[0].id]
      );
      const user = userRes.rows[0];
      const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
      
      res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'none' });
      res.json({ user, token });
    } catch (err: any) {
      console.error('Registration error:', err);
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      const userRes = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      const user = userRes.rows[0];
      
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'none' });
      res.json({ 
        user: { 
          id: user.id, 
          name: user.name, 
          email: user.email, 
          role: user.role,
          wallet_balance: user.wallet_balance,
          bonus_balance: user.bonus_balance,
          winning_balance: user.winning_balance,
          referral_code: user.referral_code,
          profile_photo_url: user.profile_photo_url
        }, 
        token 
      });
    } catch (err: any) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Internal server error during login' });
    }
  });

  app.get('/api/auth/me', authenticate, async (req: any, res) => {
    const userRes = await pool.query(
      'SELECT id, name, email, phone, uid, ign, role, wallet_balance, bonus_balance, winning_balance, referral_code, profile_photo_url, header_bg_url, is_verified FROM users WHERE id = $1',
      [req.user.id]
    );
    const user = userRes.rows[0];
    
    if (user) {
      const statsRes = await pool.query(
        'SELECT COUNT(*) as matches_played, SUM(kills) as total_kills FROM match_results WHERE user_id = $1',
        [user.id]
      );
      const stats = statsRes.rows[0];
      user.matches_played = parseInt(stats.matches_played) || 0;
      user.total_kills = parseInt(stats.total_kills) || 0;
    }
    
    res.json(user);
  });

  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out' });
  });

  app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    const userRes = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    const user = userRes.rows[0];
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const expiry = new Date(Date.now() + 3600000).toISOString();

    await pool.query('UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE id = $3', [token, expiry, user.id]);

    console.log(`Password reset link for ${email}: /reset-password?token=${token}`);
    res.json({ message: 'Password reset link has been sent to your email (Simulated). Check console for link.' });
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    const { token, password } = req.body;
    const userRes = await pool.query(
      'SELECT id FROM users WHERE reset_token = $1 AND reset_token_expiry > $2',
      [token, new Date().toISOString()]
    );
    const user = userRes.rows[0];

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      'UPDATE users SET password = $1, reset_token = NULL, reset_token_expiry = NULL WHERE id = $2',
      [hashedPassword, user.id]
    );

    res.json({ message: 'Password has been reset successfully' });
  });

  // --- User Profile ---
  app.put('/api/user/profile', authenticate, async (req: any, res) => {
    const { name, uid, ign } = req.body;
    try {
      await pool.query('UPDATE users SET name = $1, uid = $2, ign = $3 WHERE id = $4', [name, uid, ign, req.user.id]);
      res.json({ message: 'Profile updated' });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // --- Tournament Routes ---
  app.get('/api/tournaments', async (req: any, res) => {
    const token = req.cookies.token;
    let userId = null;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        userId = decoded.id;
      } catch (e) {}
    }

    const tournamentsRes = await pool.query(`
      SELECT t.*, 
      (SELECT COUNT(*) FROM tournament_participants WHERE tournament_id = t.id AND user_id = $1) as is_joined
      FROM tournaments t 
      ORDER BY match_time ASC
    `, [userId]);
    const tournaments = tournamentsRes.rows;

    let isAdmin = false;
    if (userId) {
      const userRes = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
      const user = userRes.rows[0];
      isAdmin = user && (user.role === 'admin' || user.role === 'super_admin');
    }

    const sanitizedTournaments = tournaments.map((t: any) => {
      // Postgres returns counts as strings usually, convert to number/boolean
      t.is_joined = parseInt(t.is_joined) > 0;
      
      if (t.is_joined || isAdmin) {
        return t;
      }
      const { room_id, room_password, ...rest } = t;
      return rest;
    });

    console.log(`Fetched ${sanitizedTournaments.length} tournaments for user ${userId}`);
    res.json(sanitizedTournaments);
  });

  app.get('/api/tournaments/:id', async (req, res) => {
    const tournamentRes = await pool.query('SELECT * FROM tournaments WHERE id = $1', [req.params.id]);
    const tournament = tournamentRes.rows[0];
    
    const participantsRes = await pool.query(`
      SELECT u.id as user_id, u.name, u.ign, tp.player_names, tp.kills, tp.rank, tp.winnings 
      FROM tournament_participants tp 
      JOIN users u ON tp.user_id = u.id 
      WHERE tp.tournament_id = $1 
      ORDER BY CASE WHEN tp.rank IS NULL THEN 1 ELSE 0 END, tp.rank ASC, tp.kills DESC
    `, [req.params.id]);
    const participants = participantsRes.rows;
    
    res.json({ ...(tournament as any), participants });
  });

  app.post('/api/admin/tournaments/:id/add-user', authenticate, isAdmin, async (req, res) => {
    const { userId, playerNames } = req.body;
    if (!userId || !playerNames || !Array.isArray(playerNames) || playerNames.length === 0) {
      return res.status(400).json({ error: 'User ID and Player names are required' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const tournamentRes = await client.query('SELECT * FROM tournaments WHERE id = $1', [req.params.id]);
      const tournament = tournamentRes.rows[0];
      
      const userRes = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
      const user = userRes.rows[0];

      if (!tournament) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Tournament not found' });
      }
      
      if (!user) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'User not found' });
      }

      if (tournament.filled_slots >= tournament.total_slots) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Tournament is full' });
      }

      const existingRes = await client.query('SELECT * FROM tournament_participants WHERE tournament_id = $1 AND user_id = $2', [req.params.id, userId]);
      if (existingRes.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'User already joined this tournament' });
      }

      await client.query(
        'INSERT INTO tournament_participants (tournament_id, user_id, player_names) VALUES ($1, $2, $3)',
        [req.params.id, userId, JSON.stringify(playerNames)]
      );

      await client.query(
        'UPDATE tournaments SET filled_slots = filled_slots + 1 WHERE id = $1',
        [req.params.id]
      );

      await client.query('COMMIT');
      res.json({ message: 'User added to tournament successfully' });
    } catch (err: any) {
      await client.query('ROLLBACK');
      res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  });

  app.post('/api/tournaments/:id/join', authenticate, async (req: any, res) => {
    const { playerNames } = req.body;
    if (!playerNames || !Array.isArray(playerNames) || playerNames.length === 0) {
      return res.status(400).json({ error: 'Player names are required' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const tournamentRes = await client.query('SELECT * FROM tournaments WHERE id = $1', [req.params.id]);
      const tournament = tournamentRes.rows[0];
      
      const userRes = await client.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
      const user = userRes.rows[0];

      if (!tournament) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Tournament not found' });
      }
      
      const expectedPlayers = tournament.game_type === 'Solo' ? 1 : (tournament.game_type === 'Duo' ? 2 : 4);
      if (playerNames.length !== expectedPlayers) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Exactly ${expectedPlayers} player names are required for ${tournament.game_type}` });
      }

      if (playerNames.some(name => !name || name.trim() === '')) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'All player names must be filled' });
      }

      if (tournament.filled_slots >= tournament.total_slots) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Tournament full' });
      }
      
      const alreadyJoinedRes = await client.query('SELECT id FROM tournament_participants WHERE tournament_id = $1 AND user_id = $2', [req.params.id, req.user.id]);
      if (alreadyJoinedRes.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Already joined' });
      }

      const totalBalance = user.wallet_balance + user.bonus_balance + user.winning_balance;
      if (totalBalance < tournament.entry_fee) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Insufficient balance' });
      }

      let remainingFee = tournament.entry_fee;
      let newBonus = user.bonus_balance;
      let newWallet = user.wallet_balance;
      let newWinning = user.winning_balance;

      if (newBonus >= remainingFee) {
        newBonus -= remainingFee;
        remainingFee = 0;
      } else {
        remainingFee -= newBonus;
        newBonus = 0;
      }

      if (remainingFee > 0) {
        if (newWallet >= remainingFee) {
          newWallet -= remainingFee;
          remainingFee = 0;
        } else {
          remainingFee -= newWallet;
          newWallet = 0;
        }
      }

      if (remainingFee > 0) {
        newWinning -= remainingFee;
      }

      await client.query(
        'UPDATE users SET wallet_balance = $1, bonus_balance = $2, winning_balance = $3 WHERE id = $4',
        [newWallet, newBonus, newWinning, req.user.id]
      );
      await client.query(
        'INSERT INTO tournament_participants (tournament_id, user_id, player_names) VALUES ($1, $2, $3)',
        [req.params.id, req.user.id, JSON.stringify(playerNames)]
      );
      await client.query(
        'UPDATE tournaments SET filled_slots = filled_slots + 1 WHERE id = $1',
        [req.params.id]
      );
      await client.query(
        'INSERT INTO wallet_transactions (user_id, type, amount, description) VALUES ($1, $2, $3, $4)',
        [req.user.id, 'entry_fee', -tournament.entry_fee, `Joined tournament: ${tournament.title}`]
      );

      await client.query('COMMIT');
      res.json({ message: 'Joined successfully' });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  });

  // --- Wallet Routes ---
  let stripeClient: Stripe | null = null;
  function getStripe(): Stripe {
    if (!stripeClient) {
      const key = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';
      stripeClient = new Stripe(key);
    }
    return stripeClient;
  }

  app.post('/api/payment/create', authenticate, async (req: any, res) => {
    try {
      const { amount } = req.body;
      if (!amount || amount < 10) {
        return res.status(400).json({ error: 'Minimum deposit is 10 BDT' });
      }

      const stripe = getStripe();
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'bdt',
              product_data: {
                name: 'Wallet Deposit',
              },
              unit_amount: amount * 100, // Stripe expects amount in cents/paisa
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.APP_URL || 'http://localhost:3000'}/?payment=success`,
        cancel_url: `${process.env.APP_URL || 'http://localhost:3000'}/?payment=cancel`,
        client_reference_id: req.user.id.toString(),
      });

      res.json({ gatewayUrl: session.url });
    } catch (error: any) {
      console.error('Stripe error:', error);
      res.status(500).json({ error: 'Failed to initiate payment' });
    }
  });

  app.post('/api/wallet/deposit', authenticate, upload.single('screenshot'), async (req: any, res) => {
    const { method, transactionId, amount } = req.body;
    try {
      await pool.query(
        'INSERT INTO payments (user_id, method, transaction_id, amount, screenshot_url) VALUES ($1, $2, $3, $4, $5)',
        [req.user.id, method, transactionId, amount, req.file ? `/uploads/${req.file.filename}` : null]
      );
      res.json({ message: 'Deposit request submitted' });
    } catch (err: any) {
      res.status(400).json({ error: 'Transaction ID already exists or invalid data' });
    }
  });

  app.post('/api/wallet/withdraw', authenticate, async (req: any, res) => {
    const client = await pool.connect();
    try {
      const { amount: rawAmount, method, accountNumber } = req.body;
      const amount = parseFloat(rawAmount);
      
      if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
      }

      await client.query('BEGIN');

      const userRes = await client.query('SELECT winning_balance FROM users WHERE id = $1', [req.user.id]);
      const user = userRes.rows[0];
      
      if (!user) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'User not found' });
      }

      if (amount < 100) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Minimum withdraw 100 BDT' });
      }

      if (user.winning_balance < amount) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Insufficient winning balance' });
      }

      await client.query('UPDATE users SET winning_balance = winning_balance - $1 WHERE id = $2', [amount, req.user.id]);
      await client.query(
        'INSERT INTO withdraw_requests (user_id, amount, method, account_number) VALUES ($1, $2, $3, $4)',
        [req.user.id, amount, method, accountNumber]
      );
      await client.query(
        'INSERT INTO wallet_transactions (user_id, type, amount, description) VALUES ($1, $2, $3, $4)',
        [req.user.id, 'withdraw', -amount, `Withdrawal request to ${method}`]
      );

      await client.query('COMMIT');
      res.json({ message: 'Withdraw request submitted' });
    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error('Withdraw error:', err);
      res.status(500).json({ error: 'Failed to submit withdraw request. Please try again.' });
    } finally {
      client.release();
    }
  });

  app.get('/api/wallet/history', authenticate, async (req: any, res) => {
    const historyRes = await pool.query('SELECT * FROM wallet_transactions WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.json(historyRes.rows);
  });

  app.put('/api/user/photo', authenticate, (req: any, res: any, next: any) => {
    upload.single('photo')(req, res, (err) => {
      if (err) {
        console.error('Multer error:', err);
        return res.status(400).json({ error: 'Upload error: ' + err.message });
      }
      next();
    });
  }, async (req: any, res) => {
    console.log('Photo upload request received');
    console.log('req.file:', req.file);
    console.log('req.body:', req.body);
    if (!req.file) return res.status(400).json({ error: 'No photo uploaded' });
    const photoUrl = `/uploads/${req.file.filename}`;
    await pool.query('UPDATE users SET profile_photo_url = $1 WHERE id = $2', [photoUrl, req.user.id]);
    res.json({ message: 'Profile photo updated', photoUrl });
  });

  app.put('/api/user/header-bg', authenticate, upload.single('header_bg'), async (req: any, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const url = `/uploads/${req.file.filename}`;
    await pool.query('UPDATE users SET header_bg_url = $1 WHERE id = $2', [url, req.user.id]);
    res.json({ url });
  });

  // --- Admin Routes ---
  app.get('/api/admin/stats', authenticate, isAdmin, async (req, res) => {
    const totalUsersRes = await pool.query('SELECT COUNT(*) as count FROM users');
    const totalEarningsRes = await pool.query("SELECT SUM(amount) as sum FROM payments WHERE status = 'approved'");
    const activeTournamentsRes = await pool.query("SELECT COUNT(*) as count FROM tournaments WHERE status = 'upcoming'");
    const pendingPaymentsRes = await pool.query("SELECT COUNT(*) as count FROM payments WHERE status = 'pending'");
    const pendingWithdrawsRes = await pool.query("SELECT COUNT(*) as count FROM withdraw_requests WHERE status = 'pending'");
    
    res.json({ 
      totalUsers: parseInt(totalUsersRes.rows[0].count), 
      totalEarnings: parseFloat(totalEarningsRes.rows[0].sum) || 0, 
      activeTournaments: parseInt(activeTournamentsRes.rows[0].count), 
      pendingPayments: parseInt(pendingPaymentsRes.rows[0].count), 
      pendingWithdraws: parseInt(pendingWithdrawsRes.rows[0].count) 
    });
  });

  app.post('/api/admin/tournaments', authenticate, isAdmin, upload.single('thumbnail'), async (req: any, res) => {
    try {
      const { title, entry_fee, prize_pool, game_type, map, total_slots, match_time, room_id, room_password } = req.body;
      const thumbnail_url = req.file ? `/uploads/${req.file.filename}` : null;
      const result = await pool.query(
        'INSERT INTO tournaments (title, entry_fee, prize_pool, game_type, map, total_slots, match_time, thumbnail_url, room_id, room_password) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id',
        [title, entry_fee, prize_pool, game_type, map, total_slots, match_time, thumbnail_url, room_id || null, room_password || null]
      );
      res.json({ id: result.rows[0].id });
    } catch (err: any) {
      console.error('Tournament creation error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/admin/tournaments/:id', authenticate, isAdmin, upload.single('thumbnail'), async (req: any, res) => {
    try {
      const { title, entry_fee, prize_pool, game_type, map, total_slots, match_time, room_id, room_password, status } = req.body;
      const thumbnail_url = req.file ? `/uploads/${req.file.filename}` : null;
      
      if (thumbnail_url) {
        await pool.query(
          'UPDATE tournaments SET title = $1, entry_fee = $2, prize_pool = $3, game_type = $4, map = $5, total_slots = $6, match_time = $7, thumbnail_url = $8, room_id = $9, room_password = $10, status = $11 WHERE id = $12',
          [title, entry_fee, prize_pool, game_type, map, total_slots, match_time, thumbnail_url, room_id || null, room_password || null, status, req.params.id]
        );
      } else {
        await pool.query(
          'UPDATE tournaments SET title = $1, entry_fee = $2, prize_pool = $3, game_type = $4, map = $5, total_slots = $6, match_time = $7, room_id = $8, room_password = $9, status = $10 WHERE id = $11',
          [title, entry_fee, prize_pool, game_type, map, total_slots, match_time, room_id || null, room_password || null, status, req.params.id]
        );
      }
      res.json({ message: 'Tournament updated' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/admin/tournaments/:id', authenticate, isAdmin, async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM match_results WHERE tournament_id = $1', [req.params.id]);
      await client.query('DELETE FROM tournament_participants WHERE tournament_id = $1', [req.params.id]);
      await client.query('DELETE FROM tournaments WHERE id = $1', [req.params.id]);
      await client.query('COMMIT');
      res.json({ message: 'Tournament deleted' });
    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error('Tournament deletion error:', err);
      res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  });

  app.post('/api/admin/tournaments/:id/results', authenticate, isAdmin, async (req, res) => {
    const { results } = req.body; // Array of { user_id, rank, kills, winnings }
    const tournamentId = req.params.id;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      for (const r of results) {
        // Update participant record for leaderboard
        await client.query(
          'UPDATE tournament_participants SET kills = $1, rank = $2, winnings = $3 WHERE tournament_id = $4 AND user_id = $5',
          [r.kills || 0, r.rank || null, r.winnings || 0, tournamentId, r.user_id]
        );
        
        // If there are winnings, update user balance and record transaction
        if (r.winnings > 0) {
          await client.query('UPDATE users SET winning_balance = winning_balance + $1 WHERE id = $2', [r.winnings, r.user_id]);
          await client.query(
            'INSERT INTO wallet_transactions (user_id, type, amount, description) VALUES ($1, $2, $3, $4)',
            [r.user_id, 'prize', r.winnings, `Prize for tournament: ${tournamentId}`]
          );
          await client.query(
            'INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)',
            [r.user_id, 'Tournament Result', `Congratulations! You won ৳${r.winnings} in tournament #${tournamentId}. Rank: ${r.rank}, Kills: ${r.kills}`, 'success']
          );
        } else {
          await client.query(
            'INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)',
            [r.user_id, 'Tournament Result', `Tournament #${tournamentId} results are out. Rank: ${r.rank || 'N/A'}, Kills: ${r.kills || 0}`, 'info']
          );
        }
      }
      // Mark tournament as completed
      await client.query("UPDATE tournaments SET status = 'completed' WHERE id = $1", [tournamentId]);
      
      await client.query('COMMIT');
      res.json({ message: 'Results updated and balances credited successfully' });
    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error('Results update error:', err);
      res.status(500).json({ error: err.message });
    } finally {
      client.release();
    }
  });

  app.get('/api/admin/payments', authenticate, isAdmin, async (req, res) => {
    const paymentsRes = await pool.query('SELECT p.*, u.name as user_name, u.email as user_email FROM payments p JOIN users u ON p.user_id = u.id ORDER BY p.created_at DESC');
    res.json(paymentsRes.rows);
  });

  app.post('/api/admin/payments/:id/verify', authenticate, isAdmin, async (req, res) => {
    const { status } = req.body; // approved, rejected
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const paymentRes = await client.query('SELECT * FROM payments WHERE id = $1', [req.params.id]);
      const payment = paymentRes.rows[0];
      
      if (!payment || payment.status !== 'pending') {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Invalid payment' });
      }

      await client.query('UPDATE payments SET status = $1 WHERE id = $2', [status, req.params.id]);
      
      if (status === 'approved') {
        await client.query('UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2', [payment.amount, payment.user_id]);
        await client.query(
          'INSERT INTO wallet_transactions (user_id, type, amount, description) VALUES ($1, $2, $3, $4)',
          [payment.user_id, 'deposit', payment.amount, 'Deposit approved']
        );
        await client.query(
          'INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)',
          [payment.user_id, 'Deposit Approved', `Your deposit of ৳${payment.amount} has been approved.`, 'success']
        );
      } else {
        await client.query(
          'INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)',
          [payment.user_id, 'Deposit Rejected', `Your deposit request of ৳${payment.amount} was rejected. Please contact support.`, 'error']
        );
      }
      
      await client.query('COMMIT');
      res.json({ message: `Payment ${status}` });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  });

  app.get('/api/admin/withdraws', authenticate, isAdmin, async (req, res) => {
    const withdrawsRes = await pool.query('SELECT w.*, u.name as user_name FROM withdraw_requests w JOIN users u ON w.user_id = u.id ORDER BY w.created_at DESC');
    res.json(withdrawsRes.rows);
  });

  app.get('/api/admin/users', authenticate, isAdmin, async (req, res) => {
    const usersRes = await pool.query('SELECT id, name, email, phone, uid, ign, role, wallet_balance, bonus_balance, winning_balance, status, profile_photo_url, is_verified, raw_password, created_at FROM users ORDER BY created_at DESC');
    res.json(usersRes.rows);
  });

  // --- Notification Routes ---
  app.get('/api/notifications', authenticate, async (req: any, res) => {
    const notificationsRes = await pool.query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [req.user.id]);
    res.json(notificationsRes.rows);
  });

  app.post('/api/notifications/read-all', authenticate, async (req: any, res) => {
    await pool.query('UPDATE notifications SET is_read = 1 WHERE user_id = $1', [req.user.id]);
    res.json({ message: 'All notifications marked as read' });
  });

  app.delete('/api/notifications/:id', authenticate, async (req: any, res) => {
    await pool.query('DELETE FROM notifications WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ message: 'Notification deleted' });
  });

  app.put('/api/admin/users/:id/photo', authenticate, isAdmin, upload.single('photo'), async (req: any, res) => {
    if (!req.file) return res.status(400).json({ error: 'No photo uploaded' });
    const photoUrl = `/uploads/${req.file.filename}`;
    await pool.query('UPDATE users SET profile_photo_url = $1 WHERE id = $2', [photoUrl, req.params.id]);
    res.json({ message: 'Profile photo updated', photoUrl });
  });

  app.post('/api/admin/users', authenticate, isAdmin, async (req, res) => {
    const { name, email, phone, password, uid, ign, role } = req.body;
    try {
      const existingEmail = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existingEmail.rows.length > 0) return res.status(400).json({ error: 'Email already in use' });
      
      const existingPhone = await pool.query('SELECT id FROM users WHERE phone = $1', [phone]);
      if (existingPhone.rows.length > 0) return res.status(400).json({ error: 'Phone number already in use' });

      if (uid) {
        const existingUid = await pool.query('SELECT id FROM users WHERE uid = $1', [uid]);
        if (existingUid.rows.length > 0) return res.status(400).json({ error: 'UID already in use' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const myReferralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const result = await pool.query(
        'INSERT INTO users (name, email, phone, password, raw_password, referral_code, uid, ign, role) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id',
        [name, email, phone, hashedPassword, password, myReferralCode, uid || null, ign || null, role || 'user']
      );
      
      res.json({ message: 'User created successfully', id: result.rows[0].id });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put('/api/admin/users/:id', authenticate, isAdmin, async (req, res) => {
    const { name, email, phone, uid, ign, role, wallet_balance, bonus_balance, winning_balance, status, referral_code, is_verified } = req.body;
    try {
      await pool.query(`
        UPDATE users SET 
          name = $1, email = $2, phone = $3, uid = $4, ign = $5, 
          role = $6, wallet_balance = $7, bonus_balance = $8, 
          winning_balance = $9, status = $10, referral_code = $11,
          is_verified = $12
        WHERE id = $13
      `, [name, email, phone, uid, ign, role, wallet_balance, bonus_balance, winning_balance, status, referral_code, is_verified ? 1 : 0, req.params.id]);
      res.json({ message: 'User updated successfully' });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/admin/withdraws/:id/verify', authenticate, isAdmin, async (req, res) => {
    const { status } = req.body;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const withdrawRes = await client.query('SELECT * FROM withdraw_requests WHERE id = $1', [req.params.id]);
      const withdraw = withdrawRes.rows[0];
      
      if (!withdraw || withdraw.status !== 'pending') {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Invalid withdraw request' });
      }

      await client.query('UPDATE withdraw_requests SET status = $1 WHERE id = $2', [status, req.params.id]);
      
      if (status === 'rejected') {
        await client.query('UPDATE users SET winning_balance = winning_balance + $1 WHERE id = $2', [withdraw.amount, withdraw.user_id]);
        await client.query(
          'INSERT INTO wallet_transactions (user_id, type, amount, description) VALUES ($1, $2, $3, $4)',
          [withdraw.user_id, 'refund', withdraw.amount, 'Withdrawal rejected - Refunded']
        );
        await client.query(
          'INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)',
          [withdraw.user_id, 'Withdrawal Rejected', `Your withdrawal request of ৳${withdraw.amount} was rejected and refunded to your winning balance.`, 'error']
        );
      } else if (status === 'approved') {
        await client.query(
          'INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)',
          [withdraw.user_id, 'Withdrawal Processed', `Your withdrawal request of ৳${withdraw.amount} has been processed successfully.`, 'success']
        );
      }
      
      await client.query('COMMIT');
      res.json({ message: `Withdraw ${status}` });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  });

  // --- Settings Routes ---
  app.get('/api/settings/firebase', async (req, res) => {
    try {
      const settingRes = await pool.query('SELECT value FROM settings WHERE key = $1', ['firebase_config']);
      const setting = settingRes.rows[0];
      res.json(setting ? JSON.parse(setting.value) : null);
    } catch (err: any) {
      console.error('Error fetching firebase settings:', err);
      // Return null or default config instead of crashing or falling through
      res.json(null);
    }
  });

  app.post('/api/admin/settings/firebase', authenticate, isAdmin, async (req, res) => {
    const { config } = req.body;
    try {
      await pool.query(
        'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
        ['firebase_config', JSON.stringify(config)]
      );
      res.json({ message: 'Firebase configuration saved' });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Vite middleware for development
  const distExists = fs.existsSync(path.join(__dirname, 'dist'));
  console.log(`Dist exists: ${distExists}, NODE_ENV: ${process.env.NODE_ENV}`);

  if ((process.env.NODE_ENV !== 'production' || !distExists) && !process.env.VERCEL) {
    console.log('Initializing Vite middleware...');
    // Vite initialization remains async but we don't await it here
    (async () => {
      try {
        const vite = await createViteServer({
          server: { middlewareMode: true },
          appType: 'spa',
        });
        app.use(vite.middlewares);
        console.log('Vite middleware initialized.');
      } catch (e) {
        console.error('Failed to initialize Vite middleware:', e);
      }
    })();
  } else {
    console.log('Serving static files from dist...');
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
    });
  }

  return app;
}

async function startInitialization() {
  const timeout = (ms: number) => new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms));
  
  try {
    console.log('Starting background DB initialization...');
    await Promise.race([initDb(), timeout(10000)]);
    console.log('Database initialized.');
    
    await Promise.race([runMigrations(), timeout(10000)]);
    console.log('Migrations run.');
    
    await Promise.race([seedAdmin(), timeout(10000)]);
    console.log('Admin seeded.');
    
    await Promise.race([seedSettings(), timeout(10000)]);
    console.log('Settings seeded.');
    
    await Promise.race([seedTournaments(), timeout(10000)]);
    console.log('Tournaments seeded.');
    
    isDbReady = true;
    console.log('✅ Database fully ready!');
  } catch (err) {
    console.error('❌ Critical: Database initialization failed:', err);
  }
}

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

const app = express();
setupRoutes(app);
startInitialization();

export default app;
