const mongoose = require('mongoose');

// Define the schema for ChunkEmbedding
const chunkEmbeddingSchema = new mongoose.Schema({
  chunkText: {
    type: String,
    required: true  // Full chunk of text
  },
  embedding: {
    type: [Number],  // Array of numbers to store the embedding vector
    required: true
  }
});

// Create a model based on the schema
const ChunkEmbedding = mongoose.model('ChunkEmbedding', chunkEmbeddingSchema);

module.exports = ChunkEmbedding;
