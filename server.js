const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const User = require('./models/User');
const Table = require('./models/Table');

mongoose.connect(process.env.MONGO_URI);

function authenticate(req, res, next) {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ error: 'No token' });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

app.post('/api/auth/register', async (req, res) => {
  const { email, password, username } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  const user = new User({ email, password: hashed, username });
  await user.save();
  res.json({ message: 'User created' });
});

app.post('/api/tables', authenticate, async (req, res) => {
  const table = new Table({
    title: req.body.title,
    owner: req.user.id,
    general: req.body.general || {}, // ✅ Add this line
    rows: [],
    sharedWith: []
  });
  await table.save();
  res.json(table);
});


app.get('/api/tables', authenticate, async (req, res) => {
  const tables = await Table.find({
    $or: [
      { owner: req.user.id },
      { sharedWith: req.user.id }
    ]
  });
  res.json(tables);
});

app.get('/api/tables/:id', authenticate, async (req, res) => {
  const table = await Table.findById(req.params.id);
  if (!table || (!table.owner.equals(req.user.id) && !table.sharedWith.includes(req.user.id))) {
    return res.status(403).json({ error: 'Not authorized or not found' });
  }
  res.json(table);
});

app.post('/api/tables/:id/rows', authenticate, async (req, res) => {
  const table = await Table.findById(req.params.id);
  if (!table || (!table.owner.equals(req.user.id) && !table.sharedWith.includes(req.user.id))) {
    return res.status(403).json({ error: 'Not authorized or not found' });
  }
  table.rows.push(req.body);
  await table.save();
  res.json(table);
});

app.post('/api/tables/:id/share', authenticate, async (req, res) => {
  const userToShare = await User.findOne({ email: req.body.email });
  if (!userToShare) return res.status(404).json({ error: 'User not found' });

  const table = await Table.findById(req.params.id);
  if (!table || !table.owner.equals(req.user.id)) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  if (!table.sharedWith.includes(userToShare._id)) {
    table.sharedWith.push(userToShare._id);
    await table.save();
  }

  res.json({ message: 'Shared' });
});

app.get('/api/users', authenticate, async (req, res) => {
  const users = await User.find({}, 'username email');
  res.json(users);
});

app.get('/api/tables/:id/general', authenticate, async (req, res) => {
  const table = await Table.findById(req.params.id);
  if (!table || (!table.owner.equals(req.user.id) && !table.sharedWith.includes(req.user.id))) {
    return res.status(403).json({ error: 'Not authorized or not found' });
  }

  res.json(table.general || {});
});

app.put('/api/tables/:id/general', authenticate, async (req, res) => {
  const table = await Table.findById(req.params.id);
  if (!table || (!table.owner.equals(req.user.id) && !table.sharedWith.includes(req.user.id))) {
    return res.status(403).json({ error: 'Not authorized or not found' });
  }

  table.general = req.body;
  await table.save();
  res.json({ message: 'General info updated' });
});

app.put('/api/tables/:id', authenticate, async (req, res) => {
  const table = await Table.findById(req.params.id);
  if (!table || !table.owner.equals(req.user.id)) {
    return res.status(403).json({ error: 'Not authorized or not found' });
  }

  table.rows = req.body.rows;
  await table.save();
  res.json({ message: 'Table updated' });
});

app.get('/api/tables/:id/gear', authenticate, async (req, res) => {
  const table = await Table.findById(req.params.id);
  if (!table || (!table.owner.equals(req.user.id) && !table.sharedWith.includes(req.user.id))) {
    return res.status(403).json({ error: 'Not authorized or not found' });
  }

  res.json(table.gear || {});
});

app.put('/api/tables/:id/gear', authenticate, async (req, res) => {
  const table = await Table.findById(req.params.id);
  if (!table || (!table.owner.equals(req.user.id) && !table.sharedWith.includes(req.user.id))) {
    return res.status(403).json({ error: 'Not authorized or not found' });
  }

  table.gear = req.body;
  await table.save();
  res.json({ message: 'Gear saved' });
});

app.get('/api/tables/:id/travel', authenticate, async (req, res) => {
  const table = await Table.findById(req.params.id);
  if (!table || (!table.owner.equals(req.user.id) && !table.sharedWith.includes(req.user.id))) {
    return res.status(403).json({ error: 'Not authorized or not found' });
  }

  res.json({
    travel: table.travel || [],
    accommodation: table.accommodation || []
  });
});

app.put('/api/tables/:id/travel', authenticate, async (req, res) => {
  const table = await Table.findById(req.params.id);
  if (!table || (!table.owner.equals(req.user.id) && !table.sharedWith.includes(req.user.id))) {
    return res.status(403).json({ error: 'Not authorized or not found' });
  }

  table.travel = req.body.travel || [];
  table.accommodation = req.body.accommodation || [];
  await table.save();
  res.json({ message: 'Travel and accommodation saved' });
});

app.delete('/api/tables/:id', authenticate, async (req, res) => {
  const table = await Table.findById(req.params.id);
  if (!table || !table.owner.equals(req.user.id)) {
    return res.status(403).json({ error: 'Not authorized or not found' });
  }

  await table.deleteOne();
  res.json({ message: 'Table deleted' });
});

app.delete('/api/tables/:id/rows/:index', authenticate, async (req, res) => {
  const table = await Table.findById(req.params.id);
  if (!table || (!table.owner.equals(req.user.id) && !table.sharedWith.includes(req.user.id))) {
    return res.status(403).json({ error: 'Not authorized or not found' });
  }

  const idx = parseInt(req.params.index);
  if (isNaN(idx) || idx < 0 || idx >= table.rows.length) {
    return res.status(400).json({ error: 'Invalid row index' });
  }

  table.rows.splice(idx, 1);
  await table.save();
  res.json({ message: 'Row deleted' });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
  res.json({ token, username: user.username });
});

app.listen(3000, () => console.log('Server started on port 3000'));
