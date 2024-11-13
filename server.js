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

// In-memory store for chunk embeddings
let chunkEmbeddingsStore = [];  // This will hold the chunk embeddings for testing purposes

// define the test file path
const filePath = path.join(__dirname, 'data', 'test_file.txt');


// Function to chunk the text into manageable pieces with overlap, considering paragraphs
function chunkTextWithOverlap(text, chunkSize = 500, overlap = 100) {
  const chunks = [];
  let start = 0;

  // Split the text into paragraphs based on double newlines
  const paragraphs = text.split('\n');
  
  // Ensure the paragraphs are not empty or too large
  if (paragraphs.length === 0) {
    console.error('No valid paragraphs found in the text.');
    return chunks;  // Early exit if no valid paragraphs
  }

  let currentChunk = '';
  
  // Loop through the paragraphs and build chunks
  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i];

    // Check if adding the next paragraph exceeds the chunk size
    if (currentChunk.length + paragraph.length + 2 <= chunkSize) {
      currentChunk += paragraph + '\n\n'; // Add paragraph to the current chunk
    } else {
      // Push the current chunk if it's full
      chunks.push(currentChunk.trim());
      
      // If there's overlap, add part of the next paragraph
      if (i < paragraphs.length - 1) {
        const overlapParagraph = paragraphs[i + 1].slice(0, overlap); // Take a portion for overlap
        chunks.push(overlapParagraph); // Add overlap chunk
      }

      // Start a new chunk with the current paragraph
      currentChunk = paragraph + '\n';
    }
  }

  // Add the last chunk if it's non-empty
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  // Print the chunks for debugging
  chunks.forEach((chunk, index) => {
    console.log(`Chunk ${index + 1}:`);
    console.log(chunk);
    console.log('----------------------');
  });

  return chunks;
}


// Function to get embeddings for each chunk from OpenAI
async function getEmbeddingsForChunks(chunks) {
  const embeddings = [];

  for (const [index, chunk] of chunks.entries()) {
    try {
      // Call OpenAI's embeddings API
      const response = await openai.embeddings.create({
        model: 'text-embedding-ada-002', // You can adjust the model if needed
        input: chunk,
      });

      // Log the response to see the structure
      console.log(`Response for Chunk ${index + 1}:`, response);

      // Extract the embedding vector from the response (response.data might need to be logged to ensure proper structure)
      const embedding = response.data[0].embedding;
	  
	  // Store the chunk and its embedding in the in-memory store
      chunkEmbeddingsStore.push({
        chunkText: chunk,
        embedding: embedding,
      });

      // Store the chunk along with its embedding vector
      embeddings.push({ chunk: chunk, embedding: embedding });

      console.log(`Chunk ${index + 1} embedding generated.`);
    } catch (error) {
      console.error(`Error generating embedding for chunk ${index + 1}:`, error);
    }
  }

  return embeddings;
}


// Read the file asynchronously
fs.readFile(filePath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading file:', err);
    return;
  }

  // Step 1: Chunk the text into smaller pieces with overlap (e.g., 500 characters per chunk and 100 characters overlap)
  const chunks = chunkTextWithOverlap(data, 500, 100);
  
    // Step 3: Print each chunk
  for (const [index, chunk] of chunks.entries()) {
    console.log(`Chunk ${index + 1}:`);
    console.log(chunk);
    console.log('----------------------');
  }
  
  // Step 2: Process embeddings asynchronously
  async function generateEmbeddings() {
    try {
      const embeddings = await getEmbeddingsForChunks(chunks);  // Await the embedding generation

      // Step 4: Print the embeddings for each chunk (or save them, depending on your needs)
      embeddings.forEach((entry, index) => {
        console.log(`Chunk ${index + 1}:`);
        console.log('Text:', entry.chunk);
        console.log('Embedding:', entry.embedding);
        console.log('----------------------');
      });
    } catch (error) {
      console.error("Error generating embeddings:", error);
    }
  }
  
  generateEmbeddings();
});



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
  // Extract user input and participant ID from the request body
  const { input: userInput, participantID } = req.body;

  // Check if participant ID exists in the request body
  if (!participantID) {
    // If no participant ID, return an error response
    return res.status(400).send('Participant ID is required');
  }

  // Prepare the message structure that will be sent to the OpenAI API
  const messages = [{ role: 'user', content: userInput }];
  
  let prompt = '';  // Declare prompt here, outside of try-catch block
  try {
    // 2. Generate the embedding for the user query using the generateEmbedding function
    const userEmbedding = await generateEmbedding(userInput);  // Await embedding generation
    console.log('User embedding generated:', userEmbedding);
    console.log('Stored chunk embeddings in memory:', chunkEmbeddingsStore);

    // Calculate cosine similarity for each chunk embedding and store the results
    const similarities = chunkEmbeddingsStore.map(chunk => {
      const similarity = cosineSimilarity(userEmbedding, chunk.embedding);
      return { chunkText: chunk.chunkText, similarity };  // Store similarity and corresponding chunk text
    });

    // Sort the similarities in descending order (highest similarity first)
    similarities.sort((a, b) => b.similarity - a.similarity);
    
    // Log the most similar chunk
    console.log('Most similar chunk:', similarities[0]);

    // Step 3: Select chunks iteratively to ensure the token limit is respected
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
    
    // Step 4: Prepare the final prompt with selected context and the user question
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
      model: "gpt-4o-mini", // Specify the model to use
      messages: [{ role: 'user', content: prompt }], // Correct format: pass prompt as content in a message object
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



// Add this route to handle Bing search requests
app.post("/bing-search", async (req, res) => {
    const { query } = req.body; // Extract only the user query from the request body

    // Log the Bing search query (prompt) to the console
    console.log('Bing Search Query:', query); // This line prints the prompt/query being sent to Bing

    try {
        const bingResponse = await axios.get('https://api.bing.microsoft.com/v7.0/search', {
            params: { q: query }, // Use only the user query
            headers: {
                'Ocp-Apim-Subscription-Key': process.env.BING_API_KEY
            }
        });

        // Extract top 3 search results from the Bing API response
        const searchResults = bingResponse.data.webPages.value.slice(0, 3).map(result => ({
            name: result.name,
            snippet: result.snippet,
            url: result.url
        }));

        // Send the search results back to the client
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

// 5. Listen on a port (3000)
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
