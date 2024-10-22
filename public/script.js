document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const chatMessages = document.getElementById('chat-messages');
    const sendButton = document.getElementById('send-button');

    const settingsButton = document.getElementById('settings-button');
    const settingsModal = document.getElementById('settings-modal');
    const closeModalButton = document.getElementById('close-modal');
    const themeSelect = document.getElementById('theme-select');

    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    themeSelect.value = savedTheme;

    // Function to set the theme
    function setTheme(theme) {
        document.body.classList.remove('light', 'dark');
        if (theme === 'light') {
            // Default theme, no class needed
        } else if (theme === 'dark') {
            document.body.classList.add('dark');
        }
        localStorage.setItem('theme', theme);
    }

    // Open settings modal
    settingsButton.addEventListener('click', () => {
        settingsModal.style.display = 'flex';
        settingsModal.setAttribute('aria-hidden', 'false');
    });

    // Close settings modal
    closeModalButton.addEventListener('click', () => {
        settingsModal.style.display = 'none';
        settingsModal.setAttribute('aria-hidden', 'true');
    });

    // Close modal when clicking outside the content
    window.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            settingsModal.style.display = 'none';
            settingsModal.setAttribute('aria-hidden', 'true');
        }
    });

    // Change theme
    themeSelect.addEventListener('change', (e) => {
        setTheme(e.target.value);
    });

    /**
     * Function to add messages.
     * - User messages appear immediately.
     * - AI messages are displayed with a typing animation.
     * - Code blocks are highlighted after rendering.
     *
     * @param {string} message - The message to be added.
     * @param {string} sender - 'user' or 'bot'.
     * @param {boolean} isImage - Indicates if the message is an image.
     * @param {boolean} replaceLast - Indicates if the last message should be replaced.
     */
    const appendMessage = (message, sender, isImage = false, replaceLast = false) => {
        let messageElement;
        if (replaceLast) {
            const lastMessage = chatMessages.lastElementChild;
            if (lastMessage && lastMessage.classList.contains('message') && lastMessage.classList.contains('bot')) {
                messageElement = lastMessage;
                messageElement.innerHTML = '';
                messageElement.classList.remove('bot');
                messageElement.classList.add(sender);
            }
        }

        if (!messageElement) {
            messageElement = document.createElement('div');
            messageElement.classList.add('message', sender);
        }

        const messageContent = document.createElement('div');
        messageContent.classList.add('message-content');

        if (isImage) {
            const img = document.createElement('img');
            img.src = message;
            img.alt = 'AI generated image';
            img.classList.add('chat-image');
            messageContent.appendChild(img);
        } else {
            if (sender === 'user') {
                // Display user messages immediately
                const rawHtml = marked.parse(message);
                const sanitizedHtml = DOMPurify.sanitize(rawHtml);
                messageContent.innerHTML = sanitizedHtml;
                messageElement.appendChild(messageContent);
                chatMessages.appendChild(messageElement);
                chatMessages.scrollTop = chatMessages.scrollHeight;
            } else if (sender === 'bot') {
                // Display AI messages with typing animation
                // Replace colons at the beginning of lines with hyphens
                const fixedMessage = message.replace(/^:\s/gm, '- ');

                // Convert Markdown to HTML
                const rawHtml = marked.parse(fixedMessage);

                // Sanitize HTML with DOMPurify
                const sanitizedHtml = DOMPurify.sanitize(rawHtml);

                // Start typing animation
                typeText(sanitizedHtml, messageContent, 30)
                    .then(() => {
                        // Apply Highlight.js after animation completes
                        hljs.highlightAll();
                    });

                messageElement.appendChild(messageContent);
                chatMessages.appendChild(messageElement);
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
        }

        if (isImage && sender === 'bot') {
            messageElement.appendChild(messageContent);
            chatMessages.appendChild(messageElement);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    };

    /**
     * Function for line-by-line typing animation.
     *
     * @param {string} htmlContent - The HTML content to be animated.
     * @param {HTMLElement} container - The container element where the content will be displayed.
     * @param {number} delay - Delay in milliseconds between characters.
     * @returns {Promise} - A promise that resolves when the animation is complete.
     */
    const typeText = (htmlContent, container, delay) => {
        return new Promise((resolve) => {
            // Temporary element for parsed HTML
            const tempElement = document.createElement('div');
            tempElement.innerHTML = htmlContent;

            // Clear container
            container.innerHTML = '';

            const lines = Array.from(tempElement.childNodes).filter(node => node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE);

            let currentLine = 0;

            const typeLine = () => {
                if (currentLine >= lines.length) {
                    resolve();
                    return;
                }

                const node = lines[currentLine];
                if (node.nodeType === Node.TEXT_NODE) {
                    const text = node.textContent;
                    const span = document.createElement('span');
                    container.appendChild(span);
                    let index = 0;

                    const interval = setInterval(() => {
                        span.textContent += text[index];
                        index++;
                        if (index >= text.length) {
                            clearInterval(interval);
                            currentLine++;
                            typeLine();
                        }
                    }, delay);
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                    const element = document.createElement(node.tagName.toLowerCase());

                    // Copy attributes except 'style'
                    Array.from(node.attributes).forEach(attr => {
                        if (attr.name !== 'style') {
                            element.setAttribute(attr.name, attr.value);
                        }
                    });

                    container.appendChild(element);

                    // Typing animation for the element
                    typeNode(node, element, delay).then(() => {
                        currentLine++;
                        typeLine();
                    });
                }
            };

            const typeNode = (node, parent, delay) => {
                return new Promise((resolve) => {
                    const childNodes = Array.from(node.childNodes);
                    let childIndex = 0;

                    const typeChild = () => {
                        if (childIndex >= childNodes.length) {
                            resolve();
                            return;
                        }

                        const child = childNodes[childIndex];
                        if (child.nodeType === Node.TEXT_NODE) {
                            const text = child.textContent;
                            const span = document.createElement('span');
                            parent.appendChild(span);
                            let index = 0;

                            const interval = setInterval(() => {
                                span.textContent += text[index];
                                index++;
                                if (index >= text.length) {
                                    clearInterval(interval);
                                    childIndex++;
                                    typeChild();
                                }
                            }, delay);
                        } else if (child.nodeType === Node.ELEMENT_NODE) {
                            const element = document.createElement(child.tagName.toLowerCase());

                            // Copy attributes except 'style'
                            Array.from(child.attributes).forEach(attr => {
                                if (attr.name !== 'style') {
                                    element.setAttribute(attr.name, attr.value);
                                }
                            });

                            parent.appendChild(element);
                            typeNode(child, element, delay).then(() => {
                                childIndex++;
                                typeChild();
                            });
                        }
                    };

                    typeChild();
                });
            };

            typeLine();
        });
    };

    /**
     * Function to send the user's message to the server.
     *
     * @param {string} message - The user's message.
     * @returns {Promise<string>} - The AI's response.
     */
    const sendMessage = async (message) => {
        try {
            userInput.disabled = true;
            sendButton.disabled = true;

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message })
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            return data.reply;
        } catch (error) {
            console.error('Error:', error);
            return 'Sorry, something went wrong. Please try again.';
        } finally {
            userInput.disabled = false;
            sendButton.disabled = false;
        }
    };

    /**
     * Function to generate images based on the user's prompt.
     *
     * @param {string} prompt - The user's prompt for image generation.
     * @returns {Promise<string>} - The URL of the generated image.
     */
    const generateImage = async (prompt) => {
        try {
            userInput.disabled = true;
            sendButton.disabled = true;

            // Show loading indicator
            appendMessage('AI is generating your image...', 'bot', false, true);

            const response = await fetch('/api/generate-image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ prompt })
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            return data.image;
        } catch (error) {
            console.error('Error:', error);
            return 'Sorry, the image could not be generated.';
        } finally {
            userInput.disabled = false;
            sendButton.disabled = false;
        }
    };

    // Handle form submission
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = userInput.value.trim();
        if (message === '') return;

        appendMessage(message, 'user');
        userInput.value = '';

        // Check if the message requests image generation
        const isImageRequest = message.toLowerCase().startsWith('generate image');

        if (isImageRequest) {
            const prompt = message.replace(/^generate image\s*/i, '');
            const imageUrl = await generateImage(prompt);
            if (imageUrl && typeof imageUrl === 'string') {
                appendMessage(imageUrl, 'bot', true);
            } else {
                appendMessage('Image generation failed.', 'bot');
            }
        } else {
            const aiReply = await sendMessage(message);
            appendMessage(aiReply, 'bot');
        }
    });

    // Auto-Resize for the textarea
    userInput.addEventListener('input', () => {
        userInput.rows = 1;
        const rows = Math.floor(userInput.scrollHeight / 24);
        userInput.rows = rows > 1 ? rows : 1;
    });

    // Add Enter key to send
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
            e.preventDefault(); // Prevent adding a newline
            chatForm.dispatchEvent(new Event('submit')); // Submit the form
        }
    });

    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && settingsModal.style.display === 'flex') {
            settingsModal.style.display = 'none';
            settingsModal.setAttribute('aria-hidden', 'true');
        }
    });
});
