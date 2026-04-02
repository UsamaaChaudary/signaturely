require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

// Middleware
app.use(cors({
  // origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  origin: '*',
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploads
const uploadsDir = path.join(__dirname, '../uploads');
fs.mkdirSync(path.join(uploadsDir, 'originals'), { recursive: true });
fs.mkdirSync(path.join(uploadsDir, 'completed'), { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/requests', require('./routes/requests'));
app.use('/api/signing', require('./routes/signing'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Connect to MongoDB and start server
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => {
      console.log(`Backend running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

module.exports = app;
