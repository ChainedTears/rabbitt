document.addEventListener("DOMContentLoaded", () => {
    const websiteUrlInput = document.getElementById("website-url");
    const instructionsInput = document.getElementById("instructions");
    const runScriptbtn = document.getElementById("run-script");
    const outputDiv = document.getElementById("output");
    const historyDiv = document.getElementById("history");
    const clearHistorybtn = document.getElementById("clear-history");

    const loadHistory = () => {
        const history = JSON.parse(localStorage.getItem("promptHistory")) || [];
        historyDiv.innerHTML = "";
        history.forEach((item, index) => {
            const historyItem = document.createElement("div");
            historyItem.className = "history-item";
            historyItem.innerHTML = `<strong> ${item.url} <br> ${item.instructions}`;
            historyItem.addEventListener('click', () => {
                websiteUrlInput.value = item.url;
                instructionsInput.value = item.instructions;
                const popup = document.getElementById('history-popup');
                popup.classList.remove('show');
                setTimeout(() => popup.style.display = 'none', 300);
                // runScript(); - uncomment to make it run script after you click it
            });
            historyDiv.appendChild(historyItem);
        });
    };

    loadHistory();

    const saveHistory = (url, instructions) => {
        const history = JSON.parse(localStorage.getItem("promptHistory")) || [];
        history.push({ url, instructions });
        localStorage.setItem("promptHistory", JSON.stringify(history));
        loadHistory();
    };

    const runScript = async () => {
        const websiteUrl = websiteUrlInput.value;
        const instructions = instructionsInput.value;

        if (!websiteUrl || !instructions) {
            outputDiv.textContent = 'Please enter both website URL and instructions.';
            return;
        }

        outputDiv.textContent = 'Analyzing...';

        try {
            const response = await fetch('/run-script', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ websiteUrl, instructions })
            });

            if (!response.ok) {
                throw new Error('Unknown error occurred');
            }

            const data = await response.json();
            outputDiv.textContent = data.output;
            saveHistory(websiteUrl, instructions);
            websiteUrlInput.value = "";
            instructionsInput.value = "";
        } catch (error) {
            outputDiv.textContent = `Error: ${error.message}`;
        }
    };

    runScriptbtn.addEventListener('click', runScript);

    clearHistorybtn.addEventListener('click', () => {
        localStorage.removeItem("promptHistory");
        loadHistory();
    });
});

document.getElementById('history-button').addEventListener('click', function () {
    const popup = document.getElementById('history-popup');
    popup.style.display = 'block';
    setTimeout(() => popup.classList.add('show'), 10);
});

document.getElementById('close-popup').addEventListener('click', function () {
    const popup = document.getElementById('history-popup');
    popup.classList.remove('show');
    setTimeout(() => popup.style.display = 'none', 300);
});

document.getElementById('clear-history').addEventListener('click', function () {
    document.getElementById('history').innerHTML = '';
});

