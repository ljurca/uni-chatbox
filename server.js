// 1. Import Express and other necessary modules
const express = require("express");
const bodyParser = require('body-parser');
const env_var = require('dotenv').config();
const { OpenAI } = require('openai');
const mongoose = require('mongoose');
const axios = require('axios'); // Import axios here
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// OpenAI initialization
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ChunkEmbedding = require('./models/ChunkEmbedding');  // Import the ChunkEmbedding model
const Participant = require('./models/Participant'); // Import the Participant model

// Function to read the CSV file with participants and insert records into MongoDB
function importCSVToDatabase() {
    const participants = [];
    
    // Read and parse the CSV file
    fs.createReadStream(path.join(__dirname, 'data', 'participants.csv'))
        .pipe(csv())
        .on('data', (row) => {
            participants.push(row);
        })
        .on('end', async () => {
            console.log('CSV file successfully processed');
            try {
                // Delete all existing participants and insert new ones
                await Participant.deleteMany({});
                await Participant.insertMany(participants);
                console.log('Participants added to the database');
            } catch (error) {
                console.error('Error inserting participants:', error);
            }
        });
}

// Call the function to import participants from CSV when the server starts
importCSVToDatabase();

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

app.get("/", (req, res) => {
    console.log("Root route accessed");
	res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Endpoint to fetch participant data by participantID
app.get("/get-participant-data", async (req, res) => {
  const participantID = req.query.participantID;

  if (!participantID) {
    return res.status(400).send('Participant ID is required');
  }

  try {
    // Fetch participant data from MongoDB
    const participant = await Participant.findOne({ participantID });

    if (!participant) {
      return res.status(404).send('Participant not found');
    }

    // Return participant data as JSON
    res.json(participant);
  } catch (error) {
    console.error('Error fetching participant data:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Route to update the Google Sheet link
app.post("/update-google-sheet", async (req, res) => {
  const { participantID, googleSheetLink } = req.body;

  if (!participantID || !googleSheetLink) {
    return res.status(400).json({ message: "Participant ID and Google Sheet link are required." });
  }

  try {
    // Find the participant by ID and update the googleSheet field
    const participant = await Participant.findOneAndUpdate(
      { participantID },
      { $set: { googleSheet: googleSheetLink } },
      { new: true }
    );

    if (!participant) {
      return res.status(404).json({ message: "Participant not found." });
    }

    res.status(200).json({ message: "Google Sheet link updated successfully.", participant });
  } catch (error) {
    console.error("Error updating Google Sheet link:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});


app.get("/chat", async (req, res) => {
    console.log("Chat route accessed GET");
    const participantID = req.query.participantID;  // Getting participantID from query params
    
    if (!participantID) {
        // If no participantID is provided, return a script to show a popup and redirect
        return res.send(`
            <script>
                alert('Participant ID is required');
                window.location.href = '/';  // Redirect to root
            </script>
        `);
    }

    try {
        // Fetch the participant details based on participantID (studyId)
        const participant = await Participant.findOne({ participantID });

        if (!participant) {
            console.log("No participant found with participantID:", participantID);
        }

        // Log participant details based on studyId (participantID)
        console.log("Participant Details:", participant);

    } catch (error) {
        console.error("Error fetching participant data:", error);
        return res.status(500).send('Internal Server Error');
    }

    console.log("Participant ID:", participantID);  // Log participant ID
    res.sendFile(path.join(__dirname, "public", "chat.html"));
});

app.get("/chat.html", async (req, res) => {
    console.log("Chat route accessed GET");
    const participantID = req.query.participantID;  // Getting participantID from query params
    
    if (!participantID) {
        // If no participantID is provided, return a script to show a popup and redirect
        return res.send(`
            <script>
                alert('Participant ID is required');
                window.location.href = '/';  // Redirect to root
            </script>
        `);
    }

    try {
        // Fetch the participant details based on participantID (studyId)
        const participant = await Participant.findOne({ participantID });

        if (!participant) {
            console.log("No participant found with participantID:", participantID);
        }

        // Log participant details based on studyId (participantID)
        console.log("Participant Details:", participant);

    } catch (error) {
        console.error("Error fetching participant data:", error);
        return res.status(500).send('Internal Server Error');
    }

    console.log("Participant ID:", participantID);  // Log participant ID
    res.sendFile(path.join(__dirname, "public", "chat.html"));
});


// study get route
app.get("/study", async (req, res) => {
    console.log("Study get route accessed");
    const participantID = req.query.participantID;  // Getting participantID from query params
    
    if (!participantID) {
        // If no participantID is provided, return a script to show a popup and redirect
        return res.send(`
            <script>
                alert('Participant ID is required');
                window.location.href = '/';  // Redirect to root
            </script>
        `);
    }

    try {
        // Fetch the participant details based on participantID (studyId)
        const participant = await Participant.findOne({ participantID });

        if (!participant) {
            console.log("No participant found with participantID:", participantID);
        }

        // Log participant details based on studyId (participantID)
        console.log("Participant Details:", participant);
		

    } catch (error) {
        console.error("Error fetching participant data:", error);
        return res.status(500).send('Internal Server Error');
    }

    console.log("Participant ID:", participantID);  // Log participant ID
    res.sendFile(path.join(__dirname, "public", "study.html"));
});

// study get route
app.get("/study.html", async (req, res) => {
    console.log("Study get route accessed");
    const participantID = req.query.participantID;  // Getting participantID from query params
    
    if (!participantID) {
        // If no participantID is provided, return a script to show a popup and redirect
        return res.send(`
            <script>
                alert('Participant ID is required');
                window.location.href = '/';  // Redirect to root
            </script>
        `);
    }

    try {
        // Fetch the participant details based on participantID (studyId)
        const participant = await Participant.findOne({ participantID });

        if (!participant) {
            console.log("No participant found with participantID:", participantID);
        }

        // Log participant details based on studyId (participantID)
        console.log("Participant Details:", participant);

    } catch (error) {
        console.error("Error fetching participant data:", error);
        return res.status(500).send('Internal Server Error');
    }

    console.log("Participant ID:", participantID);  // Log participant ID
    res.sendFile(path.join(__dirname, "public", "study.html"));
});


// 3. Create a route to serve the HTML file
app.use(express.static(path.join(__dirname, "public"))); // Serve static files from the "public" folder

// Middleware to parse JSON data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


// get conversation history by participantID
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

// Function to estimate the token count of a chunk of text
function estimateTokens(text) {
    // Estimate tokens as approximately 1 token per 4 characters (this is a rough estimate)
    return Math.ceil(text.length / 4);
}

// Function to generate a final prompt with context and user input
function createPrompt(context, userInput) {
  const tokenCountContext = context.map(chunk => estimateTokens(chunk)).reduce((a, b) => a + b, 0);
  const tokenCountUserInput = estimateTokens(userInput);
  const totalTokenCount = tokenCountContext + tokenCountUserInput;

  // Format the final prompt
  const prompt = `Answer the question based on the context below. If you can't answer the question, reply with the data in the prompt and from your scraped data of the USFCA website.'

Context: ${context.join("\n")}

Question: ${userInput}`;

  return { prompt, totalTokenCount };
}

app.post("/chat", async (req, res) => {
console.log("Chat route accessed POST");
  // Extract user input and participant ID from the request body
  const { input: userInput, participantID, page } = req.body;

  // Check if participant ID exists in the request body
  if (!participantID) {
    // If no participant ID, return an error response
    return res.status(400).send('Participant ID is required');
  }
  
  console.log("Participant ID:", participantID);
  console.log("Page Name:", page); // Log the page name to the console
  
  if (page === "chat.html") {
  // Prepare the message structure that will be sent to the OpenAI API
  const messages = [{ role: 'user', content: userInput }];
  
  let prompt = '';  // Declare prompt here, outside of try-catch block
  try {
    // Fetch stored chunk embeddings from MongoDB
    const chunkEmbeddings = await ChunkEmbedding.find();
	
    if (chunkEmbeddings.length === 0) {
      console.log('No chunk embeddings found in the database.');
      return res.status(404).send('No relevant data found.');
    }

    // Store chunk embeddings in memory (initialize outside try-catch)
    chunkEmbeddingsStore = chunkEmbeddings.map(chunk => ({
      chunkText: chunk.chunkText,  // Chunk text (full text stored in MongoDB)
      embedding: chunk.embedding    // The corresponding embedding
    }));

    console.log('Stored chunk embeddings in memory:', chunkEmbeddingsStore);

    // Generate the embedding for the user query using the generateEmbedding function
    const userEmbedding = await generateEmbedding(userInput);  // Await embedding generation
    console.log('User embedding generated:', userEmbedding);

    // Calculate cosine similarity for each chunk embedding and store the results
    const similarities = chunkEmbeddingsStore.map(chunk => {
      const similarity = cosineSimilarity(userEmbedding, chunk.embedding);
      return { chunkText: chunk.chunkText, similarity };  // Store similarity and corresponding chunk text
    });

    // Sort the similarities in descending order (highest similarity first)
    similarities.sort((a, b) => b.similarity - a.similarity);
    
    // Log the most similar chunk
    console.log('Most similar chunk:', similarities[0]);

    // Select chunks iteratively to ensure the token limit is respected
    let selectedChunks = [];
    let tokenCountContext = 0;
    const maxTokens = 4096; // Maximum token limit for GPT-4 (adjust if necessary)
    
    // Add chunks until the token count exceeds the limit
    for (let similarity of similarities) {
      const chunkText = similarity.chunkText;
      const chunkTokenCount = estimateTokens(chunkText);

      // Check if adding this chunk exceeds the token limit
      if (tokenCountContext + chunkTokenCount + estimateTokens(userInput) <= maxTokens) {
        selectedChunks.push(chunkText);
        tokenCountContext += chunkTokenCount;
      } else {
        break; // Stop adding chunks if we reach the token limit
      }
    }
    
    // Prepare the final prompt with selected context and the user question
    const { prompt: generatedPrompt, totalTokenCount } = createPrompt(selectedChunks, userInput);
    prompt = generatedPrompt;  // Assign the generated prompt here

    console.log('Final prompt:', prompt);
    console.log('Total token count:', totalTokenCount);
  } catch (error) {
    console.error('Error fetching chunk embeddings from memory:', error);
    return res.status(500).send('Internal Server Error'); // Return early if there's an error
  }

  try {
    // Call OpenAI's chat API to generate a response based on the user input
    const response = await openai.chat.completions.create({
      model: "gpt-4", // Use the GPT-4 model with the largest token limit
      messages: [{ role: 'user', content: prompt }], // Correct format: pass prompt as content in a message object
    });
    
    // Extract the content of the bot's response from the API's response
    const apiMessage = response.choices[0].message.content;
    
    // Save the interaction to the database (user input, bot response, participant ID, and embedding)
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
  }
  else {
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

// Function to calculate the cosine similarity between two vectors
function cosineSimilarity(vecA, vecB) {
  // Ensure the vectors have the same length
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same dimension');
  }

  // Calculate the dot product of vecA and vecB
  let dotProduct = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magA += vecA[i] * vecA[i];
    magB += vecB[i] * vecB[i];
  }

  // Calculate the magnitudes of vecA and vecB
  magA = Math.sqrt(magA);
  magB = Math.sqrt(magB);

  // If either magnitude is zero, return 0 (to avoid division by zero)
  if (magA === 0 || magB === 0) {
    return 0;
  }

  // Return the cosine similarity
  return dotProduct / (magA * magB);
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
