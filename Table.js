const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema({
  title: String,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  rows: [
    {
      date: Date,
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
    attendees: Number,
    budget: String,
    contacts: [
      {
        name: String,
        number: String,
        email: String,
        role: String
      }
    ]
  },
  gear: {
    type: Map,
    of: [
      {
        label: String,
        checked: Boolean
      }
    ],
    default: {}
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
  
  
}, { timestamps: true });

module.exports = mongoose.model('Table', tableSchema);
