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

// ✅ NEW: Separate crew row schema with ObjectId _id
const crewRowSchema = new mongoose.Schema({
  date: String,
  role: String,
  name: String,
  startTime: String,
  endTime: String,
  totalHours: Number,
  notes: String
}, { _id: true }); // ✅ Adds _id to each row for bulletproof tracking

const tableSchema = new mongoose.Schema({
  title: String,
  owners: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  
  // ✅ Updated to use schema with _id
  rows: [crewRowSchema],
  
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
      checkin: String,
      checkout: String,
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
  programSchedule: {
    type: [programSchema],
    default: []
  }
}, { timestamps: true });

module.exports = mongoose.model('Table', tableSchema);
