// script.js
document.addEventListener('DOMContentLoaded', () => {
    // ---------------------------
    // Chat Functionality
    // ---------------------------
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const chatMessages = document.getElementById('chat-messages');
    const sendButton = document.getElementById('send-button');

    const settingsButton = document.getElementById('settings-button');
    const settingsModal = document.getElementById('settings-modal');
    const closeModalButton = document.getElementById('close-modal');
    const themeSelect = document.getElementById('theme-select');

    const chatButton = document.getElementById('chat-button');
    const imageButton = document.getElementById('image-button');
    const chatSection = document.getElementById('chat-section');
    const imageSection = document.getElementById('image-section');

    // Image Form Elements
    const imageForm = document.getElementById('image-form');
    const promptInput = document.getElementById('prompt');
    const widthInput = document.getElementById('width');
    const heightInput = document.getElementById('height');
    const negativePromptInput = document.getElementById('negative-prompt');
    const generatedImageDiv = document.getElementById('generated-image');
    const resultImage = document.getElementById('result-image');
    const downloadImageButton = document.getElementById('download-image');
    const loadingBarContainer = document.getElementById('loading-bar-container');
    const loadingBar = document.getElementById('loading-bar');

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
     * @param {Object} params - Parameters for image generation.
     * @param {string} params.prompt - The user's prompt.
     * @param {number} params.width - Width of the image.
     * @param {number} params.height - Height of the image.
     * @param {string} params.negativePrompt - Negative prompt.
     * @returns {Promise<string>} - The URL of the generated image.
     */
    const generateImage = async ({ prompt, width, height, negativePrompt }) => {
        try {
            imageForm.querySelector('button').disabled = true;

            // Show loading bar
            generatedImageDiv.hidden = false;
            loadingBarContainer.hidden = false;
            loadingBar.style.width = '0%';
            resultImage.src = '';
            resultImage.hidden = true; // Hide the image initially
            downloadImageButton.disabled = true;
            downloadImageButton.innerHTML = '<i class="fas fa-download"></i> Image has not loaded yet';

            let startTime = Date.now();
            let estimatedTotalTime = 20000; // Estimated total time in ms
            let loading = true;

            const updateProgress = () => {
                if (!loading) return;

                let elapsedTime = Date.now() - startTime;
                let progress = Math.min((elapsedTime / estimatedTotalTime) * 90, 90); // Max 90%
                loadingBar.style.width = `${progress}%`;

                if (progress < 90) {
                    requestAnimationFrame(updateProgress);
                }
            };

            requestAnimationFrame(updateProgress);

            const response = await fetch('/api/generate-image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ prompt, width, height, negativePrompt })
            });

            loading = false;
            loadingBar.style.width = '100%';

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            return data.image; // Assuming the server returns { image: 'image_url' }
        } catch (error) {
            console.error('Error:', error);
            return null;
        } finally {
            imageForm.querySelector('button').disabled = false;
            // Hide loading bar after some time
            setTimeout(() => {
                loadingBarContainer.hidden = true;
            }, 500);
        }
    };

    // Handle chat form submission
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
            const imageUrl = await generateImage({ prompt, width: 512, height: 512, negativePrompt: 'bad quality' });
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

    // Handle image form submission
    imageForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const prompt = promptInput.value.trim() || promptInput.placeholder; // Fallback to placeholder if input is empty
        const width = parseInt(widthInput.value.trim()) || parseInt(widthInput.placeholder); // Fallback to placeholder
        const height = parseInt(heightInput.value.trim()) || parseInt(heightInput.placeholder); // Fallback to placeholder
        const negativePrompt = negativePromptInput.value.trim() || negativePromptInput.placeholder; // Fallback to placeholder

        // Disable form inputs
        imageForm.querySelectorAll('input, button').forEach(elem => elem.disabled = true);

        const imageUrl = await generateImage({ prompt, width, height, negativePrompt });

        if (imageUrl && typeof imageUrl === 'string') {
            // Display the generated image
            resultImage.src = imageUrl;
            // Wait for the image to load
            resultImage.onload = () => {
                // Show the image after it has loaded
                resultImage.hidden = false;

                // Enable download button
                downloadImageButton.href = imageUrl;
                downloadImageButton.download = 'generated-image.png';
                downloadImageButton.disabled = false;
                downloadImageButton.innerHTML = '<i class="fas fa-download"></i> Download Image';
            };
        } else {
            alert('Image generation failed.');
            downloadImageButton.disabled = true;
            downloadImageButton.innerHTML = '<i class="fas fa-download"></i> Image has not loaded yet';
        }

        // Re-enable form inputs
        imageForm.querySelectorAll('input, button').forEach(elem => elem.disabled = false);
    });

    // Download image functionality
    downloadImageButton.addEventListener('click', (e) => {
        if (resultImage.src && !resultImage.hidden) {
            const link = document.createElement('a');
            link.href = resultImage.src;
            link.download = 'generated-image.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            e.preventDefault();
            alert('Image has not loaded yet.');
        }
    });

    // Auto-Resize for the textarea
    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = userInput.scrollHeight + 'px';
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
        if (e.key === 'Escape') {
            if (settingsModal.style.display === 'flex') {
                settingsModal.style.display = 'none';
                settingsModal.setAttribute('aria-hidden', 'true');
            }
            // Optionally, hide generated image
            if (!imageSection.hidden && !chatSection.hidden) {
                generatedImageDiv.hidden = true;
            }
        }
    });

    // ---------------------------
    // Dropdown Menu Functionality
    // ---------------------------
    const dropdownButton = document.getElementById('dropdown-button');
    const dropdownContent = document.getElementById('dropdown-content');
    const loginButton = document.getElementById('login-button');
    const aboutUsButton = document.getElementById('aboutus-button');
    const settingsButtonDropdown = document.getElementById('settings-button');

    // Function to toggle dropdown
    const toggleDropdown = () => {
        dropdownContent.classList.toggle('show');
        const isExpanded = dropdownButton.getAttribute('aria-expanded') === 'true';
        dropdownButton.setAttribute('aria-expanded', !isExpanded);
    };

    // Close dropdown if clicked outside
    const closeDropdown = (event) => {
        if (!dropdownContent.contains(event.target) && !dropdownButton.contains(event.target)) {
            dropdownContent.classList.remove('show');
            dropdownButton.setAttribute('aria-expanded', 'false');
        }
    };

    // Dropdown Button Click Handler
    dropdownButton.addEventListener('click', toggleDropdown);

    // Close dropdown when clicking outside
    window.addEventListener('click', closeDropdown);

    // Settings Button Click Handler (from Dropdown)
    settingsButtonDropdown.addEventListener('click', () => {
        settingsModal.style.display = 'flex';
        settingsModal.setAttribute('aria-hidden', 'false');
        dropdownContent.classList.remove('show');
        dropdownButton.setAttribute('aria-expanded', 'false');
    });

    // Login Button Click Handler
    loginButton.addEventListener('click', () => {
        alert('Login functionality is not implemented yet.');
        dropdownContent.classList.remove('show');
        dropdownButton.setAttribute('aria-expanded', 'false');
    });

    // About Us Button Click Handler
    aboutUsButton.addEventListener('click', () => {
        alert('About Us: We are developing an AI-powered chatbot to assist you!');
        dropdownContent.classList.remove('show');
        dropdownButton.setAttribute('aria-expanded', 'false');
    });

    // ---------------------------
    // Mode Switching Functionality
    // ---------------------------
    const switchToChat = () => {
        chatSection.hidden = false;
        imageSection.hidden = true;
        chatButton.classList.add('active');
        imageButton.classList.remove('active');
        generatedImageDiv.hidden = true;
        // Update URL
        history.pushState(null, '', '?chat');
    };

    const switchToImage = () => {
        chatSection.hidden = true;
        imageSection.hidden = false;
        chatButton.classList.remove('active');
        imageButton.classList.add('active');
        // Reset image form and generated image
        imageForm.reset();
        generatedImageDiv.hidden = true;
        resultImage.src = '';
        resultImage.hidden = true;
        downloadImageButton.disabled = true;
        downloadImageButton.innerHTML = '<i class="fas fa-download"></i> Image has not loaded yet';
        // Update URL
        history.pushState(null, '', '?image');
    };

    chatButton.addEventListener('click', switchToChat);
    imageButton.addEventListener('click', switchToImage);

    // Handle browser navigation (back/forward buttons)
    window.addEventListener('popstate', () => {
        if (location.search.includes('image')) {
            switchToImage();
        } else {
            switchToChat();
        }
    });

    // Initialize based on URL
    if (location.search.includes('image')) {
        switchToImage();
    } else {
        switchToChat();
    }
});
