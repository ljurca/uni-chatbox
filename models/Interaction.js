// models/Interaction.js
const mongoose = require('mongoose');

const InteractionSchema = new mongoose.Schema({
	participantID: String,
    userInput: String,
    botResponse: String,
	timestamp: { type: Date, default: Date.now }
});

const Interaction = mongoose.models.Interaction || mongoose.model('Interaction', InteractionSchema);
module.exports = Interaction;

module.exports = mongoose.model('Interaction', InteractionSchema);