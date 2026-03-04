const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_, res) => res.json({ ok: true }));

app.post('/api/predict', (req, res) => {
  const s = req.body?.sensors || {};
  const temp = Number(s.temp);
  const hum = Number(s.hum);
  const gas = Number(s.gas);
  const soil = Number(s.soil);

  let score = 80;
  if (temp > 32 || temp < 16) score -= 15;
  if (hum > 80 || hum < 40) score -= 12;
  if (gas > 220) score -= 20;
  if (soil > 780 || soil < 330) score -= 15;

  score = Math.max(0, Math.min(100, score));
  const classLabel = score >= 70 ? 1 : 0;
  const confidence = 0.75;

  res.json({
    score,
    classLabel,
    confidence,
    contributions: [
      { name: 'Temp', points: 20, score: 0.8 },
      { name: 'Humidity', points: 15, score: 0.75 },
      { name: 'Gas', points: 30, score: 0.7 },
      { name: 'Soil', points: 25, score: 0.8 },
      { name: 'Distance', points: 10, score: 0.9 }
    ]
  });
});

app.post('/api/vision-predict', (req, res) => {
  const { greenRatio = 0.4, yellowRatio = 0.2, brownRatio = 0.1 } = req.body || {};
  let healthy = Math.max(0, 0.9 * greenRatio - 0.3 * yellowRatio - 0.5 * brownRatio);
  let chlorosis = Math.max(0, 0.8 * yellowRatio + 0.2 * (1 - greenRatio));
  let necrosis = Math.max(0, 0.9 * brownRatio + 0.1 * (1 - greenRatio));
  let fungal_risk = Math.max(0, 0.4 * brownRatio + 0.4 * yellowRatio);

  const sum = healthy + chlorosis + necrosis + fungal_risk || 1;
  res.json({
    probabilities: {
      healthy: healthy / sum,
      chlorosis: chlorosis / sum,
      necrosis: necrosis / sum,
      fungal_risk: fungal_risk / sum
    }
  });
});

app.post('/api/retrain', (req, res) => {
  const samples = req.body?.samples || [];
  const version = (1 + samples.length / 1000).toFixed(2);
  res.json({ version, bias: 0.5 });
});

app.post('/api/actuators', (req, res) => {
  console.log('Actuator command:', req.body);
  res.json({ ok: true, applied: req.body });
});

app.post('/api/alerts', (req, res) => {
  console.log('Alert:', req.body);
  res.json({ ok: true });
});

const dashboardDir = path.resolve(__dirname);
app.use(express.static(dashboardDir));

app.get('/', (_, res) => {
  res.sendFile(path.join(dashboardDir, 'index.html'));
});

app.listen(3000, () => console.log('Backend running on http://localhost:3000'));
