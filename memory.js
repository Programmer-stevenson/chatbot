const fs = require("fs"); 
const path = "./users.json";

// Load or initialize persistent user memory
let userMemory = {};
if (fs.existsSync(path)) {
    userMemory = JSON.parse(fs.readFileSync(path, "utf8"));
}

// In-memory short-term session memory
const sessionMemory = {};

// Function to add messages to memory
function addMessage(userId, role, content) {
    // ----- Short-term memory -----
    if (!sessionMemory[userId]) sessionMemory[userId] = [];
    sessionMemory[userId].push({ role, content });
    if (sessionMemory[userId].length > 10) sessionMemory[userId].shift(); // keep last 10 messages

    // ----- Long-term memory -----
    if (!userMemory[userId]) userMemory[userId] = { facts: [] };
    // Example: store specific facts mentioned by the user
    if (role === "user" && content.toLowerCase().includes("store closes at")) {
        userMemory[userId].facts.push(content);
    }

    // Save persistent memory to file
    fs.writeFileSync(path, JSON.stringify(userMemory, null, 2));
}

// Function to retrieve memory for Gemini
function getMemory(userId) {
    const shortTerm = sessionMemory[userId] || [];
    const longTermFacts = (userMemory[userId]?.facts || []).join("\n");
    return { shortTerm, longTermFacts };
}

module.exports = { addMessage, getMemory };
