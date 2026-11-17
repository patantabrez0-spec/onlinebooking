const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const bcrypt = require('bcryptjs');
const express = require('express');
const helmet = require('helmet');
const connectDatabase = require('./config/db');
const User = require('./models/User');
const authRoutes = require('./routes/authRoutes');
const roomRoutes = require('./routes/roomRoutes');
const bookingRoutes = require('./routes/bookingRoutes');

const app = express();
const frontendPath = path.resolve(__dirname, '..', 'frontend');

app.disable('x-powered-by');
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", 'https://fonts.googleapis.com']
    }
  }
}));
app.use(express.json({ limit: '20kb' }));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/bookings', bookingRoutes);

app.use(express.static(frontendPath));
app.get('*path', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ message: 'API route not found.' });
  }
  return res.sendFile(path.join(frontendPath, 'index.html'), (error) => {
    if (error) next(error);
  });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  console.error(error);
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Request body must be valid JSON.' });
  }
  if (error.name === 'ValidationError') {
    return res.status(400).json({ message: 'The submitted data is invalid.' });
  }
  if (error.code === 11000) {
    return res.status(409).json({ message: 'A record with that value already exists.' });
  }
  return res.status(500).json({ message: 'An unexpected server error occurred.' });
});

async function createConfiguredAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email && !password) return;
  if (!email || !password || password.length < 12) {
    throw new Error('Set both ADMIN_EMAIL and an ADMIN_PASSWORD of at least 12 characters, or leave both blank.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('ADMIN_EMAIL must be a valid email address.');
  }
  if (await User.exists({ email })) return;

  const hashedPassword = await bcrypt.hash(password, 12);
  await User.create({ name: 'RoomEase Admin', email, password: hashedPassword, role: 'admin' });
  console.log(`Created administrator account for ${email}`);
}

async function start() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('Set JWT_SECRET to a private value of at least 32 characters in backend/.env.');
  }
  await connectDatabase();
  await createConfiguredAdmin();
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => console.log(`RoomEase is running at http://localhost:${port}`));
}

if (require.main === module) {
  start().catch((error) => {
    console.error(`Unable to start RoomEase: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = app;