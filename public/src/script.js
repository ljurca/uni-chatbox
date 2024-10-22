// Add 3 constant variables inputField, sendBtn, and messagesContainer
const inputField = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const messagesContainer = document.getElementById('messages');
let conversationHistory = [];

// Retrieve participantID from localStorage
const participantID = localStorage.getItem('participantID');

// Alert and prompt if no participantID
if (!participantID) {
 alert('Please enter a participant ID.');
 // Redirect to login if no participantID is set
 window.location.href = 'index.html'; 
}

// Function to fetch and load existing conversation history
async function loadConversationHistory() {
 const response = await fetch('/history', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ participantID }) // Send participantID to the server
 });
 const data = await response.json();
 if (data.interactions && data.interactions.length > 0) {
 data.interactions.forEach(interaction => {
 const userMessageDiv = document.createElement('div');
 userMessageDiv.textContent = `You: ${interaction.userInput}`;
 document.getElementById('messages').appendChild(userMessageDiv);
 const botMessageDiv = document.createElement('div');
 botMessageDiv.textContent = `Bot: ${interaction.botResponse}`;
 document.getElementById('messages').appendChild(botMessageDiv);
 // Add to conversation history
 conversationHistory.push({ role: 'user', content: interaction.userInput });
 conversationHistory.push({ role: 'assistant', content: interaction.botResponse });
 });
 }
}
// Load history when agent loads
window.onload = loadConversationHistory;


// Add a sendMessage() function to handle sending messages
async function sendMessage() {
    // Retrieve the user input from the input field and remove whitespace
    const userInput = inputField.value.trim();

    // Check if the input is empty, and if so, display an alert
    if (userInput === '') {
        alert('Please enter a message.');
        return;
    }

    // Add user message to the chat
    addMessage(userInput, 'user');

    // Prepare payload for the server
    const payload = conversationHistory.length === 0
        ? { input: userInput, participantID } // First submission, send input with participantID
        : { history: conversationHistory, input: userInput, participantID }; // Send history with input and participantID

    // Send the message to the server
    try {
        const response = await fetch("/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();
        console.log("Server response:", data);

        // Display the server's response in the chat window
        addMessage(`${data.confirmation}`, 'ai');

        // Send a request to the server for Bing search results
        const bingResponse = await fetch("/bing-search", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ query: userInput }),
        });
		
		addMessage("Here are search results from the internet that can help you further:", 'ai');

        const bingData = await bingResponse.json();
		bingData.results.forEach(result => {
            const faviconUrl = `https://www.google.com/s2/favicons?domain=${new URL(result.url).hostname}`;
            addMessage(`
                <img src="${faviconUrl}" alt="favicon" style="width: 16px; height: 16px; margin-right: 5px;">
                <a href="${result.url}" target="_blank" style="text-decoration: none; color: blue;">${result.name}</a>: <br><br>${result.snippet}`, 'ai');
        });

        conversationHistory.push({ role: 'user', content: userInput });
    } catch (error) {
        console.error("Error occurred while sending message:", error);
        alert("There was an error sending your message.");
    }

    inputField.value = '';
}

// Add event listener to the sendBtn to trigger sendMessage() when clicked
sendBtn.addEventListener('click', sendMessage);

// Add event listener to the inputField to allow the "Enter" key to send the message
inputField.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        sendMessage();
        event.preventDefault();
    }
});

// Function to fetch and load existing conversation history
async function loadConversationHistory() {
    // Retrieve participantID from localStorage
    const participantID = localStorage.getItem('participantID');

    // Check if participantID exists
    if (!participantID) {
        alert('Participant ID is required.');
        return;
    }

    // Add a message to indicate that previous history is being loaded
    addMessage("Your previous message history and interactions:", 'ai');

    try {
        const response = await fetch('/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ participantID }) // Send participantID to the server
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();

        // Check if there are interactions
        if (data.interactions && data.interactions.length > 0) {
            data.interactions.forEach(interaction => {
                // Use addMessage function to display user and bot messages
                addMessage(interaction.userInput, 'user'); // User message
                addMessage(interaction.botResponse, 'ai');  // Bot response

                // Add to conversation history
                conversationHistory.push({ role: 'user', content: interaction.userInput });
                conversationHistory.push({ role: 'assistant', content: interaction.botResponse });
            });
        }
    } catch (error) {
        console.error('Error loading conversation history:', error);
    }
}

// Load history when the page loads
window.onload = loadConversationHistory;


// Function that adds AI and user message inputs inside the HTML
function addMessage(text, sender = 'user') {
    const chatbox = document.getElementById("messages");
    const chat = document.createElement("div");
    chat.classList.add("chat");

    if (sender === 'ai') {
        chat.classList.add("ai-message");
        chat.innerHTML = `
            <img src="https://cdn.glitch.global/75bcfb9b-05b5-4a7c-a5be-e94c063e143f/avatar.jpg?v=1727042473922" alt="">
            <p class="msg">${text}</p>
        `;
    } else {
        chat.classList.add("user-message");
        chat.innerHTML = `
            <img src="https://cdn.glitch.global/75bcfb9b-05b5-4a7c-a5be-e94c063e143f/empty%20avatar%20copy.jpg?v=1727042620275" alt="">
            <p class="msg">${text}</p>
        `;
    }

    chatbox.appendChild(chat);
    chatbox.scrollTop = chatbox.scrollHeight; 
}

// Log event function
function logEvent(type, element, message) {
    fetch('/log-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType: type, elementName: element, message: message, timestamp: new Date() })
    });
}

// AI reply function
function aiReply() {
    setTimeout(() => {
        addMessage("Message received!", 'ai');
    }, 1000);
}
