const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const path = require('path');
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

  const token = jwt.sign({ id: user._id, fullName: user.fullName }, process.env.JWT_SECRET)  ;
  res.json({ token, fullName: user.fullName });
});

// TABLE ROUTES
app.post('/api/tables', authenticate, async (req, res) => {
  const { title, general } = req.body;

  const table = new Table({
    title,
    owners: [req.user.id],  // ✅ Corrected here
    sharedWith: [],
    rows: [],
    general: {
      client: general?.client || '',
      start: general?.start || '',
      end: general?.end || ''
    },
    gear: {
      lists: {
        Default: {
          Cameras: [],
          Lenses: [],
          Lighting: [],
          Support: [],
          Accessories: []
        }
      }
    }
  });

  await table.save();
  res.json(table);
});


app.get('/api/tables', authenticate, async (req, res) => {
  const tables = await Table.find({
    $or: [
      { owners: req.user.id }, // ✅ use correct field name
      { sharedWith: req.user.id }
    ]
  });
  res.json(tables);
});


app.get('/api/tables/:id', authenticate, async (req, res) => {
  const table = await Table.findById(req.params.id);
  if (!table || (!table.owners.includes(req.user.id) && !table.sharedWith.includes(req.user.id))) {
    return res.status(403).json({ error: 'Not authorized or not found' });
  }
  res.json(table);
});

app.post('/api/tables/:id/rows', authenticate, async (req, res) => {
  const table = await Table.findById(req.params.id);
  if (!table || (!table.owners.includes(req.user.id) && !table.sharedWith.includes(req.user.id))) {
    return res.status(403).json({ error: 'Not authorized or not found' });
  }
  table.rows.push(req.body);
  await table.save();
  res.json(table);
});

app.put('/api/tables/:id', authenticate, async (req, res) => {
  const table = await Table.findById(req.params.id);
  if (!table || !table.owners.includes(req.user.id)) {
    return res.status(403).json({ error: 'Not authorized or not found' });
  }
  table.rows = req.body.rows;
  await table.save();
  res.json({ message: 'Table updated' });
});

// NEW ✨ Save card log per event
app.put('/api/tables/:id/cardlog', authenticate, async (req, res) => {
  const table = await Table.findById(req.params.id);
  
  if (!table || (!table.owners.includes(req.user.id) && !table.sharedWith.includes(req.user.id))) {
    return res.status(403).json({ error: 'Not authorized or not found' });
  }

  table.cardLog = req.body.cardLog; // <-- updating cardLog inside table
  await table.save();

  res.json({ message: 'Card log saved' });
});

// GENERAL INFO
app.get('/api/tables/:id/general', authenticate, async (req, res) => {
  const table = await Table.findById(req.params.id);
  if (!table || (!table.owners.includes(req.user.id) && !table.sharedWith.includes(req.user.id))) {
    return res.status(403).json({ error: 'Not authorized or not found' });
  }
  res.json(table.general || {});
});

app.put('/api/tables/:id/general', authenticate, async (req, res) => {
  const table = await Table.findById(req.params.id);
  if (!table || (!table.owners.includes(req.user.id) && !table.sharedWith.includes(req.user.id))) {
    return res.status(403).json({ error: 'Not authorized or not found' });
  }

  table.general = {
    ...table.general,  // keep existing data
    ...req.body         // overwrite with new data
  };

  await table.save();
  res.json({ message: 'General info updated' });
});


//GEAR
// ✅ GET gear checklist(s)
app.get('/api/tables/:id/gear', authenticate, async (req, res) => {
  const table = await Table.findById(req.params.id);
  if (!table || (!table.owners.includes(req.user.id) && !table.sharedWith.includes(req.user.id))) {
    return res.status(403).json({ error: 'Not authorized or not found' });
  }

  const lists = table.gear?.lists ? Object.fromEntries(table.gear.lists) : {};
  res.json({ lists });
});

// ✅ PUT (save) gear checklist(s)
app.put('/api/tables/:id/gear', authenticate, async (req, res) => {
  try {
    const table = await Table.findById(req.params.id);
    if (!table || (!table.owners.includes(req.user.id) && !table.sharedWith.includes(req.user.id))) {
      return res.status(403).json({ error: 'Not authorized or not found' });
    }

    const { lists } = req.body;

    if (!lists || typeof lists !== 'object') {
      return res.status(400).json({ error: 'Invalid format for gear lists' });
    }

    // ✅ Ensure gear object exists
    if (!table.gear) {
      table.gear = { lists: {} };
    }

    table.gear.lists = lists;
    await table.save();

    res.json({ message: 'Gear checklists saved' });
  } catch (err) {
    console.error('Gear save error:', err);
    res.status(500).json({ error: 'Server error while saving gear' });
  }
});



// TRAVEL / ACCOMMODATION
app.get('/api/tables/:id/travel', authenticate, async (req, res) => {
  const table = await Table.findById(req.params.id);
  if (!table || (!table.owners.includes(req.user.id) && !table.sharedWith.includes(req.user.id))) {
    return res.status(403).json({ error: 'Not authorized or not found' });
  }
  res.json({
    travel: table.travel || [],
    accommodation: table.accommodation || []
  });
});

app.put('/api/tables/:id/travel', authenticate, async (req, res) => {
  const table = await Table.findById(req.params.id);
  if (!table || (!table.owners.includes(req.user.id) && !table.sharedWith.includes(req.user.id))) {
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
  if (!table || !table.owners.includes(req.user.id)) {
    return res.status(403).json({ error: 'Not authorized or not found' });
  }
  await table.deleteOne();
  res.json({ message: 'Table deleted' });
});

app.delete('/api/tables/:id/rows/:index', authenticate, async (req, res) => {
  const table = await Table.findById(req.params.id);
  if (!table || (!table.owners.includes(req.user.id) && !table.sharedWith.includes(req.user.id))) {
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
  if (!table || (!table.owners.includes(req.user.id) && !table.sharedWith.includes(req.user.id))) {
    return res.status(403).json({ error: 'Not authorized or not found' });
  }
  res.json({ programSchedule: table.programSchedule || [] });
});

app.put('/api/tables/:id/program-schedule', authenticate, async (req, res) => {
  const table = await Table.findById(req.params.id);
  if (!table || (!table.owners.includes(req.user.id) && !table.sharedWith.includes(req.user.id))) {
    return res.status(403).json({ error: 'Not authorized or not found' });
  }
  table.programSchedule = req.body.programSchedule || [];
  await table.save();
  res.json({ message: 'Program schedule updated' });
});

// Serve static files
app.use(express.static(path.join(__dirname, 'frontend')));

// Explicit routes for all HTML pages
app.get('/bottom-nav.html', (req, res) => res.sendFile(path.join(__dirname, 'frontend', 'bottom-nav.html')));
app.get('/card-log.html', (req, res) => res.sendFile(path.join(__dirname, 'frontend', 'card-log.html')));
app.get('/crew.html', (req, res) => res.sendFile(path.join(__dirname, 'frontend', 'crew.html')));
app.get('/event.html', (req, res) => res.sendFile(path.join(__dirname, 'frontend', 'event.html')));
app.get('/events.html', (req, res) => res.sendFile(path.join(__dirname, 'frontend', 'events.html')));
app.get('/gear.html', (req, res) => res.sendFile(path.join(__dirname, 'frontend', 'gear.html')));
app.get('/general.html', (req, res) => res.sendFile(path.join(__dirname, 'frontend', 'general.html')));
app.get('/index.html', (req, res) => res.sendFile(path.join(__dirname, 'frontend', 'index.html')));
app.get('/register.html', (req, res) => res.sendFile(path.join(__dirname, 'frontend', 'register.html')));
app.get('/schedule.html', (req, res) => res.sendFile(path.join(__dirname, 'frontend', 'schedule.html')));
app.get('/travel-accommodation.html', (req, res) => res.sendFile(path.join(__dirname, 'frontend', 'travel-accommodation.html')));

// VERIFY TOKEN
app.get('/api/verify-token', authenticate, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// Catch-all fallback for bad frontend routes (MUST come last)
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});


// MAKE OWNER
app.post('/api/tables/:id/share', authenticate, async (req, res) => {
  const { email, makeOwner } = req.body;
  const tableId = req.params.id;

  try {
    const userToShare = await User.findOne({ email: email.toLowerCase().trim() });
    if (!userToShare) return res.status(404).json({ error: 'User not found' });

    const table = await Table.findById(tableId);
    if (!table) return res.status(404).json({ error: 'Table not found' });

    const ownerIds = table.owners.map(id => id.toString());
    const targetId = userToShare._id.toString();

    if (!ownerIds.includes(req.user.id)) {
      return res.status(403).json({ error: 'Only an owner can share this table' });
    }

    if (makeOwner) {
      if (!ownerIds.includes(targetId)) {
        table.owners.push(userToShare._id);
      }
    } else {
      if (!table.sharedWith.map(id => id.toString()).includes(targetId)) {
        table.sharedWith.push(userToShare._id);
      }
    }

    await table.save();
    res.json({ message: makeOwner ? 'Ownership granted' : 'User added to table' });
  } catch (err) {
    console.error('Error sharing table:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/tables/:id/rows-by-id/:rowId', authenticate, async (req, res) => {
  const table = await Table.findById(req.params.id);
  if (!table || (!table.owners.includes(req.user.id) && !table.sharedWith.includes(req.user.id))) {
    return res.status(403).json({ error: 'Not authorized or not found' });
  }

  const rowId = req.params.rowId;
  const originalLength = table.rows.length;

  table.rows = table.rows.filter(row => row._id?.toString() !== rowId);

  if (table.rows.length === originalLength) {
    return res.status(404).json({ error: 'Row not found' });
  }

  await table.save();
  res.json({ message: 'Row deleted' });
});

app.put('/api/tables/:id/reorder-rows', authenticate, async (req, res) => {
  const table = await Table.findById(req.params.id);
  if (!table || !table.owners.includes(req.user.id)) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  // Replace with reordered list
  table.rows = req.body.rows;
  await table.save();
  res.json({ message: 'Row order saved' });
});

app.put('/api/tables/:id/rows/:rowId', authenticate, async (req, res) => {
  const { id, rowId } = req.params;
  const updatedRow = req.body;

  const table = await Table.findById(id);
  if (!table) return res.status(404).json({ error: 'Table not found' });

  const rowIndex = table.rows.findIndex(row => row._id.toString() === rowId);
  if (rowIndex === -1) {
    return res.status(400).json({ error: 'Invalid row index' });
  }

  table.rows[rowIndex] = { ...table.rows[rowIndex]._doc, ...updatedRow };
  await table.save();

  res.json({ success: true });
});

// SERVER
app.listen(3000, () => console.log('Server started on port 3000'));
