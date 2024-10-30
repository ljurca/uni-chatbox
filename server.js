// 1. Import Express and other necessary modules
const express = require("express");
const path = require("path");
const bodyParser = require('body-parser');
const env_var = require('dotenv').config();
const { OpenAI } = require('openai');
const mongoose = require('mongoose');
const axios = require('axios'); // Import axios here


mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB successfully');
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });

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

// OpenAI initialization
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

// 4. Set up a POST route for handling user input
app.post("/chat", async (req, res) => {
  const { history = [], input: userInput, participantID } = req.body;

// Check for participantID 
   if (!participantID) {
 return res.status(400).send('Participant ID is required');
 }

 // 3. Log the interaction (user input and chatbot response)
 // Add participantID

  
  const messages = history.length === 0
    ? [{ role: 'system', content: 'You are a helpful assistant working for USFCA.' }, 
       { role: 'user', content: userInput }]
    : [{ role: 'system', content: 'You are a helpful assistant working for USFCA.' }, 
       ...history, { role: 'user', content: userInput }];

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
      max_tokens: 100,
    });

    const apiMessage = response.choices[0].message.content;

const interaction = new Interaction({ 
    userInput, 
    botResponse: apiMessage, // Correctly reference apiMessage
    participantID 
});
await interaction.save();

    console.log(`Response: ${apiMessage}`);
    res.json({ confirmation: apiMessage });
  } catch (error) {
    console.error('Error in OpenAI API call:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Add this route to handle Bing search requests
app.post("/bing-search", async (req, res) => {
    const { query } = req.body;

    try {
        const bingResponse = await axios.get('https://api.bing.microsoft.com/v7.0/search', {
            params: { q: query },
            headers: {
                'Ocp-Apim-Subscription-Key': process.env.BING_API_KEY
            }
        });

        const searchResults = bingResponse.data.webPages.value.slice(0, 3).map(result => ({
            name: result.name,
            snippet: result.snippet,
            url: result.url
        }));

        res.json({ results: searchResults });
    } catch (error) {
        console.error('Error in Bing API call:', error);
        res.status(500).send('Internal Server Error');
    }
});


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

// 5. Listen on the port specified by Render
const PORT = process.env.PORT || 3000; // Fallback to 3000 if PORT is not set
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
