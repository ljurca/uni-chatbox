const mongoose = require('mongoose');

// Define the Participant schema
const participantSchema = new mongoose.Schema({
    participantID: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    demographicsLink: { type: String, required: true },
    preTaskLink: { type: String, required: true },
    postTaskLink: { type: String, required: true },
    email: { type: String, required: true },
	googleSheet: { type: String, required: false },
});

// Create a model based on the schema
const Participant = mongoose.model('Participant', participantSchema);

module.exports = Participant;