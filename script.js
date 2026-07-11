document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const fileList = document.getElementById('fileList');
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const chatForm = document.getElementById('chatForm');
    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const chatMessages = document.getElementById('chatMessages');

    // Trigger input on click zone
    dropZone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    // Drag and Drop event listeners
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropZone.classList.add('drop-zone--over');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropZone.classList.remove('drop-zone--over');
        }, false);
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    });

    // Handle document processing simulation
    function handleFiles(files) {
        if (files.length === 0) return;
        
        fileList.innerHTML = ''; // Clear prior list
        Array.from(files).forEach(file => {
            const div = document.createElement('div');
            div.classList.add('file-item');
            div.innerHTML = `<span>📄 ${file.name}</span> <span>${(file.size/1024).toFixed(1)} KB</span>`;
            fileList.appendChild(div);
        });

        // Update system to loading state (Simulating Chunking/Embedding vector ingestion)
        statusDot.className = 'status-indicator loading';
        statusText.textContent = 'Parsing & Embedding document...';
        userInput.disabled = true;
        sendBtn.disabled = true;

        // Simulate backend RAG server processing
        setTimeout(() => {
            statusDot.className = 'status-indicator ready';
            statusText.textContent = 'Document Ready. Ask away!';
            userInput.disabled = false;
            sendBtn.disabled = false;
            userInput.focus();
            
            appendMessage('system', 'System: The document has been fully parsed, chunked, and stored into the vector database. Ready for your questions.');
        }, 2500); 
    }

    // Handle Chat Submission
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = userInput.value.trim();
        if (!text) return;

        // Render user message
        appendMessage('user', text);
        userInput.value = '';

        // Render AI placeholder thinking state
        const aiMessageDiv = appendMessage('ai', 'Thinking...');

        try {
            // Simulated connection to a Python backend endpoint (e.g., /api/query)
            // const response = await fetch('/api/query', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ question: text })
            // });
            // const data = await response.json();
            // aiMessageDiv.textContent = data.answer;

            setTimeout(() => {
                aiMessageDiv.textContent = "This is a frontend demonstration response. In production, your message is sent to the backend vector pipeline, fetches the top-k overlapping text chunks from the document store, and synthesizes a grounded answer via the LLM.";
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }, 1000);

        } catch (error) {
            aiMessageDiv.textContent = "Error getting response from the RAG pipeline.";
        }
    });

    function appendMessage(sender, text) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);
        messageDiv.textContent = text;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return messageDiv; // Return reference to update later if needed
    }
});