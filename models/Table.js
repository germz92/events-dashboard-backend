const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  label: String,
  checked: Boolean
}, { _id: false });

const gearCategorySchema = new mongoose.Schema({
  Cameras: [itemSchema],
  Lenses: [itemSchema],
  Lighting: [itemSchema],
  Support: [itemSchema],
  Accessories: [itemSchema]
}, { _id: false });

// ✅ Define a schema for individual program entries
const programSchema = new mongoose.Schema({
  date: String,
  name: String,
  startTime: String,
  endTime: String,
  location: String,
  photographer: String,
  notes: String,
  done: { type: Boolean, default: false }
}, { _id: false });

const tableSchema = new mongoose.Schema({
  title: String,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  rows: [
    {
      date: String,
      role: String,
      name: String,
      startTime: String,
      endTime: String,
      totalHours: Number,
      notes: String
    }
  ],
  general: {
    location: String,
    weather: String,
    start: String,
    end: String,
    client: String,
    attendees: Number,
    budget: String,
    contacts: [
      {
        name: String,
        number: String,
        email: String,
        role: String
      }
    ],
    locations: [
      {
        name: String,
        address: String,
        event: String
      }
    ]
  },
  gear: {
    lists: {
      type: Map,
      of: gearCategorySchema,
      default: {}
    }
  },
  travel: [
    {
      date: String,
      time: String,
      airline: String,
      name: String,
      ref: String
    }
  ],
  accommodation: [
    {
      date: String,
      time: String,
      hotel: String,
      name: String,
      ref: String
    }
  ],
  cardLog: [
    {
      date: String,
      entries: [
        {
          camera: String,
          card1: String,
          card2: String,
          user: String
        }
      ]
    }
  ],
  // ✅ Properly typed programSchedule with "done"
  programSchedule: {
    type: [programSchema],
    default: []
  }
}, { timestamps: true });

module.exports = mongoose.model('Table', tableSchema);
