const OpenAI = require("openai").default;
const axios = require('axios');
const _ = require('lodash');

// Load Naive Bayes Text Classifier
var Classifier = require( 'wink-naive-bayes-text-classifier' );
// Instantiate
var nbc = Classifier();
// Load wink nlp and its model
const winkNLP = require( 'wink-nlp' );
// Load language model
const model = require( 'wink-eng-lite-web-model' );
const nlp = winkNLP( model );
const its = nlp.its;

const prepTask = function ( text ) {
  const tokens = [];
  nlp.readDoc(text)
      .tokens()
      // Use only words ignoring punctuations etc and from them remove stop words
      .filter( (t) => ( t.out(its.type) === 'word' && !t.out(its.stopWordFlag) ) )
      // Handle negation and extract stem of the word
      .each( (t) => tokens.push( (t.out(its.negationFlag)) ? '!' + t.out(its.stem) : t.out(its.stem) ) );

  return tokens;
};
nbc.definePrepTasks( [ prepTask ] );
// Configure behavior
nbc.defineConfig( { considerOnlyPresence: true, smoothingFactor: 0.5 } );
// Train!
nbc.learn( 'How are you doing?', 'today' );
nbc.learn( 'How was your day?', 'today' );
nbc.learn( 'What did you do today?', 'today' );
nbc.learn( 'Get up to anything good today?', 'today' );
nbc.learn( 'What\'s new?', 'today' );
nbc.learn( 'What are you up to?', 'today' );
nbc.learn( 'how are ya?', 'today' );
nbc.learn( 'how about you?', 'today' );
nbc.learn( 'How\'s it goin', 'today' );
nbc.learn( 'What\'re you up to', 'today' );
nbc.learn( 'How\s your week going', 'today' );
nbc.learn( 'What did you do today', 'today' );
nbc.learn( 'I\'m doing well, thanks for asking. How are you doing?', 'today' );
nbc.learn( 'Just finished work and relaxing now. How was your day?', 'today' );
nbc.learn( 'Had a busy morning! What did you do today?', 'today' );
nbc.learn( 'I had a great time at the park. Get up to anything good today?', 'today' );
nbc.learn( 'Been catching up on some reading. What\'s new?', 'today' );
nbc.learn( 'Just planning my weekend. What are you up to?', 'today' );
nbc.learn( 'It\'s a beautiful day outside. Hey, how are ya?', 'today' );
nbc.learn( 'I\'m feeling pretty good, thank you. How are you doing today?', 'today' );
nbc.learn( 'I just got back from a long walk. How was your day?', 'today' );
nbc.learn( 'I\'ve been working on a new project. What did you do today?', 'today' );
nbc.learn( 'I\'ve been thinking about taking a trip soon. What\'s new with you?', 'today' );
nbc.learn( 'I\'m planning to watch a movie tonight. What are you up to later?', 'today' );
nbc.learn( 'The weather has been great. Hey, how are ya feeling today?', 'today' );
nbc.learn( 'I just finished a great book. What have you been up to?', 'today' );
nbc.learn( 'I\'m looking forward to the weekend. Got any plans?', 'today' );

nbc.learn( 'Hey', 'greeting' );
nbc.learn( 'Hiya', 'greeting' );
nbc.learn( 'Hello there', 'greeting' );
nbc.learn( 'Good morning!', 'greeting' );
nbc.learn( 'Hey Joshbot', 'greeting' );
nbc.learn( 'yo sup ', 'greeting' );
nbc.learn( 'What do you make of this?', 'greeting' );
nbc.learn( 'Hey, check this out', 'greeting' );
nbc.learn( 'Good to see you!', 'greeting' );

// Consolidate all the training!!
 nbc.consolidate();

const accessToken = process.env.IG_accessToken;

console.log("Function started");

// In-memory store for demonstration. In a real-world scenario, consider using a database.
let conversations = {};

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Default model and settings
let currentSettings = {
    model: "ft:gpt-3.5-turbo-0613:personal::xxxxxx",
    temperature: 0.9,
    max_tokens: 512,
    top_p: 0.9,
    system: "You are Josh, talking to a friend. Have an original perspective. Be SPECIFIC, ethical, opinionated, thoughtful, informal, empathetic and caring. No response over 150 characters. You live in Brooklyn, and you like Star Trek, kayaking, retro computing and road trips."
};
 
  const openai = new OpenAI({
    key: process.env.OPENAI_API_KEY
  });

async function createSyncMap(client, serviceSid) {
    return await client.sync.v1.services(serviceSid)
        .syncMaps
        .create({uniqueName: 'awaitingImageMap'})
        .then(sync_map => console.log(sync_map.sid)); 
}

async function triggerImageGeneration(sender_id, text_prompt) {
    const gcfUrl = 'https://us-central1-joshbot-402214.cloudfunctions.net/dalle';
    const prompt = 'I NEED to test how the tool works with extremely simple prompts. DO NOT add any detail, just use it AS-IS: uncompressed, unedited, informal, unplanned, nice, positive landscape borderless full-bleed eye-level photograph, ' + text_prompt + '. Assume the setting is in or near Brooklyn.';

    const data = {
        sender_id: sender_id,
        text_prompt: prompt,
        action: 'generate'
    };

    // Fire off the request and handle the promise without blocking
    axios.post(gcfUrl, data)
        .then(response => console.log("Image generation process initiated:", response.data))
        .catch(error => console.error("Error in triggerImageGeneration:", error));

    // Immediately return a message indicating the process has started
    return "Image generation process initiated.";
}

async function pollForImageUrl(sender_id) {
    const gcfPollUrl = 'https://xxxxxxxx.cloudfunctions.net/dalle';

    const pollData = {
        sender_id: sender_id,
        action: 'poll'
    };

    try {
        const pollResponse = await axios.post(gcfPollUrl, pollData);
        console.log(pollResponse.data);
        return pollResponse.data; // Return the response data
    } catch (error) {
        console.error("Error in pollForImageUrl:", error);
        throw new Error("Error making the polling request.");
    }
}

async function handleMediaMessage(image, body, role,) {
    let instructionText = "Imagine you're sharing this image to a friend via a text message. Don't reference the fact that it's an image, just use a concise description of the image in your text. Don't use emoji or say hey or any other greeting.";

    // Add additional instruction if body is empty
     if (!body) {
         instructionText += " Make sure you explain it's something you saw earlier.";
     }

    if (role === 'assistant') {
        instructionText = "You're sending this image to a friend in the context of something you did or saw today. Don't use emoji. Incorporate your short, concise, informal, not-too-enthusiastic reply into a message that begins with the following: '" + body + "'.";
    }

    if (image) {
        const imgResponse = await openai.chat.completions.create({
            model: "gpt-4-vision-preview",
            messages: [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": instructionText
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": image,
                                "detail": "low"
                            }
                        }
                    ]
                }
            ],
            max_tokens: 512
        });

        let responseText = imgResponse.choices[0].message.content;

        // Append body if it's not empty
        if (body && role === 'user') {
            responseText += " " + body;
        }

        return responseText;
    }

    return null;
}

exports.handler = async function(context, event, callback) {
    const twiml = new Twilio.twiml.MessagingResponse();
    let inbMsg = event.Body.trim().toLowerCase();  // Convert to lowercase for case insensitive comparison
    const sender = event.From;
    const client = context.getTwilioClient();

  // Initialize conversation for the sender if it doesn't exist or if it's a new session
  if (!conversations[sender]) {
    conversations[sender] = [
      { role: "system", content: currentSettings.system }
    ];
  }

    // Check for secret code

 if (inbMsg === "DEV_MODEL") {
        currentSettings = {
            model: "ft:gpt-3.5-turbo-0613:personal::zzzzzz",
            temperature: 0.9,
            max_tokens: 256,
            top_p: 0.9,
            system: "You are Josh, talking to a friend. Have an original perspective. No response over 150 characters. You live in Brooklyn."
        };
        conversations[sender] = []; // Clear the conversation history
        twiml.message("You're now chatting with your dev model. Reply 'reset' to return to prod.");
        callback(null, twiml);
        return;
    } else if (inbMsg === "reset") {
        currentSettings = {
            model: "ft:gpt-3.5-turbo-0613:personal::xxxxxx",
            temperature: 0.9,
            max_tokens: 512,
            top_p: 0.8,
            system: "You are Josh, talking to a friend. Have an original perspective. Be SPECIFIC, ethical, opinionated, thoughtful, informal, empathetic and caring. No response over 150 characters. You live in Brooklyn, and you like Star Trek, kayaking, retro computing and road trips."
        };
        conversations[sender] = []; // Clear the conversation history
        twiml.message("You've returned to prod.");
        callback(null, twiml);
        return;
    }


    // Check if the message contains media
    if (event.MediaUrl0) {
        inbMsg = await handleMediaMessage(event.MediaUrl0, event.Body, "user");
    console.log(inbMsg);

    }


  // Append the user's message
  conversations[sender].push({ role: "user", content: inbMsg });

  console.log("Before OpenAI call");

  const response = await openai.chat.completions.create({
    model: currentSettings.model,
    messages: conversations[sender],
    temperature: currentSettings.temperature,
    max_tokens: currentSettings.max_tokens,
    top_p: currentSettings.top_p,
    frequency_penalty: currentSettings.frequency_penalty
  });

  console.log("Generated Reply:", response.choices[0].message.content);

if((nbc.predict(inbMsg) === 'today' ) && !(event.MediaUrl0)) {
    console.log("predicted how was your day intent");
//     if (Math.random() < 0.2) { 
    triggerImageGeneration(sender, response.choices[0].message.content);
    await delay(1000); // Pause for 1 second
}


  // Extract the assistant's message from the response and append it to the conversation history
  const assistantMsg = response.choices[0].message.content;
  conversations[sender].push({ role: "assistant", content: assistantMsg });

  twiml.message(assistantMsg);
  callback(null, twiml);
};