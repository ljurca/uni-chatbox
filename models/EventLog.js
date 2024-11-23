const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const EventLogSchema = new mongoose.Schema({
	participantID: String,
    userInput: String,
    botResponse: String,
	timestamp: { type: Date, default: Date.now }
});

const EventLog = mongoose.models.EventLog || mongoose.model('EventLog', EventLogSchema);
module.exports = EventLog;