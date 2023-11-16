const functions = require('@google-cloud/functions-framework');
const OpenAI = require("openai").default;
const admin = require('firebase-admin');
const { Storage } = require('@google-cloud/storage');
const storage = new Storage();
const axios = require('axios');
const twilio = require('twilio');

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const client = twilio(accountSid, authToken);
    const fromWhatsAppNumber = 'whatsapp:+xxxxxxx'; // Your Twilio WhatsApp number

const bucket = storage.bucket('my-bucket');

admin.initializeApp();
const db = admin.firestore();

// Register a single HTTP function that handles different actions
functions.http('dalle', async (req, res) => {
    const action = req.body.action;

    switch(action) {
        case 'generate':
            await handleGenerate(req, res);
            break;
        case 'poll':
            await handlePoll(req, res);
            break;
        default:
            res.status(400).send({ error: 'Invalid action' });
    }
});

async function handleGenerate(req, res) {
    const openai = new OpenAI({
        key: process.env.OPENAI_API_KEY
    });

    const { sender_id, text_prompt } = req.body;

    try {
        const dalleResponse = await openai.images.generate({
            model: "dall-e-3",
            prompt: text_prompt,
            quality: "standard",
            size: "1024x1024",
            n: 1
        });

        const responseURL = dalleResponse.data[0].url;

        // Download the image from DALL-E's response
        const imageResponse = await axios.get(responseURL, { responseType: 'arraybuffer' });
        const imageBuffer = imageResponse.data;

        // Generate a unique filename for the image
        const fileName = `images/${Date.now()}-${sender_id}.png`;
        const file = bucket.file(fileName);

        // Upload the image to Google Cloud Storage
        await file.save(imageBuffer, { public: true, contentType: 'image/png' });

        // Generate a public URL for the uploaded image
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

        const message = await client.messages.create({
            from: fromWhatsAppNumber,
            to: sender_id,
            //body: text_prompt,
            mediaUrl: publicUrl
        });

        // Save to Firestore
        const docRef = db.collection('mediaMessages').doc(sender_id);
        await docRef.set({
            sender_id: sender_id,
            text_prompt: text_prompt,
            responseURL: publicUrl,
            status: 'unread'
        });

        res.status(200).send({ message: "Image generation triggered successfully." });

    } catch (error) {
        console.error("Error generating media message:", error);
        res.status(500).send("Error processing your request");
    }
}