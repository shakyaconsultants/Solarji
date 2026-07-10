require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const connectDB = require('./config/db');

connectDB();

const app = express();
app.set('etag', false);
app.use(compression());

const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map(o => o.trim())
  : [];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    // Always allow any localhost / 127.0.0.1 origin in development
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    // Allow explicitly listed production origins
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  maxAge: 86400,
}));
app.use(express.json());
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/leads', require('./routes/leads'));
app.use('/api/stock', require('./routes/stock'));
app.use('/api/quotations', require('./routes/quotations'));
app.use('/api/complaints', require('./routes/complaints'));
app.use('/api/dashboard', require('./routes/dashboard'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', app: 'SolarJi API' }));

const { sendError } = require('./utils/sendError');

app.use((err, req, res, next) => {
  sendError(res, err, 'Server error. Please try again.');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`SolarJi API running on port ${PORT}`));
