// 1. Import Express and other necessary modules
const express = require("express");
const bodyParser = require('body-parser');
const env_var = require('dotenv').config();
const { OpenAI } = require('openai');
const mongoose = require('mongoose');
const axios = require('axios'); // Import axios here
const fs = require('fs');
const path = require('path');

// OpenAI initialization
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ChunkEmbedding = require('./models/ChunkEmbedding');  // Import the ChunkEmbedding model


// In-memory store for chunk embeddings
let chunkEmbeddingsStore = [];  // This will hold the chunk embeddings for testing purposes

// define the test file path
const filePath = path.join(__dirname, 'data', 'test_file.txt');


// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));
  

// Import models
const Interaction = require('./models/Interaction');
const EventLog = require('./models/EventLog');

// 2. Initialize an Express app
const app = express();

app.use(express.json());

// 3. Create a route to serve the HTML file
app.use(express.static(path.join(__dirname, "public"))); // Serve static files from the "public" folder

// Middleware to parse JSON data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));



// Route to serve the homepage
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Define a POST route for retrieving chat history by participantID
// POST route to fetch conversation history by participantID
app.post('/history', async (req, res) => {
 const { participantID } = req.body; // Get participant ID
 if (!participantID) {
 return res.status(400).send('Participant ID is required');
 }
 try {
 // Fetch all interactions from the database for the given participantID
 const interactions = await Interaction.find({ participantID }).sort({ 
timestamp: 1 });
 // Send the conversation history back to the client
 res.json({ interactions });
 } catch (error) {
 console.error('Error fetching conversation history:', error.message);
 res.status(500).send('Server Error');
 }
});


app.post("/chat", async (req, res) => {
  // Extract user input and participant ID from the request body
  const { input: userInput, participantID } = req.body;

  // Check if participant ID exists in the request body
  if (!participantID) {
    // If no participant ID, return an error response
    return res.status(400).send('Participant ID is required');
  }

  
    const maxTokens = 4096; // Maximum token limit for GPT-4 (adjust if necessary)
    

  try {
    // Call OpenAI's chat API to generate a response based on the user input
    const response = await openai.chat.completions.create({
      model: "gpt-4", // Use the GPT-4 model with the largest token limit
      messages: [{ role: 'user', content: userInput }], // Correct format: pass prompt as content in a message object
    });
    
    // Extract the content of the bot's response from the API's response
    const apiMessage = response.choices[0].message.content;
    
    // 3. Save the interaction to the database (user input, bot response, participant ID, and embedding)
    const interaction = new Interaction({ 
      userInput, 
      botResponse: apiMessage, // Correctly reference apiMessage
      participantID 
    });

    // Save the interaction to the MongoDB database
    await interaction.save();
    console.log('User input: ' + userInput);
    console.log(`Response: ${apiMessage}`);

    // Send the response only once after processing is complete
    res.json({ confirmation: apiMessage });
  } catch (error) {
    console.error('Error in OpenAI API call:', error);
    res.status(500).send('Internal Server Error');
  }
});



// 3. Create a helper function to generate an embedding for a given text
async function generateEmbedding(text) {
  try {
    // Call OpenAI's embeddings API to generate the vector for the input text
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-ada-002',  // The model used for generating embeddings
      input: text,  // The text for which we want the embedding
    });

    // Extract the embedding vector from the response
    const embedding = embeddingResponse.data[0].embedding;

    // Return the generated embedding (vector representation of the input text)
    return embedding;
  } catch (error) {
    // If an error occurs during the embedding generation, log it and throw an error
    console.error('Error generating embedding:', error);
    throw new Error('Failed to generate embedding');
  }
}


// Log event route
app.post('/log-event', async (req, res) => {
    const { eventType, elementName, timestamp, participantID, message } = req.body;

	 // Check for participantID
	 if (!participantID) {
	 return res.status(400).send('Participant ID is required');
	 }


    try {
        const event = new EventLog({ eventType, elementName, timestamp, message, participantID });
        await event.save();
        res.status(200).send('Event logged successfully');
    } catch (error) {
        console.error('Error logging event:', error.message);
        res.status(500).send('Server Error');
    }
});

// 5. Listen on a port (3000)
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
