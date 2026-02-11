/**
 * 100Solutionz AI Assistant
 * Core logic for chatbot interface and Gemini API integration
 */

const Chatbot = {
    isOpen: false,
    isTyping: false,
    messages: [],

    init() {
        this.injectHTML();
        this.cacheDOM();
        this.bindEvents();
        this.addWelcomeMessage();
    },

    injectHTML() {
        const html = `
            <div class="chatbot-wrapper">
                <button id="chat-toggle" aria-label="Open Chat">
                    <i class="fas fa-comment-dots"></i>
                </button>
                <div class="chat-container">
                    <div class="chat-header">
                        <div class="chat-header-info">
                            <div class="bot-avatar">
                                <i class="fas fa-robot"></i>
                            </div>
                            <div class="chat-header-text">
                                <h4>100Solutionz AI Assistant</h4>
                                <p>Powered by Gemini AI</p>
                            </div>
                        </div>
                        <button id="close-chat"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="chat-messages" id="chat-messages"></div>
                    <div class="chat-input-area">
                        <div class="chat-input-wrapper">
                            <input type="text" id="chat-input" placeholder="Ask me anything..." autocomplete="off">
                            <button id="send-message"><i class="fas fa-paper-plane"></i></button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    },

    cacheDOM() {
        this.toggleBtn = document.getElementById('chat-toggle');
        this.container = document.querySelector('.chat-container');
        this.closeBtn = document.getElementById('close-chat');
        this.messagesContainer = document.getElementById('chat-messages');
        this.input = document.getElementById('chat-input');
        this.sendBtn = document.getElementById('send-message');
    },

    bindEvents() {
        this.toggleBtn.addEventListener('click', () => this.toggleChat());
        this.closeBtn.addEventListener('click', () => this.toggleChat(false));
        this.sendBtn.addEventListener('click', () => this.handleSendMessage());
        this.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSendMessage();
        });
    },

    toggleChat(force) {
        this.isOpen = force !== undefined ? force : !this.isOpen;
        this.container.classList.toggle('active', this.isOpen);
        this.toggleBtn.style.display = this.isOpen ? 'none' : 'flex';
        if (this.isOpen) this.input.focus();
    },

    addWelcomeMessage() {
        this.addMessage('bot', "Hello! I'm the 100Solutionz AI Assistant. How can I help you today? I can tell you about our services in AI Chatbots, Model Training, and Digital Innovation.", true);
    },

    addMessage(sender, text, skipHistory = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        messageDiv.innerText = text;
        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();

        // Save to history for context (Gemini expects user-first sequence)
        if (!skipHistory) {
            this.messages.push({ role: sender === 'bot' ? 'model' : 'user', parts: [{ text }] });
        }
    },

    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    },

    toggleTyping(show) {
        this.isTyping = show;
        if (show) {
            const typingDiv = document.createElement('div');
            typingDiv.className = 'message bot-message typing-msg';
            typingDiv.innerHTML = `
                <div class="typing-indicator">
                    <span></span><span></span><span></span>
                </div>
            `;
            this.messagesContainer.appendChild(typingDiv);
        } else {
            const typingMsg = this.messagesContainer.querySelector('.typing-msg');
            if (typingMsg) typingMsg.remove();
        }
        this.scrollToBottom();
    },

    async handleSendMessage() {
        const text = this.input.value.trim();
        if (!text || this.isTyping) return;

        this.input.value = '';
        this.addMessage('user', text);

        await this.getAIResponse(text);
    },

    async getAIResponse(userText) {
        if (!CONFIG.GEMINI_API_KEY || CONFIG.GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
            setTimeout(() => {
                this.addMessage('bot', "I'm currently in 'UI mode' because the API key isn't set yet. Please add your Gemini API key to config.js to enable my AI brain!", true);
            }, 1000);
            return;
        }

        this.toggleTyping(true);

        try {
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${CONFIG.GEMINI_API_KEY}`;

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: this.messages,
                    system_instruction: {
                        parts: [{ text: "You are the 100Solutionz AI Assistant. You are professional, helpful, and knowledgeable about 100Solutionz services: AI Chatbots, AI Model Training, and Digital Marketing/Innovation. 100Solutionz helps brands future-proof their business. Keep responses concise and friendly." }]
                    }
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error?.message || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.toggleTyping(false);

            if (data.candidates && data.candidates[0].content.parts[0].text) {
                const botResponse = data.candidates[0].content.parts[0].text;
                this.addMessage('bot', botResponse);
            } else {
                throw new Error('Invalid response from AI');
            }
        } catch (error) {
            console.error('AI Error:', error);
            this.toggleTyping(false);
            this.addMessage('bot', `Sorry, I'm having trouble connecting to my AI brain. Error: ${error.message}`);
        }
    }
};

// Initialize chatbot when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    Chatbot.init();
});
