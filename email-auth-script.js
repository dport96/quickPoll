// QuickPoll Application with Email Authentication
class QuickPollEmailApp {
    constructor() {
        this.currentPage = 'landing';
        this.pollData = null;
        this.votes = {};
        this.currentUser = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.parseQueryString();
        this.showPage(this.currentPage);
        
        // Check if user is already signed in
        this.checkExistingAuth();
        
        // Load saved email list
        this.loadSavedEmailList();
    }

    bindEvents() {
        // Navigation events
        document.getElementById('create-ranking-btn').addEventListener('click', () => this.showCreatePage('ranking'));
        document.getElementById('create-rating-btn').addEventListener('click', () => this.showCreatePage('rating'));
        document.getElementById('create-poll-btn-hero').addEventListener('click', () => this.showCreatePage('simple'));
        document.getElementById('back-to-home').addEventListener('click', () => this.showPage('landing'));

        // Auth events
        document.getElementById('sign-in-btn').addEventListener('click', () => this.showEmailAuthModal());
        document.getElementById('sign-out-btn').addEventListener('click', () => this.signOut());
        document.getElementById('sign-in-now-btn').addEventListener('click', () => this.showEmailAuthModal());
        document.getElementById('email-auth-form').addEventListener('submit', (e) => this.handleEmailAuth(e));
        document.getElementById('close-modal').addEventListener('click', () => this.hideEmailModal());
        document.getElementById('cancel-auth').addEventListener('click', () => this.cancelEmailAuth());

        // Form events
        document.getElementById('poll-form').addEventListener('submit', (e) => this.handleCreatePoll(e));
        document.getElementById('add-option-btn').addEventListener('click', () => this.addOption());
        document.getElementById('poll-type').addEventListener('change', (e) => this.handlePollTypeChange(e));

        // Auth mode change
        document.querySelectorAll('input[name="auth-mode"]').forEach(radio => {
            radio.addEventListener('change', (e) => this.handleAuthModeChange(e));
        });

        // Template selection change
        document.querySelectorAll('input[name="template"]').forEach(radio => {
            radio.addEventListener('change', (e) => this.handleTemplateChange(e));
        });

        // Option removal events
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-option')) {
                this.removeOption(e.target);
            }
        });

        // Option input change events - switch to custom when manually edited
        document.addEventListener('input', (e) => {
            if (e.target.name === 'option') {
                this.switchToCustomTemplate();
            }
        });

        // Poll created page events
        const copyVotingLinkBtn = document.getElementById('copy-voting-link');
        const copyResultsLinkBtn = document.getElementById('copy-results-link');
        const viewResultsBtn = document.getElementById('view-results-now');
        const closePollBtn = document.getElementById('close-poll');
        
        if (copyVotingLinkBtn) {
            copyVotingLinkBtn.replaceWith(copyVotingLinkBtn.cloneNode(true));
            document.getElementById('copy-voting-link').addEventListener('click', () => this.copyToClipboard('voting-link'));
        }
        
        if (copyResultsLinkBtn) {
            copyResultsLinkBtn.replaceWith(copyResultsLinkBtn.cloneNode(true));
            document.getElementById('copy-results-link').addEventListener('click', () => this.copyToClipboard('results-link'));
        }
        
        if (viewResultsBtn) {
            viewResultsBtn.replaceWith(viewResultsBtn.cloneNode(true));
            document.getElementById('view-results-now').addEventListener('click', () => this.viewResults());
        }
        
        if (closePollBtn) {
            closePollBtn.replaceWith(closePollBtn.cloneNode(true));
            document.getElementById('close-poll').addEventListener('click', () => this.closePoll());
        }

        const createNewPollBtn = document.getElementById('create-new-poll-btn');
        if (createNewPollBtn) {
            createNewPollBtn.replaceWith(createNewPollBtn.cloneNode(true));
            document.getElementById('create-new-poll-btn').addEventListener('click', () => this.createNewPoll());
        }

        // Modal click outside to close
        document.getElementById('email-auth-modal').addEventListener('click', (e) => {
            if (e.target.id === 'email-auth-modal') {
                this.hideEmailModal();
            }
        });
    }

    checkExistingAuth() {
        // Check if user data exists in localStorage
        const userData = localStorage.getItem('currentUser');
        if (userData) {
            this.currentUser = JSON.parse(userData);
            this.updateUserInterface();
        }
    }

    handleAuthModeChange(e) {
        const authInfo = document.getElementById('auth-info');
        const validEmailsContainer = document.getElementById('valid-emails-container');
        const authRequirementNote = document.getElementById('auth-requirement-note');
        const authSignedInNote = document.getElementById('auth-signed-in-note');
        const authNotSignedInNote = document.getElementById('auth-not-signed-in-note');

        if (e.target.value === 'email') {
            authInfo.style.display = 'block';
            validEmailsContainer.style.display = 'block';
            if (authRequirementNote) {
                authRequirementNote.style.display = 'block';
                // Show sign-in status notes as before
                if (this.currentUser) {
                    authSignedInNote.style.display = 'block';
                    authNotSignedInNote.style.display = 'none';
                } else {
                    authSignedInNote.style.display = 'none';
                    authNotSignedInNote.style.display = 'block';
                }
            }
        } else {
            authInfo.style.display = 'none';
            validEmailsContainer.style.display = 'none';
            if (authRequirementNote) {
                authRequirementNote.style.display = 'none';
            }
        }
    }

    handleTemplateChange(e) {
        const templateValue = e.target.value;
        
        if (templateValue === 'custom') {
            return; // Don't change anything for custom
        }

        const templates = {
            'yes-no': ['Yes', 'No'],
            'approve-disapprove': ['Approve', 'Disapprove', 'Abstain'],
            'agree-disagree': ['Agree', 'Disagree', 'Neutral'],
            'satisfaction': ['Very Satisfied', 'Satisfied', 'Neutral', 'Dissatisfied', 'Very Dissatisfied']
        };

        const options = templates[templateValue];
        if (options) {
            this.populateOptionsFromTemplate(options);
        }
    }

    populateOptionsFromTemplate(options) {
        const optionsList = document.getElementById('options-list');
        
        // Clear existing options
        optionsList.innerHTML = '';
        
        // Add new options from template
        options.forEach((option, index) => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'option-input';
            optionDiv.innerHTML = `
                <input type="text" name="option" placeholder="Option ${index + 1}" value="${option}" required>
                <button type="button" class="btn btn-small btn-danger remove-option">Remove</button>
            `;
            optionsList.appendChild(optionDiv);
        });
        
        // Ensure minimum 2 options
        while (optionsList.children.length < 2) {
            this.addOption();
        }
    }

    switchToCustomTemplate() {
        const customRadio = document.querySelector('input[name="template"][value="custom"]');
        if (customRadio && !customRadio.checked) {
            customRadio.checked = true;
        }
    }

    parseQueryString() {
        const params = new URLSearchParams(window.location.search);
        const mode = params.get('mode');
        const pollId = params.get('id');

        if (mode && pollId) {
            this.loadPollFromParams(params);
            if (mode === 'vote') {
                this.currentPage = 'vote';
            } else if (mode === 'results') {
                this.currentPage = 'results';
            }
        }
    }

    loadPollFromParams(params) {
        try {
            // Decode poll data from URL parameters
            const pollData = {
                id: params.get('id'),
                title: params.get('title'),
                description: params.get('desc') || '',
                type: params.get('type'),
                requireAuth: params.get('auth') === 'true',
                validEmails: params.get('emails') ? params.get('emails').split(',') : [],
                options: []
            };

            // Load options
            let i = 0;
            while (params.get(`opt${i}`)) {
                pollData.options.push(params.get(`opt${i}`));
                i++;
            }

            // Load existing votes from localStorage
            const votesKey = `votes_${pollData.id}`;
            this.votes = JSON.parse(localStorage.getItem(votesKey) || '{}');

            this.pollData = pollData;
        } catch (error) {
            console.error('Error loading poll data:', error);
            this.showPage('landing');
        }
    }

    showPage(pageId) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // Show target page
        document.getElementById(`${pageId}-page`).classList.add('active');
        this.currentPage = pageId;

        // Load page-specific content
        if (pageId === 'vote') {
            this.renderVotePage();
        } else if (pageId === 'results') {
            this.renderResultsPage();
        }
    }

    showCreatePage(type = null) {
        // Require authentication for poll creation
        if (!this.currentUser) {
            this.showSignInForPollCreation();
            return;
        }
        
        this.showPage('create');
        if (type) {
            document.getElementById('poll-type').value = type;
            this.handlePollTypeChange({ target: { value: type } });
        }
        
        // Load saved email list for this user
        this.loadSavedEmailList();
        
        // Set up email list change event listener with current user context
        this.setupEmailListEventListener();
        
        // Initialize the auth mode UI state since Email Authentication is now default
        const emailAuthRadio = document.querySelector('input[name="auth-mode"][value="email"]');
        if (emailAuthRadio && emailAuthRadio.checked) {
            this.handleAuthModeChange({ target: emailAuthRadio });
        }
    }

    showResultsPage() {
        const pollId = prompt('Enter Poll ID to view results:');
        if (pollId) {
            window.location.href = `/results/${pollId}`;
        }
    }

    handlePollTypeChange(e) {
        const type = e.target.value;
        const optionsContainer = document.getElementById('options-container');
        optionsContainer.style.display = 'block';
    }

    addOption() {
        const optionsList = document.getElementById('options-list');
        const optionCount = optionsList.children.length + 1;
        
        const optionDiv = document.createElement('div');
        optionDiv.className = 'option-input';
        optionDiv.innerHTML = `
            <input type="text" name="option" placeholder="Option ${optionCount}" required>
            <button type="button" class="btn btn-small btn-danger remove-option">Remove</button>
        `;
        
        optionsList.appendChild(optionDiv);
        this.switchToCustomTemplate();
    }

    removeOption(button) {
        const optionsList = document.getElementById('options-list');
        if (optionsList.children.length > 2) {
            button.parentElement.remove();
            this.switchToCustomTemplate();
        } else {
            alert('You must have at least 2 options.');
        }
    }

    handleCreatePoll(e) {
        e.preventDefault();
        
        // Always require authentication for poll creation
        if (!this.currentUser) {
            this.showSignInForPollCreation();
            return;
        }
        
        const formData = new FormData(e.target);
        const authMode = formData.get('auth-mode');
        const validEmails = formData.get('validEmails');
        
        const pollData = {
            id: this.generateId(),
            title: formData.get('title'),
            description: formData.get('description'),
            type: formData.get('type'),
            requireAuth: authMode === 'email',
            validEmails: validEmails ? validEmails.split('\n').map(email => email.trim()).filter(email => email) : [],
            options: formData.getAll('option').filter(option => option.trim() !== ''),
            created: new Date().toISOString(),
            createdBy: this.currentUser.email,
            creatorName: this.currentUser.name || this.currentUser.email
        };

        if (pollData.options.length < 2) {
            alert('Please add at least 2 options.');
            return;
        }

        // Save the email list to localStorage for future use
        if (validEmails && validEmails.trim()) {
            localStorage.setItem('savedEmailList', validEmails.trim());
        }

        this.pollData = pollData;
        this.votes = {};
        
        // Save poll data to localStorage
        localStorage.setItem(`poll_${pollData.id}`, JSON.stringify(pollData));
        localStorage.setItem(`votes_${pollData.id}`, JSON.stringify(this.votes));

        this.showPollCreatedPage();
    }

    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }

    showPollCreatedPage() {
        const baseUrl = window.location.origin;
        
        const votingLink = `${baseUrl}/vote/${this.pollData.id}`;
        const resultsLink = `${baseUrl}/results/${this.pollData.id}`;

        document.getElementById('voting-link').value = votingLink;
        document.getElementById('results-link').value = resultsLink;

        // Show auth info if required
        const authInfo = document.getElementById('auth-info');
        const emailRestrictionInfo = document.getElementById('email-restriction-info');
        
        if (this.pollData.requireAuth) {
            authInfo.style.display = 'block';
            if (this.pollData.validEmails.length > 0) {
                emailRestrictionInfo.style.display = 'list-item';
            }
        }

        this.showPage('poll-created');
    }

    copyToClipboard(inputId) {
        const input = document.getElementById(inputId);
        input.select();
        document.execCommand('copy');
        
        // Show feedback
        const button = input.nextElementSibling;
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        button.classList.add('bounce');
        
        setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('bounce');
        }, 1000);
    }

    viewResults() {
        const resultsLink = document.getElementById('results-link').value;
        window.open(resultsLink, '_blank', 'width=1000,height=700,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no');
    }

    closePoll() {
        if (!this.pollData || !this.pollData.id) {
            alert('No active poll to close.');
            return;
        }

        const confirmed = confirm('Are you sure you want to close this poll? This will prevent any further voting. All existing data and results will be preserved. [v2.0]');
        
        if (confirmed) {
            // Set poll as closed
            this.pollData.isClosed = true;
            this.pollData.closedAt = new Date().toISOString();
            
            // Save the updated poll data
            const pollKey = `poll_${this.pollData.id}`;
            localStorage.setItem(pollKey, JSON.stringify(this.pollData));
            
            // Update button state
            const closeButton = document.getElementById('close-poll');
            if (closeButton) {
                closeButton.textContent = 'Poll Closed';
                closeButton.disabled = true;
                closeButton.classList.remove('btn-danger');
                closeButton.classList.add('btn-secondary');
            }
            
            alert('Poll has been closed successfully. No further votes will be accepted.');
        }
    }

    createNewPoll() {
        // Default implementation for local storage mode
        // Navigate to the create poll page
        this.showPage('create');
        
        // Clear any existing poll data so we start fresh
        this.pollData = null;
        
        // Show success message
        setTimeout(() => {
            alert('Ready to create a new poll! The previous poll has been closed.');
        }, 100);
    }

    async saveResultsAsImage() {
        try {
            // Load html2canvas library if not already loaded
            if (typeof html2canvas === 'undefined') {
                await this.loadHtml2Canvas();
            }

            const resultsContainer = document.getElementById('results-content');
            if (!resultsContainer) {
                throw new Error('Results container not found');
            }

            // Create a temporary container for clean capture
            const tempContainer = resultsContainer.cloneNode(true);
            
            // Remove action buttons from the clone for cleaner image
            const actionButtons = tempContainer.querySelectorAll('.form-actions');
            actionButtons.forEach(btn => btn.remove());

            // Add timestamp to the results
            const timestamp = document.createElement('div');
            timestamp.className = 'results-timestamp';
            timestamp.textContent = `Results saved on ${new Date().toLocaleString()}`;
            tempContainer.appendChild(timestamp);

            // Temporarily add the container to the page for capturing
            tempContainer.style.position = 'absolute';
            tempContainer.style.left = '-9999px';
            tempContainer.style.backgroundColor = '#ffffff';
            tempContainer.style.padding = '20px';
            document.body.appendChild(tempContainer);

            // Capture the temporary container
            const canvas = await html2canvas(tempContainer, {
                backgroundColor: '#ffffff',
                scale: 2,
                useCORS: true,
                allowTaint: true,
                width: tempContainer.scrollWidth,
                height: tempContainer.scrollHeight
            });

            // Clean up temporary container
            document.body.removeChild(tempContainer);

            // Create download link
            const link = document.createElement('a');
            const filename = `poll-results-${this.pollData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${new Date().toISOString().split('T')[0]}.png`;
            link.download = filename;
            link.href = canvas.toDataURL('image/png');
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Show success message
            alert('Results image saved successfully!');
        } catch (error) {
            console.error('Error saving results:', error);
            alert('Failed to save results image. Please try again.');
        }
    }

    async loadHtml2Canvas() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load html2canvas'));
            document.head.appendChild(script);
        });
    }

    renderVotePage() {
        const container = document.getElementById('vote-content');
        
        if (!this.pollData) {
            container.innerHTML = `
                <div class="vote-container">
                    <h2>Poll Not Found</h2>
                    <p>The requested poll could not be found.</p>
                    <button id="go-home-btn" class="btn btn-primary">Go Home</button>
                </div>
            `;
            this.bindVoteEvents();
            return;
        }

        // Check if poll is closed
        if (this.pollData.isClosed) {
            container.innerHTML = `
                <div class="vote-container">
                    <h2>${this.pollData.title}</h2>
                    <div class="poll-closed-notice">
                        <h3>🔒 Poll Closed</h3>
                        <p>This poll has been closed by the creator and is no longer accepting votes.</p>
                        <p><small>Closed on: ${new Date(this.pollData.closedAt).toLocaleString()}</small></p>
                        <div class="form-actions">
                            <button onclick="location.href='/results/${this.pollData.id}'" class="btn btn-primary">View Results</button>
                            <button onclick="location.href='/'" class="btn btn-secondary">Go Home</button>
                        </div>
                    </div>
                </div>
            `;
            return;
        }

        // Check if authentication is required
        if (this.pollData.requireAuth && !this.currentUser) {
            // Show a more informative message before the modal
            const container = document.getElementById('vote-content');
            container.innerHTML = `
                <div class="vote-container">
                    <h2>${this.pollData.title}</h2>
                    <div class="auth-required-notice">
                        <h3>📧 Email Authentication Required</h3>
                        <p>This poll requires email verification to ensure one vote per person.</p>
                        <p>Please sign in to participate in this poll.</p>
                        <div class="form-actions">
                            <button id="sign-in-to-vote-btn" class="btn btn-primary">Sign In to Vote</button>
                            <button id="back-to-home-auth-btn" class="btn btn-secondary">Back to Home</button>
                        </div>
                    </div>
                </div>
            `;
            this.bindVoteEvents();
            return;
        }

        // Check if user's email is valid (if email restrictions are in place)
        if (this.pollData.requireAuth && this.pollData.validEmails.length > 0 && 
            !this.pollData.validEmails.includes(this.currentUser.email)) {
            this.showAccessDeniedMessage();
            return;
        }

        // Check if user has already voted (for authenticated polls)
        if (this.pollData.requireAuth && this.hasUserVoted()) {
            this.showAlreadyVotedMessage();
            return;
        }

        let content = `
            <div class="vote-container">
                <div class="poll-header">
                    <h2>${this.pollData.title}</h2>
                    ${this.pollData.description ? `<p class="poll-description">${this.pollData.description}</p>` : ''}
                    <div class="poll-meta">
                        <span class="poll-creator">Created by: <strong>${this.pollData.creatorName || this.pollData.createdBy || 'Unknown'}</strong></span>
                        <span class="poll-date">${new Date(this.pollData.createdAt).toLocaleString()}</span>
                    </div>
                </div>
                ${this.pollData.requireAuth ? `
                    <div class="auth-indicator authenticated">
                        <span class="auth-icon">✅</span>
                        <span class="auth-text">Authenticated as <strong>${this.currentUser.email}</strong></span>
                        <span class="auth-note">• Ready to vote</span>
                    </div>
                ` : ''}
        `;

        if (this.pollData.type === 'simple') {
            content += this.renderSimplePoll();
        } else if (this.pollData.type === 'rating') {
            content += this.renderRatingPoll();
        } else if (this.pollData.type === 'ranking') {
            content += this.renderRankingPoll();
        }

        content += `
                <div class="form-actions">
                    <button id="submit-vote" class="btn btn-primary">Submit Vote</button>
                    <button id="back-to-home-vote-btn" class="btn btn-secondary">Back to Home</button>
                </div>
            </div>
        `;

        container.innerHTML = content;
        this.bindVoteEvents();
    }

    showEmailAuthModal() {
        const modal = document.getElementById('email-auth-modal');
        modal.style.display = 'flex';
        
        // Focus on email input
        setTimeout(() => {
            document.getElementById('voter-email').focus();
        }, 100);
    }

    cancelEmailAuth() {
        // Clear form when user cancels
        document.getElementById('email-auth-form').reset();
        this.hideEmailModal();
    }

    hideEmailModal() {
        const modal = document.getElementById('email-auth-modal');
        modal.style.display = 'none';
        
        // Don't automatically clear form - let caller decide
        // Form will be cleared only on cancel or explicit request
        
        // If user cancelled and is on vote page, show access required message
        if (this.currentPage === 'vote' && this.pollData && this.pollData.requireAuth && !this.currentUser) {
            const container = document.getElementById('vote-content');
            container.innerHTML = `
                <div class="vote-container">
                    <h2>Email Authentication Required</h2>
                    <p>This poll requires email authentication to participate.</p>
                    <div class="form-actions">
                        <button onclick="app.showEmailAuthModal()" class="btn btn-primary">Sign In with Email</button>
                        <button onclick="location.href='./'" class="btn btn-secondary">Back to Home</button>
                    </div>
                </div>
            `;
        }
    }
    
    showSignInForPollCreation() {
        // Update modal content for poll creation context
        const modalHeader = document.querySelector('#email-auth-modal .modal-header h3');
        const modalBody = document.querySelector('#email-auth-modal .modal-body p');
        
        const originalHeader = modalHeader.textContent;
        const originalBody = modalBody.textContent;
        
        modalHeader.textContent = '🔐 Sign In Required for Poll Creation';
        modalBody.textContent = 'To create an authenticated poll, you must sign in first. This ensures only you can view the poll results.';
        
        this.showEmailAuthModal();
        
        // Reset the modal content when it's hidden
        const originalHideModal = this.hideEmailModal.bind(this);
        this.hideEmailModal = () => {
            originalHideModal();
            modalHeader.textContent = originalHeader;
            modalBody.textContent = originalBody;
            this.hideEmailModal = originalHideModal; // Restore original method
        };
    }

    handleEmailAuth(e) {
        e.preventDefault();
        e.stopPropagation(); // Prevent event bubbling
        
        // Prevent double submission
        if (this._submitting) {
            return;
        }
        this._submitting = true;
        
        let email, name;
        
        try {
            const formData = new FormData(e.target);
            const rawEmail = formData.get('email');
            const rawName = formData.get('name');
            
            if (!rawEmail || rawEmail.trim() === '') {
                alert('Email field is empty. Please enter an email address.');
                this._submitting = false;
                return;
            }
            
            email = rawEmail.trim().toLowerCase();
            name = rawName ? rawName.trim() : email.split('@')[0];
            
            // Basic email validation
            if (!this.isValidEmail(email)) {
                alert('Please enter a valid email address.');
                this._submitting = false;
                return;
            }
        } catch (error) {
            console.error('Error in handleEmailAuth:', error);
            alert('An error occurred during email validation. Please try again.');
            this._submitting = false;
            return;
        }
        
        // Check if another user is already signed in with this email address
        if (this.isEmailAlreadyInUse(email)) {
            alert('This email address is already signed in from another session. Please sign in with a different email address or sign out from the other session first.');
            this._submitting = false;
            return;
        }
        
        // Check if email is in valid list (only when voting in a restricted poll)
        if (this.currentPage === 'vote' && this.pollData && this.pollData.requireAuth && 
            this.pollData.validEmails.length > 0 && !this.pollData.validEmails.includes(email)) {
            alert('Your email address is not authorized to vote in this poll.');
            this._submitting = false; // Reset flag
            return;
        }
        
        // Create user object
        const userData = {
            email: email,
            name: name,
            signedInAt: new Date().toISOString()
        };
        
        // Store user data
        this.currentUser = userData;
        localStorage.setItem('currentUser', JSON.stringify(userData));
        
        // Create session record to track active sessions
        const sessionKey = `userSession_${email}`;
        localStorage.setItem(sessionKey, JSON.stringify(userData));
        
        // Update UI
        this.updateUserInterface();
        
        // Hide modal after a short delay to prevent double submission
        setTimeout(() => {
            this.hideEmailModal();
            // Clear form after modal is hidden
            document.getElementById('email-auth-form').reset();
        }, 100);
        
        // If on voting page, refresh the content
        if (this.currentPage === 'vote') {
            this.renderVotePage();
        }
        
        // Reset submitting flag
        this._submitting = false;
    }

    isValidEmail(email) {
        // More comprehensive email validation
        if (!email || typeof email !== 'string') {
            return false;
        }
        
        // Trim whitespace
        email = email.trim();
        
        if (email.length === 0) {
            return false;
        }
        
        // Enhanced email regex pattern
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        
        return emailRegex.test(email);
    }

    showAccessDeniedMessage() {
        const container = document.getElementById('vote-content');
        container.innerHTML = `
            <div class="vote-container">
                <div class="access-denied">
                    <h3>🚫 Access Denied</h3>
                    <p>Your email address (${this.currentUser.email}) is not authorized to vote in this poll.</p>
                    <p>Please contact the poll creator if you believe this is an error.</p>
                    <div class="form-actions">
                        <button id="sign-out-btn-denied" class="btn btn-secondary">Sign In with Different Email</button>
                        <button id="back-to-home-denied-btn" class="btn btn-primary">Back to Home</button>
                    </div>
                </div>
            </div>
        `;
        this.bindVoteEvents();
    }

    hasUserVoted() {
        if (!this.currentUser) return false;
        
        const userVoteKey = this.currentUser.email;
        return this.votes.hasOwnProperty(userVoteKey);
    }

    showAlreadyVotedMessage() {
        const container = document.getElementById('vote-content');
        let resultsButton = '';
        
        // Only show View Results button to poll creator
        if (this.pollData.createdBy === 'anonymous' || 
            (this.currentUser && this.currentUser.email === this.pollData.createdBy)) {
            resultsButton = `<button onclick="location.href='/results/${this.pollData.id}'" class="btn btn-primary">View Results</button>`;
        }
        
        container.innerHTML = `
            <div class="vote-container">
                <h2>${this.pollData.title}</h2>
                <div class="already-voted">
                    <h3>✅ You've Already Voted</h3>
                    <p>Thank you for participating! You can only vote once in this poll with your email address (${this.currentUser.email}).</p>
                    <div class="form-actions">
                        ${resultsButton}
                        <button onclick="location.href='./'" class="btn btn-secondary">Back to Home</button>
                    </div>
                </div>
            </div>
        `;
    }

    renderSimplePoll() {
        return `
            <div class="poll-options">
                ${this.pollData.options.map((option, index) => `
                    <div class="poll-option" data-value="${index}">
                        ${option}
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderRatingPoll() {
        return `
            <div class="rating-container">
                ${this.pollData.options.map((option, index) => `
                    <div class="rating-option">
                        <h4>${option}</h4>
                        <div class="stars" data-option="${index}">
                            ${[1, 2, 3, 4, 5].map(star => `
                                <span class="star" data-rating="${star}">★</span>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderRankingPoll() {
        return `
            <div class="ranking-container">
                <p>Drag the options to rank them from most preferred (top) to least preferred (bottom):</p>
                <div id="sortable-options">
                    ${this.pollData.options.map((option, index) => `
                        <div class="sortable-option" data-value="${index}" draggable="true">
                            <span class="drag-handle">≡</span> ${option}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    bindVoteEvents() {
        const submitBtn = document.getElementById('submit-vote');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => this.submitVote());
        }

        // Home navigation buttons
        const goHomeBtn = document.getElementById('go-home-btn');
        if (goHomeBtn) {
            goHomeBtn.addEventListener('click', () => this.showPage('landing'));
        }

        const backToHomeAuthBtn = document.getElementById('back-to-home-auth-btn');
        if (backToHomeAuthBtn) {
            backToHomeAuthBtn.addEventListener('click', () => this.showPage('landing'));
        }

        const backToHomeVoteBtn = document.getElementById('back-to-home-vote-btn');
        if (backToHomeVoteBtn) {
            backToHomeVoteBtn.addEventListener('click', () => this.showPage('landing'));
        }

        const backToHomeDeniedBtn = document.getElementById('back-to-home-denied-btn');
        if (backToHomeDeniedBtn) {
            backToHomeDeniedBtn.addEventListener('click', () => this.showPage('landing'));
        }

        // Sign in button
        const signInToVoteBtn = document.getElementById('sign-in-to-vote-btn');
        if (signInToVoteBtn) {
            signInToVoteBtn.addEventListener('click', () => this.showEmailAuthModal());
        }

        // Sign out button  
        const signOutBtnDenied = document.getElementById('sign-out-btn-denied');
        if (signOutBtnDenied) {
            signOutBtnDenied.addEventListener('click', () => this.signOut());
        }

        if (this.pollData && this.pollData.type === 'simple') {
            this.bindSimplePollEvents();
        } else if (this.pollData && this.pollData.type === 'rating') {
            this.bindRatingEvents();
        } else if (this.pollData && this.pollData.type === 'ranking') {
            this.bindRankingEvents();
        }
    }

    bindSimplePollEvents() {
        document.querySelectorAll('.poll-option').forEach(option => {
            option.addEventListener('click', (e) => {
                // Remove previous selection
                document.querySelectorAll('.poll-option').forEach(opt => opt.classList.remove('selected'));
                // Add selection to clicked option
                e.target.classList.add('selected');
            });
        });
    }

    bindRatingEvents() {
        document.querySelectorAll('.stars').forEach(starsContainer => {
            const stars = starsContainer.querySelectorAll('.star');
            stars.forEach((star, index) => {
                star.addEventListener('click', () => {
                    const rating = parseInt(star.dataset.rating);
                    // Update visual state
                    stars.forEach((s, i) => {
                        s.classList.toggle('active', i < rating);
                    });
                    // Store rating
                    starsContainer.dataset.selectedRating = rating;
                });
            });
        });
    }

    bindRankingEvents() {
        const sortableContainer = document.getElementById('sortable-options');
        let draggedElement = null;

        sortableContainer.addEventListener('dragstart', (e) => {
            draggedElement = e.target;
            e.target.classList.add('dragging');
        });

        sortableContainer.addEventListener('dragend', (e) => {
            e.target.classList.remove('dragging');
            draggedElement = null;
        });

        sortableContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            const afterElement = this.getDragAfterElement(sortableContainer, e.clientY);
            if (afterElement == null) {
                sortableContainer.appendChild(draggedElement);
            } else {
                sortableContainer.insertBefore(draggedElement, afterElement);
            }
        });
    }

    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.sortable-option:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    submitVote() {
        let voteData = {};

        if (this.pollData.type === 'simple') {
            const selected = document.querySelector('.poll-option.selected');
            if (!selected) {
                alert('Please select an option.');
                return;
            }
            voteData = { option: parseInt(selected.dataset.value) };
        } else if (this.pollData.type === 'rating') {
            const ratings = {};
            const starsContainers = document.querySelectorAll('.stars');
            let hasRating = false;
            
            starsContainers.forEach(container => {
                const rating = container.dataset.selectedRating;
                if (rating) {
                    ratings[container.dataset.option] = parseInt(rating);
                    hasRating = true;
                }
            });
            
            if (!hasRating) {
                alert('Please rate at least one option.');
                return;
            }
            voteData = { ratings };
        } else if (this.pollData.type === 'ranking') {
            const sortedOptions = [...document.querySelectorAll('.sortable-option')];
            const ranking = sortedOptions.map(option => parseInt(option.dataset.value));
            voteData = { ranking };
        }

        this.saveVote(voteData);
    }

    saveVote(voteData) {
        const votesKey = `votes_${this.pollData.id}`;
        
        // Load existing votes
        const existingVotes = JSON.parse(localStorage.getItem(votesKey) || '{}');
        
        // Create vote key - use email for authenticated users, generate ID for anonymous
        const voteKey = this.pollData.requireAuth && this.currentUser 
            ? this.currentUser.email 
            : this.generateId();
        
        // Add new vote
        existingVotes[voteKey] = {
            ...voteData,
            timestamp: new Date().toISOString(),
            voter: this.pollData.requireAuth && this.currentUser 
                ? { email: this.currentUser.email, name: this.currentUser.name }
                : { anonymous: true }
        };
        
        // Save updated votes
        localStorage.setItem(votesKey, JSON.stringify(existingVotes));
        this.votes = existingVotes;

        // Show success message and redirect to results
        alert('Your vote has been submitted!');
        
        // Redirect to results page
        const resultsLink = `/results/${this.pollData.id}`;
        window.location.href = resultsLink;
    }

    bindResultsEvents() {
        // Home navigation buttons
        const goHomeResultsBtn = document.getElementById('go-home-results-btn');
        if (goHomeResultsBtn) {
            goHomeResultsBtn.addEventListener('click', () => this.showPage('landing'));
        }

        const backToHomeRestrictedBtn = document.getElementById('back-to-home-restricted-btn');
        if (backToHomeRestrictedBtn) {
            backToHomeRestrictedBtn.addEventListener('click', () => this.showPage('landing'));
        }

        // Refresh results button
        const refreshResultsBtn = document.getElementById('refresh-results-btn');
        if (refreshResultsBtn) {
            refreshResultsBtn.addEventListener('click', () => location.reload());
        }

        // Close poll button
        const closePollBtn = document.getElementById('close-poll-btn');
        if (closePollBtn) {
            closePollBtn.addEventListener('click', () => this.closePoll());
        }

        // Save results button
        const saveResultsBtn = document.getElementById('save-results-btn');
        if (saveResultsBtn) {
            saveResultsBtn.addEventListener('click', () => this.saveResultsAsImage());
        }

        // Sign in button
        const signInResultsBtn = document.getElementById('sign-in-results-btn');
        if (signInResultsBtn) {
            signInResultsBtn.addEventListener('click', () => this.showEmailAuthModal());
        }
    }

    renderResultsPage() {
        const container = document.getElementById('results-content');
        
        if (!this.pollData) {
            container.innerHTML = `
                <div class="results-container">
                    <h2>Poll Not Found</h2>
                    <p>The requested poll could not be found.</p>
                    <button id="go-home-results-btn" class="btn btn-primary">Go Home</button>
                </div>
            `;
            this.bindResultsEvents();
            return;
        }

        // Check if user is authorized to view results
        if (this.pollData.createdBy && this.pollData.createdBy !== 'anonymous') {
            // For authenticated polls, only the creator can view results
            if (!this.currentUser || this.currentUser.email !== this.pollData.createdBy) {
                container.innerHTML = `
                    <div class="results-container">
                        <h2>Access Restricted</h2>
                        <p>Only the poll creator can view the results for this authenticated poll.</p>
                        <p>Poll created by: ${this.pollData.createdBy}</p>
                        ${this.currentUser ? 
                            `<p>You are signed in as: ${this.currentUser.email}</p>` : 
                            `<p>You are not currently signed in.</p>`
                        }
                        <div class="form-actions">
                            <button id="sign-in-results-btn" class="btn btn-primary">${this.currentUser ? 'Sign In as Different User' : 'Sign In'}</button>
                            <button id="back-to-home-restricted-btn" class="btn btn-secondary">Back to Home</button>
                        </div>
                    </div>
                `;
                this.bindResultsEvents();
                return;
            }
        }

        const totalVotes = Object.keys(this.votes).length;
        const authInfo = this.pollData.requireAuth ? '📧 Email Authenticated Poll' : '📊 Anonymous Poll';
        
        // Determine poll status
        const pollStatus = this.pollData.isClosed ? 
            { text: '🔒 CLOSED', class: 'status-closed', detail: `Closed on ${new Date(this.pollData.closedAt).toLocaleString()}` } :
            { text: '✅ OPEN', class: 'status-open', detail: 'Accepting votes' };
        
        let content = `
            <div class="results-container">
                <h2>Results: ${this.pollData.title}</h2>
                ${this.pollData.description ? `<p>${this.pollData.description}</p>` : ''}
                <div class="poll-status">
                    <span class="status-indicator ${pollStatus.class}">${pollStatus.text}</span>
                    <span class="status-detail">${pollStatus.detail}</span>
                </div>
                <div class="results-header">
                    <span><strong>Total Votes: ${totalVotes}</strong></span>
                    <span class="auth-badge email">${authInfo}</span>
                </div>
        `;

        if (totalVotes === 0) {
            content += `
                <div class="result-item">
                    <p>No votes yet. Share the voting link to start collecting responses!</p>
                </div>
            `;
        } else {
            if (this.pollData.type === 'simple') {
                content += this.renderSimpleResults();
            } else if (this.pollData.type === 'rating') {
                content += this.renderRatingResults();
            } else if (this.pollData.type === 'ranking') {
                content += this.renderRankingResults();
            }

            // Show voter list for authenticated polls
            if (this.pollData.requireAuth) {
                content += this.renderVoterList();
                content += this.renderNonVoterList();
            }
        }

        content += `
                <div class="form-actions">
                    <button id="refresh-results-btn" class="btn btn-primary">Refresh Results</button>`;
        
        // Only show creator-only buttons to the poll creator
        if (this.pollData.createdBy === 'anonymous' || 
            (this.currentUser && this.currentUser.email === this.pollData.createdBy)) {
            content += `<button id="save-results-btn" class="btn btn-success">Save Results as Image</button>`;
            if (!this.pollData.isClosed) {
                content += `<button id="close-poll-btn" class="btn btn-danger">Close Poll</button>`;
            }
        }
        
        content += `</div>
            </div>
        `;

        container.innerHTML = content;
        this.bindResultsEvents();
    }

    renderSimpleResults() {
        const optionCounts = {};
        const totalVotes = Object.keys(this.votes).length;

        // Initialize counts
        this.pollData.options.forEach((_, index) => {
            optionCounts[index] = 0;
        });

        // Count votes
        Object.values(this.votes).forEach(vote => {
            if (vote.option !== undefined) {
                optionCounts[vote.option]++;
            }
        });

        return this.pollData.options.map((option, index) => {
            const count = optionCounts[index];
            const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
            
            return `
                <div class="result-item">
                    <div class="result-header">
                        <h4>${option}</h4>
                        <span>${count} votes</span>
                    </div>
                    <div class="result-bar">
                        <div class="result-fill" style="width: ${percentage}%"></div>
                        <div class="result-percentage">${percentage}%</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderRatingResults() {
        const optionRatings = {};
        
        // Initialize ratings
        this.pollData.options.forEach((_, index) => {
            optionRatings[index] = { total: 0, count: 0, average: 0 };
        });

        // Calculate averages
        Object.values(this.votes).forEach(vote => {
            if (vote.ratings) {
                Object.entries(vote.ratings).forEach(([optionIndex, rating]) => {
                    optionRatings[optionIndex].total += rating;
                    optionRatings[optionIndex].count++;
                });
            }
        });

        return this.pollData.options.map((option, index) => {
            const data = optionRatings[index];
            data.average = data.count > 0 ? (data.total / data.count).toFixed(1) : 0;
            const percentage = data.count > 0 ? (data.average / 5) * 100 : 0;
            
            return `
                <div class="result-item">
                    <div class="result-header">
                        <h4>${option}</h4>
                        <span>${data.count} ratings</span>
                    </div>
                    <div class="result-bar">
                        <div class="result-fill" style="width: ${percentage}%"></div>
                        <div class="result-percentage">${data.average}/5</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderRankingResults() {
        const optionScores = {};
        const totalVotes = Object.keys(this.votes).length;

        // Initialize scores
        this.pollData.options.forEach((_, index) => {
            optionScores[index] = 0;
        });

        // Calculate scores (lower rank = higher score)
        Object.values(this.votes).forEach(vote => {
            if (vote.ranking) {
                vote.ranking.forEach((optionIndex, rank) => {
                    const score = this.pollData.options.length - rank;
                    optionScores[optionIndex] += score;
                });
            }
        });

        // Sort by score
        const sortedOptions = Object.entries(optionScores)
            .map(([index, score]) => ({ index: parseInt(index), score }))
            .sort((a, b) => b.score - a.score);

        const maxScore = Math.max(...Object.values(optionScores));

        return sortedOptions.map((item, rank) => {
            const option = this.pollData.options[item.index];
            const percentage = maxScore > 0 ? Math.round((item.score / maxScore) * 100) : 0;
            
            return `
                <div class="result-item">
                    <div class="result-header">
                        <h4>#${rank + 1} ${option}</h4>
                        <span>Score: ${item.score}</span>
                    </div>
                    <div class="result-bar">
                        <div class="result-fill" style="width: ${percentage}%"></div>
                        <div class="result-percentage">${percentage}%</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderVoterList() {
        const voters = Object.entries(this.votes)
            .filter(([key, vote]) => vote.voter && !vote.voter.anonymous)
            .map(([key, vote]) => ({
                email: vote.voter.email,
                name: vote.voter.name,
                timestamp: new Date(vote.timestamp).toLocaleString()
            }))
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        if (voters.length === 0) return '';

        return `
            <div class="voter-list">
                <h4>📋 Verified Voters (${voters.length})</h4>
                ${voters.map(voter => `
                    <div class="voter-item">
                        <div class="voter-info">
                            <div class="voter-email">${voter.name || voter.email}</div>
                            <div style="font-size: 0.8em; color: #666;">${voter.email}</div>
                        </div>
                        <div class="voter-time">${voter.timestamp}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderNonVoterList() {
        // Only show for polls with email restrictions and when user is the creator
        if (!this.pollData.validEmails || this.pollData.validEmails.length === 0) {
            return '';
        }

        if (this.pollData.createdBy !== 'anonymous' && 
            (!this.currentUser || this.currentUser.email !== this.pollData.createdBy)) {
            return '';
        }

        // Get list of emails that have voted
        const voterEmails = Object.values(this.votes)
            .filter(vote => vote.voter && vote.voter.email)
            .map(vote => vote.voter.email);

        // Find emails that haven't voted
        const nonVoters = this.pollData.validEmails.filter(email => 
            !voterEmails.includes(email)
        );

        if (nonVoters.length === 0) {
            return `
                <div class="non-voter-list">
                    <h4>✅ All Invited Participants Have Voted!</h4>
                    <p class="completion-message">All ${this.pollData.validEmails.length} invited participants have submitted their votes.</p>
                </div>
            `;
        }

        return `
            <div class="non-voter-list">
                <h4>⏳ Pending Votes (${nonVoters.length} of ${this.pollData.validEmails.length})</h4>
                <p class="non-voter-description">The following invited participants have not yet voted:</p>
                <div class="non-voter-emails">
                    ${nonVoters.map(email => `
                        <div class="non-voter-item">
                            <span class="non-voter-email">${email}</span>
                            <button class="btn-small btn-secondary copy-email-btn" onclick="navigator.clipboard.writeText('${email}'); this.textContent='Copied!'; setTimeout(() => this.textContent='Copy', 2000);">Copy</button>
                        </div>
                    `).join('')}
                </div>
                <div class="participation-stats">
                    <span class="stat-item">
                        <strong>Participation Rate:</strong> 
                        ${((this.pollData.validEmails.length - nonVoters.length) / this.pollData.validEmails.length * 100).toFixed(1)}%
                        (${this.pollData.validEmails.length - nonVoters.length}/${this.pollData.validEmails.length})
                    </span>
                </div>
            </div>
        `;
    }

    // Email Authentication Methods
    updateUserInterface() {
        const userInfo = document.getElementById('user-info');
        const userEmail = document.getElementById('user-email');
        const signInBtn = document.getElementById('sign-in-btn');

        if (this.currentUser) {
            userEmail.textContent = this.currentUser.name || this.currentUser.email;
            userInfo.style.display = 'flex';
            if (signInBtn) signInBtn.style.display = 'none';
            
            // Re-attach sign out button event listener to ensure it works
            const signOutBtn = document.getElementById('sign-out-btn');
            if (signOutBtn) {
                // Remove existing listener and add fresh one
                signOutBtn.replaceWith(signOutBtn.cloneNode(true));
                document.getElementById('sign-out-btn').addEventListener('click', () => this.signOut());
            }
        } else {
            userInfo.style.display = 'none';
            if (signInBtn) signInBtn.style.display = 'block';
        }
        
        // Update auth requirement notes if visible
        this.updateAuthRequirementNotes();
    }
    
    updateAuthRequirementNotes() {
        const authRequirementNote = document.getElementById('auth-requirement-note');
        const authSignedInNote = document.getElementById('auth-signed-in-note');
        const authNotSignedInNote = document.getElementById('auth-not-signed-in-note');
        
        // Only update if the notes are currently visible
        if (authRequirementNote && authRequirementNote.style.display !== 'none') {
            if (this.currentUser) {
                if (authSignedInNote) authSignedInNote.style.display = 'block';
                if (authNotSignedInNote) authNotSignedInNote.style.display = 'none';
            } else {
                if (authSignedInNote) authSignedInNote.style.display = 'none';
                if (authNotSignedInNote) authNotSignedInNote.style.display = 'block';
            }
        }
    }

    signOut() {
        // Remove session record for this user
        if (this.currentUser && this.currentUser.email) {
            const sessionKey = `userSession_${this.currentUser.email}`;
            localStorage.removeItem(sessionKey);
        }
        
        // Clear user data
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        
        // Update UI
        this.updateUserInterface();
        
        // Always redirect to landing page after sign out
        this.showPage('landing');
        
        // If on a voting page that requires auth, redirect to show auth modal
        if (this.currentPage === 'vote' && this.pollData && this.pollData.requireAuth) {
            this.renderVotePage();
        }
    }

    getSavedEmailListKey() {
        // Return user-specific localStorage key for saved email list
        if (this.currentUser && this.currentUser.email) {
            return `savedEmailList_${this.currentUser.email}`;
        }
        return null;
    }

    setupEmailListEventListener() {
        const validEmailsTextarea = document.getElementById('valid-emails');
        if (validEmailsTextarea) {
            // Remove existing listener if any (to avoid duplicates)
            validEmailsTextarea.removeEventListener('input', this.emailListInputHandler);
            
            // Create a bound handler function that we can remove later
            this.emailListInputHandler = (e) => {
                const emailList = e.target.value.trim();
                const storageKey = this.getSavedEmailListKey();
                if (emailList && storageKey) {
                    localStorage.setItem(storageKey, emailList);
                } else if (storageKey) {
                    localStorage.removeItem(storageKey);
                }
            };
            
            // Add the new listener
            validEmailsTextarea.addEventListener('input', this.emailListInputHandler);
        }
    }

    loadSavedEmailList() {
        const validEmailsTextarea = document.getElementById('valid-emails');
        if (validEmailsTextarea) {
            const storageKey = this.getSavedEmailListKey();
            if (storageKey) {
                const savedEmailList = localStorage.getItem(storageKey);
                if (savedEmailList) {
                    validEmailsTextarea.value = savedEmailList;
                } else {
                    validEmailsTextarea.value = ''; // Clear if no saved data for this user
                }
            }
        }
    }

    isEmailAlreadyInUse(email) {
        // Check if current user is already signed in with this email
        if (this.currentUser && this.currentUser.email === email) {
            return false; // Same user trying to sign in again, allow it
        }
        
        // Check localStorage for any existing user sessions with this email
        // We'll use a simple approach: check if there's a session timestamp for this email
        // that's recent (within the last 24 hours)
        const sessionKey = `userSession_${email}`;
        const existingSession = localStorage.getItem(sessionKey);
        
        if (existingSession) {
            try {
                const sessionData = JSON.parse(existingSession);
                const sessionTime = new Date(sessionData.signedInAt);
                const now = new Date();
                const hoursDiff = (now - sessionTime) / (1000 * 60 * 60);
                
                // Consider session active if it's less than 24 hours old
                if (hoursDiff < 24) {
                    return true; // Email is already in use
                }
            } catch (error) {
                // Invalid session data, remove it
                localStorage.removeItem(sessionKey);
            }
        }
        
        return false; // Email is not in use
    }
}

// Initialize the app when the page loads (only if no server app will be created)
let app;
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit to see if server script will initialize instead
    setTimeout(() => {
        if (!window.app) {
            app = new QuickPollEmailApp();
        }
    }, 10);
});
