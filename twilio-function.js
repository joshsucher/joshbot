const OpenAI = require("openai").default;

console.log("Function started");

// In-memory store for demonstration. In a real-world scenario, consider using a database.
let conversations = {};

// Default model and settings
let currentSettings = {
    model: "PROD_MODEL",
    temperature: 0.9,
    max_tokens: 512,
    top_p: 0.9,
    system: "PROD_SYSTEM_PROMPT"
};

exports.handler = async function(context, event, callback) {
    const twiml = new Twilio.twiml.MessagingResponse();
    const inbMsg = event.Body.trim().toLowerCase();  // Convert to lowercase for case insensitive comparison
    const sender = event.From;

    // Check for secret code
    if (inbMsg === "DEV_MODEL") {
        currentSettings = {
            model: "DEV_MODEL",
            temperature: 0.9,
            max_tokens: 256,
            top_p: 0.9,
            system: "DEV_SYSTEM_CONTENT"
        };
        conversations[sender] = []; // Clear the conversation history
        twiml.message("You're now chatting with your dev model. Type 'reset' to return to prod.");
        callback(null, twiml);
        return;
    } else if (inbMsg === "reset") {
        currentSettings = {
            model: "PROD_MODEL",
            temperature: 0.9,
            max_tokens: 512,
            top_p: 0.9,
            system: "PROD_SYSTEM_PROMPT"
        };
        conversations[sender] = []; // Clear the conversation history
        twiml.message("You've returned to prod.");
        callback(null, twiml);
        return;
    }

    // Initialize conversation for the sender if it doesn't exist or if it's a new session
    if (!conversations[sender]) {
        conversations[sender] = [
            { role: "system", content: currentSettings.system }
        ];
    }

    // Append the user's message
    conversations[sender].push({ role: "user", content: inbMsg });

    const openai = new OpenAI({
        key: process.env.OPENAI_API_KEY // Ensure this environment variable is secure!
    });

    console.log("Before OpenAI call");

    const response = await openai.chat.completions.create({
        model: currentSettings.model,
        messages: conversations[sender],
        temperature: currentSettings.temperature,
        max_tokens: currentSettings.max_tokens,
        top_p: currentSettings.top_p
    });

    console.log("Generated Reply:", response.choices[0].message.content);

    // Extract the assistant's message from the response and append it to the conversation history
    const assistantMsg = response.choices[0].message.content;
    conversations[sender].push({ role: "assistant", content: assistantMsg });

    twiml.message(assistantMsg);
    callback(null, twiml);
};
