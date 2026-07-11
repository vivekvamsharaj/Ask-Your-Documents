document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const browseBtn = document.getElementById('browseBtn');
    const fileList = document.getElementById('fileList');
    const chatForm = document.getElementById('chatForm');
    const userInput = document.getElementById('userInput');
    const chatMessages = document.getElementById('chatMessages');

    // API URL configurations (Point to your Python backend process)
    const BACKEND_URL = 'http://127.0.0.1:8000'; 

    // --- File Upload UI Interactions ---
    browseBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', handleFileSelect);

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            uploadFiles(e.dataTransfer.files);
        }
    });

    function handleFileSelect(e) {
        if (e.target.files.length > 0) {
            uploadFiles(e.target.files);
        }
    }

    // --- Dynamic DOM Alteration functions ---
    function uploadFiles(files) {
        for (let file of files) {
            // Append file to sidebar list UI
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `<span>📄 ${file.name}</span> <small style="color: #10b981;">Processing...</small>`;
            fileList.appendChild(fileItem);

            // Construct multipart form payload for API ingestion
            const formData = new FormData();
            formData.append('file', file);

            // Simulate or hit backend endpoint
            fetch(`${BACKEND_URL}/upload`, {
                method: 'POST',
                body: formData
            })
            .then(res => res.json())
            .then(data => {
                fileItem.querySelector('small').textContent = 'Ready';
                fileItem.querySelector('small').style.color = '#3b82f6';
            })
            .catch(err => {
                fileItem.querySelector('small').textContent = 'Error';
                fileItem.querySelector('small').style.color = '#ef4444';
                console.error('Upload Error:', err);
            });
        }
    }

    function appendMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        messageDiv.textContent = text;
        chatMessages.appendChild(messageDiv);
        
        // Auto-scroll to the newest message
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // --- Chat Submission Handling ---
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const query = userInput.value.trim();
        if (!query) return;

        // Display user input text
        appendMessage(query, 'user');
        userInput.value = '';

        // Display typing state placeholder
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'message ai-message';
        typingIndicator.textContent = 'Thinking...';
        chatMessages.appendChild(typingIndicator);

        try {
            // Hit backend RAG pipeline API
            const response = await fetch(`${BACKEND_URL}/query`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: query })
            });
            const data = await response.json();
            
            // Remove typing placeholder and render real response
            chatMessages.removeChild(typingIndicator);
            appendMessage(data.answer || "Sorry, I couldn't process that query.", 'ai');
        } catch (error) {
            chatMessages.removeChild(typingIndicator);
            appendMessage("Failed to reach server. Please ensure the backend server is running.", 'ai');
            console.error('Query Error:', error);
        }
    });
});