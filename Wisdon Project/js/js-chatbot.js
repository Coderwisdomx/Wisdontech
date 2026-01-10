// Wisdon Chatbot (visitor client)
class WisdonChatbot {
    constructor() {
        this.isOpen = false;
        this.messages = [];
        this.visitorId = null;
        this.serverUrl = 'http://localhost:3000'; // change when deployed
        this.pollingId = null;
        this.lastSeenAt = null; // ISO timestamp of last viewed admin message
        this.init();
    }

    init() {
        this.createChatbotWidget();
        this.attachEventListeners();
        this.getOrCreateVisitor();
    }

    async getOrCreateVisitor() {
        let visitorId = localStorage.getItem('wisdon_visitor_id');
        if (!visitorId) {
            visitorId = 'visitor_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('wisdon_visitor_id', visitorId);
        }
        this.visitorId = visitorId;

        // load last-seen timestamp for this visitor
        this.lastSeenAt = localStorage.getItem('wisdon_last_seen_' + this.visitorId) || null;

        // Ensure a conversation exists on the server (safe to call)
        try {
            await fetch(`${this.serverUrl}/api/visitor`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ visitorId: this.visitorId })
            });
        } catch (e) {
            // offline or server not reachable
            console.warn('Could not initialize visitor on server:', e.message);
        }

        await this.loadMessagesFromServer();
    }

    async loadMessagesFromServer() {
        try {
            const res = await fetch(`${this.serverUrl}/api/messages/${this.visitorId}`);
            if (res.ok) {
                const data = await res.json();
                this.messages = data.messages || [];
                this.displayMessagesInChat();
            } else if (res.status === 404) {
                // create conversation then continue
                await fetch(`${this.serverUrl}/api/visitor`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ visitorId: this.visitorId })
                });
                this.messages = [];
                this.displayMessagesInChat();
            }
        } catch (err) {
            // server not reachable - keep existing messages (local mode)
            console.warn('Server not reachable:', err.message);
            this.displayMessagesInChat();
        }
    }

    displayMessagesInChat() {
        const messagesDiv = document.getElementById('chatbot-messages');
        if (!messagesDiv) return;
        messagesDiv.innerHTML = '';

        this.messages.forEach(msg => {
            const msgEl = document.createElement('div');
            msgEl.className = `chatbot-message ${msg.sender === 'visitor' ? 'user-message' : 'bot-message'}`;
            
            // Create message content wrapper
            const contentWrapper = document.createElement('div');
            contentWrapper.className = 'message-content';
            contentWrapper.innerHTML = msg.message;
            msgEl.appendChild(contentWrapper);
            
            // Add timestamp
            if (msg.timestamp) {
                const timeEl = document.createElement('span');
                timeEl.className = 'message-time';
                timeEl.textContent = this.formatTime(msg.timestamp);
                msgEl.appendChild(timeEl);
            }
            
            // Add status badge for visitor messages
            if (msg.sender === 'visitor') {
                const statusBadge = document.createElement('span');
                statusBadge.className = `message-status status-${msg.status || 'sent'}`;
                statusBadge.textContent = this.getStatusText(msg.status || 'sent');
                msgEl.appendChild(statusBadge);
                msgEl.setAttribute('data-msg-id', msg.id);
            }
            
            messagesDiv.appendChild(msgEl);
        });

        messagesDiv.scrollTop = messagesDiv.scrollHeight;

        // update unread admin reply badge
        this.updateBadge();
    }

    createChatbotWidget() {
        const chatbotHTML = `
            <div id="wisdon-chatbot" class="chatbot-container">
                <div class="chatbot-header">
                    <div class="chatbot-title"><i class="fas fa-headset chatbot-avatar"></i> Wisdon Assistant <span class="online-indicator"></span></div>
                    <button class="chatbot-close" id="chatbot-close"><i class="fas fa-times"></i></button>
                </div>
                <div class="chatbot-messages" id="chatbot-messages"></div>
                <div class="chatbot-input-area">
                    <input type="text" id="chatbot-input" class="chatbot-input" placeholder="Ask me anything..." autocomplete="off">
                    <input type="file" id="chatbot-file-input" class="chatbot-file-input" style="display:none;" accept="image/*,.pdf,.doc,.docx,.txt">
                    <button class="chatbot-file-btn" id="chatbot-file-btn" title="Upload file"><i class="fas fa-paperclip"></i></button>
                    <button class="chatbot-send" id="chatbot-send"><i class="fas fa-paper-plane"></i></button>
                </div>
                <div id="chatbot-file-preview" class="chatbot-file-preview"></div>
            </div>
            <button id="chatbot-toggle" class="chatbot-toggle" title="Chat with Wisdon"><i class="fas fa-comment-dots"></i><span class="chatbot-badge"></span></button>
        `;
        document.body.insertAdjacentHTML('beforeend', chatbotHTML);
    }

    attachEventListeners() {
        const toggle = document.getElementById('chatbot-toggle');
        const closeBtn = document.getElementById('chatbot-close');
        const sendBtn = document.getElementById('chatbot-send');
        const input = document.getElementById('chatbot-input');
        const fileBtn = document.getElementById('chatbot-file-btn');
        const fileInput = document.getElementById('chatbot-file-input');
        const header = document.querySelector('.chatbot-header');
        const container = document.getElementById('wisdon-chatbot');

        if (toggle) toggle.addEventListener('click', () => this.toggleChat());
        if (closeBtn) closeBtn.addEventListener('click', () => this.toggleChat());
        if (sendBtn) sendBtn.addEventListener('click', () => this.sendMessage());
        if (input) input.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.sendMessage(); });
        if (fileBtn) fileBtn.addEventListener('click', () => fileInput.click());
        if (fileInput) fileInput.addEventListener('change', (e) => this.handleFileUpload(e));

        // Add drag functionality
        if (header && container) {
            this.makeDraggable(container, header);
        }
    }

    makeDraggable(element, handle) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

        const dragMouseDown = (e) => {
            // Don't drag if clicking close button or other buttons
            if (e.target.closest('.chatbot-close')) return;
            
            pos3 = e.clientX || (e.touches && e.touches[0].clientX);
            pos4 = e.clientY || (e.touches && e.touches[0].clientY);
            
            element.classList.add('dragging');
            
            const dragMouseMove = (e) => {
                pos1 = pos3 - (e.clientX || (e.touches && e.touches[0].clientX));
                pos2 = pos4 - (e.clientY || (e.touches && e.touches[0].clientY));
                pos3 = e.clientX || (e.touches && e.touches[0].clientX);
                pos4 = e.clientY || (e.touches && e.touches[0].clientY);

                let newTop = element.offsetTop - pos2;
                let newLeft = element.offsetLeft - pos1;

                // Keep chatbot within viewport
                const maxTop = window.innerHeight - element.offsetHeight - 10;
                const maxLeft = window.innerWidth - element.offsetWidth - 10;

                newTop = Math.max(10, Math.min(newTop, maxTop));
                newLeft = Math.max(10, Math.min(newLeft, maxLeft));

                element.style.bottom = 'auto';
                element.style.right = 'auto';
                element.style.top = newTop + 'px';
                element.style.left = newLeft + 'px';
            };

            const dragMouseUp = () => {
                document.removeEventListener('mousemove', dragMouseMove, false);
                document.removeEventListener('touchmove', dragMouseMove, false);
                document.removeEventListener('mouseup', dragMouseUp, false);
                document.removeEventListener('touchend', dragMouseUp, false);
                element.classList.remove('dragging');
            };

            document.addEventListener('mousemove', dragMouseMove, false);
            document.addEventListener('touchmove', dragMouseMove, false);
            document.addEventListener('mouseup', dragMouseUp, false);
            document.addEventListener('touchend', dragMouseUp, false);
        };

        handle.addEventListener('mousedown', dragMouseDown, false);
        handle.addEventListener('touchstart', dragMouseDown, false);
    }

    toggleChat() {
        const container = document.getElementById('wisdon-chatbot');
        const toggle = document.getElementById('chatbot-toggle');
        if (!container || !toggle) return;
        this.isOpen = !this.isOpen;
        container.classList.toggle('active');
        toggle.classList.toggle('active');

        if (this.isOpen && this.messages.length === 0) {
            this.addBotMessage("👋 Hello! I'm Wisdon's Customer Assistant. How can I help you today?");
        }

        // If opening chat, mark admin messages as seen
        if (this.isOpen) {
            this.lastSeenAt = new Date().toISOString();
            localStorage.setItem('wisdon_last_seen_' + this.visitorId, this.lastSeenAt);
            this.updateBadge();
        }
    }

    async sendMessage() {
        const input = document.getElementById('chatbot-input');
        if (!input) return;
        const message = input.value.trim();
        if (!message) return;

        // display immediately
        this.displayMessage(message, 'visitor');
        input.value = '';

        // try to send to server
        try {
            await fetch(`${this.serverUrl}/api/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ visitorId: this.visitorId, message })
            });
            this.showAdminNotification();
            this.startPolling();
        } catch (err) {
            console.warn('Could not send message to server:', err.message);
            this.showAdminNotification();
        }
    }

    displayMessage(text, sender) {
        const messagesDiv = document.getElementById('chatbot-messages');
        if (!messagesDiv) return;
        const msgEl = document.createElement('div');
        msgEl.className = `chatbot-message ${sender === 'visitor' ? 'user-message' : 'bot-message'}`;
        
        // Create message content wrapper
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'message-content';
        contentWrapper.innerHTML = text;
        msgEl.appendChild(contentWrapper);
        
        // Add timestamp
        const timeEl = document.createElement('span');
        timeEl.className = 'message-time';
        timeEl.textContent = this.formatTime(new Date().toISOString());
        msgEl.appendChild(timeEl);
        
        // Add status badge for visitor messages
        if (sender === 'visitor') {
            const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            const statusBadge = document.createElement('span');
            statusBadge.className = 'message-status status-active';
            statusBadge.textContent = 'Active';
            msgEl.appendChild(statusBadge);
            msgEl.setAttribute('data-msg-id', msgId);
        }
        
        messagesDiv.appendChild(msgEl);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;

        // keep local state in sync
        const msgObj = { sender, message: text, timestamp: new Date().toISOString() };
        if (sender === 'visitor') {
            msgObj.status = 'active';
            msgObj.id = msgEl.getAttribute('data-msg-id');
        }
        this.messages.push(msgObj);
    }

    showAdminNotification() {
        const messagesDiv = document.getElementById('chatbot-messages');
        if (!messagesDiv) return;
        const notifEl = document.createElement('div');
        notifEl.className = 'chatbot-message bot-message notification';
        notifEl.innerHTML = '⏳ <em>Thank you! Our team will respond shortly.</em>';
        messagesDiv.appendChild(notifEl);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    // Update the small badge on the chat toggle when there are unread admin replies
    updateBadge() {
        const badge = document.querySelector('.chatbot-badge');
        if (!badge) return;

        // detect if there is at least one admin message newer than lastSeenAt
        const hasUnread = this.messages.some(m => m.sender === 'admin' && (!this.lastSeenAt || new Date(m.timestamp) > new Date(this.lastSeenAt)));
        if (hasUnread) {
            badge.textContent = '1';
            badge.style.display = 'flex';
        } else {
            badge.textContent = '';
            badge.style.display = 'none';
        }
    }

    startPolling() {
        if (this.pollingId) return;
        this.pollingId = setInterval(() => this.loadMessagesFromServer(), 5000);
    }

    addBotMessage(text) {
        this.displayMessage(text, 'admin');
    }

    stopPolling() {
        if (this.pollingId) {
            clearInterval(this.pollingId);
            this.pollingId = null;
        }
    }

    getStatusText(status) {
        const statuses = {
            'active': 'Active',
            'sent': 'Sent',
            'read': 'Read'
        };
        return statuses[status] || 'Sent';
    }

    updateMessageStatus(msgId, newStatus) {
        // Update DOM
        const msgEl = document.querySelector(`[data-msg-id="${msgId}"]`);
        if (msgEl) {
            const badge = msgEl.querySelector('.message-status');
            if (badge) {
                badge.className = `message-status status-${newStatus}`;
                badge.textContent = this.getStatusText(newStatus);
            }
        }
        
        // Update local state
        const msg = this.messages.find(m => m.id === msgId);
        if (msg) {
            msg.status = newStatus;
        }
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Store file temporarily
        this.selectedFile = file;

        // Show file preview
        const preview = document.getElementById('chatbot-file-preview');
        if (preview) {
            preview.innerHTML = `<span>📎 ${file.name} (${(file.size / 1024).toFixed(2)} KB)</span>`;
        }

        // Clear input for next selection
        event.target.value = '';
    }

    async sendMessage() {
        const input = document.getElementById('chatbot-input');
        if (!input) return;
        const message = input.value.trim();
        const file = this.selectedFile;

        if (!message && !file) return;

        // For text messages
        if (message) {
            this.displayMessage(message, 'visitor');
            input.value = '';
            const msgElements = document.querySelectorAll('.chatbot-message.user-message');
            const lastMsgEl = msgElements[msgElements.length - 1];
            const msgId = lastMsgEl ? lastMsgEl.getAttribute('data-msg-id') : null;

            try {
                const res = await fetch(`${this.serverUrl}/api/messages`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ visitorId: this.visitorId, message })
                });
                
                // Update status to 'sent' when server confirms
                if (res.ok && msgId) {
                    this.updateMessageStatus(msgId, 'sent');
                }
                
                this.showAdminNotification();
                this.startPolling();
            } catch (err) {
                console.warn('Could not send message to server:', err.message);
                this.showAdminNotification();
            }
        }

        // For file uploads
        if (file) {
            await this.uploadFile(file);
            const preview = document.getElementById('chatbot-file-preview');
            if (preview) preview.innerHTML = '';
            this.selectedFile = null;
        }
    }

    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('visitorId', this.visitorId);

        try {
            // Display file as sent message
            this.displayMessage(`📎 Uploaded: ${file.name}`, 'visitor');

            const response = await fetch(`${this.serverUrl}/api/upload`, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                this.showAdminNotification();
                this.startPolling();
            } else {
                this.displayMessage('❌ File upload failed. Please try again.', 'admin');
            }
        } catch (err) {
            console.warn('Could not upload file to server:', err.message);
            this.displayMessage('❌ Could not upload file. Please check your connection.', 'admin');
        }
    }

    formatTime(isoString) {
        const date = new Date(isoString);
        const today = new Date();
        const isToday = date.toDateString() === today.toDateString();

        if (isToday) {
            return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        } else {
            return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
        }
    }
}

// Initialize chatbot when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    new WisdonChatbot();
});
