const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// ── Core Middleware ──────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',        require('./routes/authRoutes'));
app.use('/api/startups',    require('./routes/startupRoutes'));
app.use('/api/connections', require('./routes/connectionRoutes'));
app.use('/api/users',       require('./routes/userRoutes'));
app.use('/api/messages',    require('./routes/messageRoutes'));
app.use('/api/admin',       require('./routes/adminRoutes'));

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ success: true, message: 'Venture Connect API 🚀', version: '1.0.0' });
});

// ── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ── Global Error Handler ─────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n✅  Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`   http://localhost:${PORT}\n`);
});
