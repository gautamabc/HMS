require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const app     = express();

app.use(cors());
app.use(express.json());

// Serve the frontend folder as static files
app.use(express.static(path.join(__dirname, '../frontend')));

// ── ALL API ROUTES ──────────────────────────────────
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/patients',     require('./routes/patients'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/admissions',   require('./routes/admissions'));
app.use('/api/lab',          require('./routes/lab'));
app.use('/api/prescriptions',require('./routes/prescriptions'));
app.use('/api/billing',      require('./routes/billing'));
app.use('/api/staff',        require('./routes/staff'));
app.use('/api/beds',         require('./routes/beds'));
app.use('/api/notes',        require('./routes/notes'));
app.use('/api/audit',        require('./routes/audit'));
app.use('/api/charges',      require('./routes/charges'));

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

// Everything else → serve frontend
app.get('*', (_, res) =>
  res.sendFile(path.join(__dirname, '../frontend/index.html'))
);

// Error handler
app.use((err, req, res, _next) => {
  console.error(err.message);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('\n======================================');
  console.log(' 🏥  MediCore HMS is RUNNING!');
  console.log(` 🌐  Open: http://localhost:${PORT}`);
  console.log('======================================\n');
});
