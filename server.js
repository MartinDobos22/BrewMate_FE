import app from './server/app.js';

// Use Render-provided PORT when available; fall back to local dev port.
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`OCR server beží na porte ${PORT}`);
});
