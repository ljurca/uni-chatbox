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
	
	// Get the page name dynamically
    const pageName = window.location.pathname.split('/').pop();

    // Prepare payload for the server
    const payload = conversationHistory.length === 0
        ? { input: userInput, participantID, page: pageName } // First submission
        : { history: conversationHistory, input: userInput, participantID, page: pageName }

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

        conversationHistory.push({ role: 'user', content: userInput });
    } catch (error) {
        console.error("Error occurred while sending message:", error);
        alert("There was an error sending your message.");
    }

    inputField.value = '';
}

if (sendBtn) {
    sendBtn.addEventListener('click', sendMessage);
}

if (inputField) {
    inputField.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            sendMessage();
            event.preventDefault();
        }
    });
}

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



async function updateLinks() {
	if (
	  !window.location.pathname.endsWith("study.html") &&
	  !window.location.pathname.endsWith("study")
	) {
	  return; // Prevent execution on other pages
	}

    console.log('Updating links...'); // Check if this is being called

    const demographicsLink = document.getElementById('demographicsLink');
    const preTaskLink = document.getElementById('preTaskLink');
    const postTaskLink = document.getElementById('postTaskLink');
	const aiTarget = document.getElementById('aiTarget');

    if (demographicsLink && preTaskLink && postTaskLink) {
        console.log('Elements found, updating links...');
        const demographicsURL = localStorage.getItem('demographicsLink');
        const preTaskURL = localStorage.getItem('preTaskLink');
        const postTaskURL = localStorage.getItem('postTaskLink');

        // Log values to check if they exist in localStorage
        console.log('demographicsURL:', demographicsURL);
        console.log('preTaskURL:', preTaskURL);
        console.log('postTaskURL:', postTaskURL);

        demographicsLink.href = demographicsURL || "https://defaultdemographics.com/"; // Default if not in localStorage
        preTaskLink.href = preTaskURL || "https://defaultpreTask.com/"; // Default if not in localStorage
        postTaskLink.href = postTaskURL || "https://defaultpostTask.com/"; // Default if not in localStorage
    } else {
        console.error('Links not found in the DOM');
    }
    
	const thirdLetter = participantID[2].toLowerCase(); // Get the 3rd letter of the participantID (case insensitive)
            if (thirdLetter === 'l') {
                aiTarget.href = `/chat.html?participantID=${participantID}`;
            } else if (thirdLetter === 'f') {
                aiTarget.href = `/ai.html?participantID=${participantID}`;
            } else {
                console.error('Links not found in the DOM');
            }
	
}


window.onload = async function() {
    await loadConversationHistory();  // Load conversation history
    await updateLinks();  // Update the links based on the participant data
};


function addMessage(text, sender = 'user') {
	if (
	  !window.location.pathname.endsWith("chat.html") &&
	  !window.location.pathname.endsWith("chat") &&
	  !window.location.pathname.includes("ai.html") &&
	  !window.location.pathname.includes("ai")
	) {
	  return; // Prevent execution on other pages
	}
	
	const chatbox = document.getElementById("messages");
    const chat = document.createElement("div");
    chat.classList.add("chat");

    // Replace newlines with <br><br> for line breaks (inline text)
    let formattedText = text.replace(/\n/g, '<br><br>');

    // Format ordered lists (e.g., 1. Item 1, 2. Item 2)
    formattedText = formattedText.replace(/(\d+\.)\s+/g, '<li>').replace(/<\/li><li>/g, '</li><li>').replace(/<\/li>/g, '</li>');
    formattedText = formattedText.replace(/(\d+\.)\s+/g, '<ol><li>'); // Open the ordered list

    // Format unordered lists (e.g., - Item, * Item, • Item)
    formattedText = formattedText.replace(/(^|\n)([-*•])\s+/g, (match, p1, p2) => {
        if (p1 === '\n') return '<li>'; // Start a new unordered list
        return `<li>`; // Add an unordered list item
    });
    formattedText = formattedText.replace(/<\/li><li>/g, '</li><li>'); // Ensure list items are properly enclosed
    formattedText = formattedText.replace(/<\/li>/g, '</li>'); // Close the list properly
    formattedText = formattedText.replace(/(\d+\.)\s+/g, '<ol><li>'); // Close the ordered list tag properly

    // Detect if there are multiple lines by splitting the formatted text at the first line break
    const lines = formattedText.split('<br><br>');
    const firstLine = lines[0]; // The first line of text

    // Create a styled version of the first line (bold and bigger font size) only for AI's response with multiple lines
    let finalText = formattedText;
    if (sender === 'ai') {
        // Check if there are multiple lines (more than 1)
        if (lines.length > 1) {
            const styledFirstLine = `<span style="font-size: 1.3em; font-weight: bold;">${firstLine}</span>`;
            const remainingText = lines.slice(1).join('<br><br>'); // Join the remaining lines after the first line
            finalText = styledFirstLine + (remainingText ? '<br><br>' + remainingText : '');
        }
    }

    // Now format the message, separating text from lists
    const listMatches = text.match(/(^|\n)([-*•]|\d+\.)\s+/); // Detect if there are lists at all
    const isList = listMatches !== null;

    if (sender === 'ai') {
        chat.classList.add("ai-message");
        if (isList) {
            // Wrap lists outside of <p> tags
            chat.innerHTML = `
                <img src="images/ai-avatar.jpg" alt="">
                <div class="msg">${finalText}</div>
            `;
        } else {
            chat.innerHTML = `
                <img src="images/ai-avatar.jpg" alt=""/>
                <p class="msg">${finalText}</p>
            `;
        }
    } else {
        chat.classList.add("user-message");
        if (isList) {
            // Wrap lists outside of <p> tags for user messages
            chat.innerHTML = `
                <img src="images/user-avatar.jpg" alt=""/>
                <div class="msg">${finalText}</div>
            `;
        } else {
            chat.innerHTML = `
                <img src="images/user-avatar.jpg" alt=""/>
                <p class="msg">${finalText}</p>
            `;
        }
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
