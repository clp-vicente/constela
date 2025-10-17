document.addEventListener('DOMContentLoaded', () => {

    const promptInput = document.getElementById('prompt-input');
    const sendButton = document.getElementById('send-button');
    const chatMessages = document.getElementById('chat-messages');
    const sidebar = document.getElementById('sidebar');
    const sidebarToggleButton = document.getElementById('sidebar-toggle-button');
    const newChatButton = document.getElementById('new-chat-button');
    const historyList = document.getElementById('history-list');
    const themeSelector = document.getElementById('theme-selector');
    const modelFlashRadio = document.getElementById('model-flash');
    const modelProRadio = document.getElementById('model-pro');
    const contextMenu = document.getElementById('context-menu');
    const renameChatButton = document.getElementById('rename-chat-button');
    const deleteChatButton = document.getElementById('delete-chat-button');
    const renameModalOverlay = document.getElementById('rename-modal-overlay');
    const renameInput = document.getElementById('rename-input');
    const confirmRenameButton = document.getElementById('confirm-rename-button');
    const cancelRenameButton = document.getElementById('cancel-rename-button');
    const deleteModalOverlay = document.getElementById('delete-modal-overlay');
    const confirmDeleteButton = document.getElementById('confirm-delete-button');
    const cancelDeleteButton = document.getElementById('cancel-delete-button');
    const attachFileButton = document.getElementById('attach-file-button');
    const attachmentPreview = document.getElementById('attachment-preview');
    

    let currentChatId = null;
    let conversationHistory = [];
    let contextMenuChatId = null;
    let contextMenuChatTitle = null;
    let attachedFilePath = null;
    let paperclipSVG = null;

    paperclipSVG = window.electronAPI.loadSVG('paperclip.svg');
    sidebarToggleButton.innerHTML = window.electronAPI.loadSVG('hamburger-icon.svg');
    sendButton.innerHTML = window.electronAPI.loadSVG('send-icon.svg');
    attachFileButton.innerHTML = paperclipSVG;


    function setInputEnabled(enabled) {
        promptInput.disabled = !enabled;
        sendButton.disabled = !enabled;
        promptInput.placeholder = enabled ? "Escribe tu mensaje aquí..." : "Generando respuesta...";
    }

    function addMessage(text, sender, save = true, attachment = null) {
        if (save) {
            const role = sender === 'user' ? 'user' : 'model';
            const newPart = { role, parts: [] };

            if (text) {
                newPart.parts.push({ text });
            }
            if (attachment) {
                newPart.parts.push({ file: attachment });
            }
            
            if (newPart.parts.length > 0) {
                conversationHistory.push(newPart);
            }
        }

        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender);
        const bubbleDiv = document.createElement('div');
        bubbleDiv.classList.add('message-bubble');

        if (attachment && attachment.name) {
            const attachmentDiv = document.createElement('div');
            attachmentDiv.className = 'message-attachment';
            const iconSpan = document.createElement('span');
            iconSpan.innerHTML = paperclipSVG;
            const nameSpan = document.createElement('span');
            nameSpan.innerText = attachment.name;
            attachmentDiv.appendChild(iconSpan);
            attachmentDiv.appendChild(nameSpan);
            bubbleDiv.appendChild(attachmentDiv);
        }

        if (text) {
            const parseInlineMarkdown = (str) => {
                let safeStr = str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
                safeStr = safeStr.replace(/\n/g, '<br>');
                safeStr = safeStr.replace(/^### (.*$)/gm, '<h3>$1</h3>');
                safeStr = safeStr.replace(/^## (.*$)/gm, '<h2>$1</h2>');
                safeStr = safeStr.replace(/^# (.*$)/gm, '<h1>$1</h1>');
                safeStr = safeStr.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
                safeStr = safeStr.replace(/__(.*?)__/g, '<u>$1</u>');
                safeStr = safeStr.replace(/\*(.*?)\*/g, '<i>$1</i>');
                return safeStr;
            };

            const codeBlockRegex = /```(\w*)\n([\s\S]*?)\n```/g;
            let lastIndex = 0;
            let match;

            while ((match = codeBlockRegex.exec(text)) !== null) {
                if (match.index > lastIndex) {
                    const p = document.createElement('div');
                    p.innerHTML = parseInlineMarkdown(text.substring(lastIndex, match.index));
                    bubbleDiv.appendChild(p);
                }
                const lang = match[1] || 'plaintext';
                const code = match[2];
                const pre = document.createElement('pre');
                const codeEl = document.createElement('code');
                codeEl.className = `language-${lang}`;
                codeEl.textContent = code;
                pre.appendChild(codeEl);
                bubbleDiv.appendChild(pre);
                lastIndex = codeBlockRegex.lastIndex;
            }

            if (lastIndex < text.length) {
                const p = document.createElement('div');
                p.innerHTML = parseInlineMarkdown(text.substring(lastIndex));
                bubbleDiv.appendChild(p);
            }
        }
        
        messageDiv.appendChild(bubbleDiv);
        chatMessages.appendChild(messageDiv);
        
        bubbleDiv.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });

        chatMessages.scrollTop = chatMessages.scrollHeight;

        if (save && sender === 'gemini') {
            const isNewChat = !currentChatId;
            currentChatId = window.electronAPI.saveChat({ id: currentChatId, history: conversationHistory });
            if (isNewChat) {
                loadHistoryList();
            }
        }
    }

    function createTypingIndicator() {
        if (document.getElementById('typing-indicator')) return;
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', 'gemini');
        messageDiv.id = 'typing-indicator';
        const bubbleDiv = document.createElement('div');
        bubbleDiv.classList.add('message-bubble');
        const dotsContainer = document.createElement('div');
        dotsContainer.classList.add('typing-dots');
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('span');
            dot.classList.add('typing-dot');
            dotsContainer.appendChild(dot);
        }
        bubbleDiv.appendChild(dotsContainer);
        messageDiv.appendChild(bubbleDiv);
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function sendMessage() {
        const prompt = promptInput.value;
        if (!prompt.trim() && !attachedFilePath) return;

        const attachmentInfo = attachedFilePath ? {
            name: attachmentPreview.innerText,
            path: attachedFilePath
        } : null;

        if (prompt.trim()) {
            addMessage(prompt, 'user', true, attachmentInfo);
        } else if (attachmentInfo) {
            addMessage("", 'user', true, attachmentInfo);
        }
        
        createTypingIndicator();
        setInputEnabled(false);
        window.electronAPI.sendPrompt({ prompt, filePath: attachedFilePath });
        
        promptInput.value = '';
        attachmentPreview.classList.add('hidden');
        attachmentPreview.innerText = '';
        attachedFilePath = null;
    }

    function startNewChat() {
        renameModalOverlay.classList.add('hidden');
        deleteModalOverlay.classList.add('hidden');
        chatMessages.innerHTML = '';
        conversationHistory = [];
        currentChatId = null;
        window.electronAPI.startNewChat(); 
        addMessage("Hola! ¿En qué puedo ayudarte hoy?", 'gemini', false);
        loadHistoryList();
        setTimeout(() => {
            setInputEnabled(true);
            promptInput.focus();
        }, 50);
    }

    function loadHistoryList() {
        historyList.innerHTML = '';
        const historyFiles = window.electronAPI.getChatHistory();
        historyFiles.forEach(file => {
            const button = document.createElement('button');
            button.innerText = file.title;
            button.className = 'history-item-button';
            if (file.id === currentChatId) {
                button.classList.add('active');
            }
            button.onclick = () => loadSpecificChat(file.id);
            button.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                showContextMenu(e.pageX, e.pageY, file.id, file.title);
            });
            historyList.appendChild(button);
        });
    }

    function loadSpecificChat(chatId) {
        const loadedHistory = window.electronAPI.loadChat(chatId);
        if (loadedHistory) {
            currentChatId = chatId;
            conversationHistory = loadedHistory;
            chatMessages.innerHTML = '';

            loadedHistory.forEach(message => {
                const sender = message.role === 'user' ? 'user' : 'gemini';
                let textContent = null;
                let attachmentInfo = null;
                
                if (message.parts) {
                    for (const part of message.parts) {
                        if (part.text) { textContent = part.text; }
                        if (part.file) { attachmentInfo = part.file; }
                    }
                }
                addMessage(textContent || "", sender, false, attachmentInfo);
            });

            window.electronAPI.loadHistoryContext(loadedHistory);
            setInputEnabled(true);
            promptInput.focus();
            loadHistoryList();
        }
    }

    function showContextMenu(x, y, chatId, chatTitle) {
        contextMenuChatId = chatId;
        contextMenuChatTitle = chatTitle;
        contextMenu.style.left = `${x}px`;
        contextMenu.style.top = `${y}px`;
        contextMenu.classList.remove('hidden');
    }

    function hideContextMenu() {
        contextMenu.classList.add('hidden');
    }

    function deleteChat() {
        if (!contextMenuChatId) return;
        deleteModalOverlay.classList.remove('hidden');
        hideContextMenu();
    }
    
    async function handleConfirmDelete() {
        const idToDelete = contextMenuChatId;
        if (!idToDelete) return;
        const result = await window.electronAPI.deleteChat(idToDelete);
        if (result.success) {
            if (currentChatId === idToDelete) {
                startNewChat();
            }
            loadHistoryList();
        } else {
            alert(`Error al eliminar el chat: ${result.error}`);
        }
        deleteModalOverlay.classList.add('hidden');
    }

    function handleCancelDelete() {
        deleteModalOverlay.classList.add('hidden');
    }

    function renameChat() {
        if (!contextMenuChatId) return;
        renameInput.value = contextMenuChatTitle;
        renameModalOverlay.classList.remove('hidden');
        renameInput.focus();
        renameInput.select();
        hideContextMenu();
    }

    async function handleConfirmRename() {
        const newTitle = renameInput.value;
        if (newTitle && newTitle.trim() !== "" && newTitle.trim() !== contextMenuChatTitle) {
            const result = await window.electronAPI.renameChat({ oldId: contextMenuChatId, newTitle: newTitle.trim() });
            if (result.success) {
                if (currentChatId === contextMenuChatId) {
                    currentChatId = result.newId;
                }
                loadHistoryList();
            } else {
                alert(`Error al renombrar el chat: ${result.error}`);
            }
        }
        renameModalOverlay.classList.add('hidden');
    }

    function handleCancelRename() {
        renameModalOverlay.classList.add('hidden');
    }

    async function handleAttachFile() {
        const filePath = await window.electronAPI.dialogOpenFile();
        if (filePath) {
            attachedFilePath = filePath;
            const fileName = filePath.split('\\').pop().split('/').pop();
            attachmentPreview.innerText = fileName;
            attachmentPreview.classList.remove('hidden');
            promptInput.focus();
        }
    }

    const savedTheme = localStorage.getItem('theme') || 'light';
    const savedModel = localStorage.getItem('model') || 'gemini-2.5-flash';
    
    if (savedModel === 'gemini-2.5-pro') {
        modelProRadio.checked = true;
    } else {
        modelFlashRadio.checked = true;
    }

    function applyTheme(theme) {
        document.body.classList.remove('dark-mode', 'rose-mode');
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
        } else if (theme === 'rose') {
            document.body.classList.add('rose-mode');
        }
        themeSelector.value = theme;
        localStorage.setItem('theme', theme);
    }
    
    applyTheme(savedTheme);

    function handleModelChange() {
        const newModel = modelProRadio.checked ? modelProRadio.value : modelFlashRadio.value;
        const currentModel = localStorage.getItem('model') || 'gemini-2.5-flash';
        if (newModel !== currentModel) {
            localStorage.setItem('model', newModel);
            window.electronAPI.restartWithSettings();
        }
    }

    sidebarToggleButton.addEventListener('click', () => sidebar.classList.toggle('closed'));
    newChatButton.addEventListener('click', startNewChat);
    attachFileButton.addEventListener('click', handleAttachFile);
    themeSelector.addEventListener('change', () => applyTheme(themeSelector.value));
    modelFlashRadio.addEventListener('change', handleModelChange);
    modelProRadio.addEventListener('change', handleModelChange);
    sendButton.addEventListener('click', sendMessage);
    promptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    renameChatButton.addEventListener('click', renameChat);
    deleteChatButton.addEventListener('click', deleteChat);
    confirmRenameButton.addEventListener('click', handleConfirmRename);
    cancelRenameButton.addEventListener('click', handleCancelRename);
    confirmDeleteButton.addEventListener('click', handleConfirmDelete);
    cancelDeleteButton.addEventListener('click', handleCancelDelete);
    renameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleConfirmRename();
        if (e.key === 'Escape') handleCancelRename();
    });
    window.addEventListener('click', (e) => {
        if (!contextMenu.contains(e.target)) {
            hideContextMenu();
        }
    });

    window.electronAPI.onBackendStatus((status) => {
        if (status === 'ready') {
            setInputEnabled(true);
            promptInput.focus();
        } else {
            setInputEnabled(false);
            promptInput.placeholder = "Iniciando backend, por favor espera...";
        }
    });

    window.electronAPI.onResponse((data) => {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
        setInputEnabled(true);
        try {
            const response = JSON.parse(data);
            if (response.text) {
                addMessage(response.text, 'gemini');
            } else if (response.error) {
                addMessage(`Error: ${response.error}`, 'gemini', false);
            }
        } catch (e) {
            console.error("Dato inválido o corrupto recibido del backend: ", data);
        }
    });

    loadHistoryList();
    startNewChat();
    window.electronAPI.sendRendererReady({ model: savedModel });
});