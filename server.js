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

// AUTH
app.post('/api/auth/register', async (req, res) => {
  const { email, password, fullName } = req.body; // 🔥 updated

  const hashed = await bcrypt.hash(password, 10);
  const user = new User({ email, password: hashed, fullName }); // 🔥 updated

  await user.save();
  res.json({ message: 'User created' });
});


app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
  res.json({ token, fullName: user.fullName });
});

// TABLE ROUTES
app.post('/api/tables', authenticate, async (req, res) => {
  const { title, general } = req.body;

  const table = new Table({
    title,
    owner: req.user.id,
    rows: [],
    sharedWith: [],
    general: {
      client: general?.client || '',
      start: general?.start || '',
      end: general?.end || ''
    }
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

app.put('/api/tables/:id', authenticate, async (req, res) => {
  const table = await Table.findById(req.params.id);
  if (!table || !table.owner.equals(req.user.id)) {
    return res.status(403).json({ error: 'Not authorized or not found' });
  }
  table.rows = req.body.rows;
  await table.save();
  res.json({ message: 'Table updated' });
});

// NEW ✨ Save card log per event
app.put('/api/tables/:id/cardlog', authenticate, async (req, res) => {
  const table = await Table.findById(req.params.id);
  
  if (!table || (!table.owner.equals(req.user.id) && !table.sharedWith.includes(req.user.id))) {
    return res.status(403).json({ error: 'Not authorized or not found' });
  }

  table.cardLog = req.body.cardLog; // <-- updating cardLog inside table
  await table.save();

  res.json({ message: 'Card log saved' });
});

// SHARING
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

// GENERAL INFO
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

// GEAR
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
  
  table.gear = req.body.gear;
  
  await table.save();
  res.json({ message: 'Gear saved' });
});


// TRAVEL / ACCOMMODATION
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

// DELETE
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

// USERS
app.get('/api/users', authenticate, async (req, res) => {
  try {
    const users = await User.find({}, 'fullName email').sort({ fullName: 1 }); // 🔥 Corrected
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// PROGRAM SCHEDULE
app.get('/api/tables/:id/program-schedule', authenticate, async (req, res) => {
  const table = await Table.findById(req.params.id);
  if (!table || (!table.owner.equals(req.user.id) && !table.sharedWith.includes(req.user.id))) {
    return res.status(403).json({ error: 'Not authorized or not found' });
  }
  res.json({ programSchedule: table.programSchedule || [] });
});

app.put('/api/tables/:id/program-schedule', authenticate, async (req, res) => {
  const table = await Table.findById(req.params.id);
  if (!table || (!table.owner.equals(req.user.id) && !table.sharedWith.includes(req.user.id))) {
    return res.status(403).json({ error: 'Not authorized or not found' });
  }
  table.programSchedule = req.body.programSchedule || [];
  await table.save();
  res.json({ message: 'Program schedule updated' });
});

// SERVER
app.listen(3000, () => console.log('Server started on port 3000'));
