const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { spawn } = require('child_process');
const Groq = require('groq-sdk');
require('dotenv').config();

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const promptPath = 'files/prompt.txt';
const descriptionPath = 'files/descPrompt.txt';

const textData = (filePath) => {
    try {
        return fs.readFileSync(filePath, 'utf8');
    } catch (err) {
        console.error(`Error reading the file: ${filePath}`, err);
        return 'Error reading data. Please return a 404 error output.';
    }
};

const promptData = textData(promptPath);
const descriptionData = textData(descriptionPath);

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const generateDescription = async (htmlData) => {
    console.log('Generating website description... This may take up to 2 minutes.');
    const chatCompletion = await groq.chat.completions.create({
        messages: [
            { role: "system", content: descriptionData },
            { role: "user", content: htmlData }
        ],
        "model": "mixtral-8x7b-32768",
        "temperature": 0,
        "max_tokens": 32768,
        "top_p": 1,
        "stream": false,
        "stop": null
    });

    const websiteDescription = chatCompletion.choices[0].message.content;
    console.log('Website Description Generated:', websiteDescription);
    return websiteDescription;
};

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
        console.error('Error fetching website HTML');
        return `Error fetching website HTML`;
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
