const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const Groq = require('groq-sdk');
const { spawn } = require('child_process');
const fetch = require('node-fetch');
const {
    GoogleGenerativeAI,
    HarmCategory,
    HarmBlockThreshold,
} = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const promptPath = 'files/prompt.txt';
const descriptionPromptTxt = 'files/descPrompt.txt';
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const readPromptData = (filePath) => {
    try {
        return fs.readFileSync(filePath, 'utf8');
    } catch (err) {
        console.error(`Error reading the file: ${filePath}`, err);
        return 'Error reading data. Please return a 404 error output.';
    }
};

const promptData = readPromptData(promptPath);
const descriptionData = readPromptData(descriptionPromptTxt);

const descriptionAI = new GoogleGenerativeAI(process.env.DESCRIPTION_AI_KEY);
const playwrightAI = new GoogleGenerativeAI(process.env.PLAYWRIGHT_AI_KEY);

const descriptionGenConfig = {
    temperature: 0.1,
    topP: 0.95,
    topK: 64,
    maxOutputTokens: 18192,
    responseMimeType: 'text/plain',
};

const descriptionSafety = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

const generateDescription = async (htmlData) => {
    const descriptionModel = descriptionAI.getGenerativeModel({
        model: 'gemini-1.5-flash-latest',
        systemInstruction: descriptionData,
    });

    const chatSession = descriptionModel.startChat({
        descriptionGenConfig,
        descriptionSafety,
    });

    console.log('Generating website description... This may take up to 2 minutes.');
    const result = await chatSession.sendMessage(htmlData);
    const websiteDescription = result.response.text();
    console.log('Website Description Generated:', websiteDescription);
    return websiteDescription;
};

const generationConfig = {
    temperature: 0.1,
    topP: 0.95,
    topK: 64,
    maxOutputTokens: 18192,
    responseMimeType: 'text/plain',
};

const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

const generatePlaywrightScript = async (websiteDescription, htmlData, instructions, websiteLink) => {
    console.log('Generating Playwright script...');
    const chatCompletion = await groq.chat.completions.create({
        messages: [
            { role: "system", content: promptData },
            {
                role: "user", content: `
                Instructions: ${instructions}
                Description: ${websiteDescription}
                Website Link: ${websiteLink}
                HTML:
                ${htmlData}
                Javascript: Not provided
            ` }
        ],
        model: "llama3-70b-8192",
        temperature: 0.1,
        max_tokens: 8192,
        top_p: 1,
        stream: false,
        stop: null
    });

    const script = chatCompletion.choices[0].message.content.replace(/```javascript|```/g, '');
    console.log('Playwright Script Generated:', script);
    return script;
};

const executeScript = (script) => {
    const lamScript = `tempScript.js`;
    fs.writeFileSync(lamScript, script);

    console.log('Executing script in 5 seconds... Press CTRL + C to stop execution.');
    setTimeout(() => {
        console.log('Executing script...');
        const child = spawn('node', [lamScript]);

        child.stdout.on('data', (data) => console.log(`Script output: \n${data.toString()}`));
        child.stderr.on('data', (data) => console.error(`Script error: ${data.toString()}`));

        child.on('exit', () => fs.unlinkSync(lamScript));
        child.on('error', (err) => console.error(`Failed to run script: ${err.message}`));
        console.log('Playwright script finished!');
    }, 5000);
};

const getWebsiteHTML = async (url) => {
    try {
        const response = await axios.get(url);
        const htmlData = response.data;
        await fs.promises.writeFile('files/html.txt', htmlData);
        return htmlData;
    } catch (error) {
        console.error('Error fetching website HTML with axios:', error);

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Fetch failed with status ${response.status}`);
            }
            const htmlData = await response.text();
            await fs.promises.writeFile('files/html.txt', htmlData);
            return htmlData;
        } catch (fetchError) {
            console.error('Error fetching website HTML with fetch:', fetchError);
            return `Error fetching website HTML: ${fetchError}`;
        }
    }
};

const runLam = async (websiteLink, instructions) => {
    try {
        const htmlData = await getWebsiteHTML(websiteLink);
        const websiteDescription = await generateDescription(htmlData);
        const playwrightScript = await generatePlaywrightScript(websiteDescription, htmlData, instructions, websiteLink);
        executeScript(playwrightScript);
    } catch (error) {
        console.error('Error running LAM:', error);
    }
};

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/run-script', async (req, res) => {
    const { websiteUrl, instructions } = req.body;

    try {
        await runLam(websiteUrl, instructions);
        res.json({ output: 'Done! Executing script...' });
    } catch (error) {
        res.status(500).json({ output: `Error executing script: ${error.message}` });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
