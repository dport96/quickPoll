// QuickPoll Application with GitHub Gist Storage
class QuickPollGitHubApp extends QuickPollEmailApp {
    constructor() {
        super();
        
        // GitHub configuration - DO NOT commit actual tokens to repository!
        // For development: Set token via browser console: app.setGitHubToken('your_token_here')
        // For production: Use environment variables or secure token management
        this.githubToken = this.loadTokenFromStorage() || this.loadTokenFromURL() || 'GITHUB_TOKEN_NOT_SET';
        this.githubOwner = 'dport96'; // Your GitHub username
        this.githubRepo = 'quickPoll'; // Your repository name
        
        // Storage mode: always use GitHub Gist
        this.storageMode = 'gist';
        
        // If token was loaded from URL, store it securely and clean URL
        if (this.loadTokenFromURL()) {
            this.setGitHubToken(this.loadTokenFromURL());
            this.cleanTokenFromURL();
        }
    }

    // Token management methods (secure handling)
    loadTokenFromStorage() {
        // Load token from sessionStorage (not committed to repo)
        return sessionStorage.getItem('github_token') || localStorage.getItem('github_token');
    }

    loadTokenFromURL() {
        // Load token from URL query parameter
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('token') || urlParams.get('github_token');
    }

    cleanTokenFromURL() {
        // Remove token from URL for security
        const url = new URL(window.location);
        url.searchParams.delete('token');
        url.searchParams.delete('github_token');
        window.history.replaceState({}, document.title, url.toString());
    }

    setGitHubToken(token) {
        if (!token || token.length < 20) {
            console.error('Invalid GitHub token provided');
            return false;
        }
        
        // Validate token format
        const isClassicToken = token.startsWith('ghp_') && token.length >= 36;
        const isFineGrainedToken = token.startsWith('github_pat_') && token.length >= 50;
        
        if (!isClassicToken && !isFineGrainedToken) {
            console.error('Invalid GitHub token format. Tokens should start with "ghp_" (classic) or "github_pat_" (fine-grained)');
            return false;
        }
        
        // Store in sessionStorage (cleared when browser closes)
        sessionStorage.setItem('github_token', token);
        this.githubToken = token;
        
        const tokenType = isClassicToken ? 'Classic' : 'Fine-grained';
        console.log(`✅ GitHub ${tokenType} token set successfully`);
        console.log('Token preview:', token.substring(0, 15) + '...');
        
        // Update UI to show connection status
        this.updateUserInterface();
        
        return true;
    }

    clearGitHubToken() {
        sessionStorage.removeItem('github_token');
        localStorage.removeItem('github_token');
        this.githubToken = 'GITHUB_TOKEN_NOT_SET';
        console.log('GitHub token cleared');
        this.updateUserInterface();
    }

    isTokenValid() {
        if (!this.githubToken || 
            this.githubToken === 'GITHUB_TOKEN_NOT_SET' || 
            this.githubToken.includes('EXAMPLE')) {
            return false;
        }
        
        // Support both classic and fine-grained tokens
        const isClassicToken = this.githubToken.startsWith('ghp_') && this.githubToken.length >= 36;
        const isFineGrainedToken = this.githubToken.startsWith('github_pat_') && this.githubToken.length >= 50;
        
        return isClassicToken || isFineGrainedToken;
    }

    // Override the poll creation method
    async handleCreatePoll(e) {
        e.preventDefault();
        
        // Check if GitHub token is valid before allowing poll creation
        if (!this.isTokenValid()) {
            this.showTokenSetupModal();
            return;
        }
        
        const formData = new FormData(e.target);
        const authMode = formData.get('auth-mode');
        const validEmails = formData.get('validEmails');
        
        // If creating an authenticated poll, the creator must be signed in
        if (authMode === 'email' && !this.currentUser) {
            // Instead of alert, show a more user-friendly message
            const emailAuthRadio = document.querySelector('input[name="auth-mode"][value="email"]');
            if (emailAuthRadio) {
                // Switch back to anonymous
                document.querySelector('input[name="auth-mode"][value="anonymous"]').checked = true;
                this.handleAuthModeChange({ target: { value: 'anonymous' } });
                
                // Show modal with explanation
                this.showSignInForPollCreation();
                return;
            }
        }
        
        const pollData = {
            id: this.generateId(),
            title: formData.get('title'),
            description: formData.get('description'),
            type: formData.get('type'),
            requireAuth: authMode === 'email',
            validEmails: validEmails ? validEmails.split('\n').map(email => email.trim()).filter(email => email) : [],
            options: formData.getAll('option').filter(option => option.trim() !== ''),
            created: new Date().toISOString(),
            createdBy: this.currentUser ? this.currentUser.email : 'anonymous'
        };

        if (pollData.options.length < 2) {
            alert('Please add at least 2 options.');
            return;
        }

        try {
            // Store on GitHub Gist only
            const success = await this.storePollOnGitHub(pollData);
            
            if (success) {
                console.log('Poll stored on GitHub Gist successfully');
            } else {
                throw new Error('Failed to store poll on GitHub Gist');
            }
        } catch (error) {
            console.error('Error storing poll:', error);
            alert('Failed to create poll. Please check your internet connection and try again.');
            return;
        }

        this.pollData = pollData;
        this.votes = {};
        this.showPollCreatedPage();
    }

    // Override showPollCreatedPage to include GitHub token in URLs
    showPollCreatedPage() {
        const baseUrl = window.location.origin + window.location.pathname;
        
        // For GitHub Gist storage, we use the gist ID as the poll identifier
        const pollParams = new URLSearchParams();
        pollParams.set('id', this.pollData.gistId); // Use gist ID instead of poll ID
        
        // Include the GitHub token in URLs for seamless sharing
        if (this.isTokenValid()) {
            pollParams.set('token', this.githubToken);
        }
        
        const votingLink = `${baseUrl}?mode=vote&${pollParams}`;
        const resultsLink = `${baseUrl}?mode=results&${pollParams}`;

        document.getElementById('voting-link').value = votingLink;
        document.getElementById('results-link').value = resultsLink;
        document.getElementById('poll-id-value').textContent = this.pollData.gistId || this.pollData.id;

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

    // Override showCreatePage to check for GitHub token
    showCreatePage(type = 'simple') {
        // Check if GitHub token is valid before showing create page
        if (!this.isTokenValid()) {
            this.showTokenSetupModal();
            return;
        }
        
        // Call parent method if token is valid
        super.showCreatePage(type);
    }

    async storePollOnGitHub(pollData) {
        if (!this.isTokenValid()) {
            console.error('GitHub token not set or invalid. Use app.setGitHubToken("your_token") in console.');
            alert('GitHub token not configured. Please set your GitHub token first.\n\nIn browser console, run:\napp.setGitHubToken("your_github_token_here")');
            return false;
        }

        const gistData = {
            description: `QuickPoll: ${pollData.title}`,
            public: false, // Private gist
            files: {
                "poll-data.json": {
                    content: JSON.stringify(pollData, null, 2)
                },
                "votes.json": {
                    content: JSON.stringify({}, null, 2)
                },
                "metadata.json": {
                    content: JSON.stringify({
                        created: new Date().toISOString(),
                        pollId: pollData.id,
                        version: "1.0"
                    }, null, 2)
                }
            }
        };

        try {
            const response = await fetch('https://api.github.com/gists', {
                method: 'POST',
                headers: {
                    'Authorization': `token ${this.githubToken}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github.v3+json'
                },
                body: JSON.stringify(gistData)
            });

            if (response.ok) {
                const gist = await response.json();
                pollData.gistId = gist.id;
                pollData.gistUrl = gist.html_url;
                
                return true;
            } else {
                console.error('GitHub API error:', response.status, response.statusText);
                return false;
            }
        } catch (error) {
            console.error('Network error storing to GitHub:', error);
            return false;
        }
    }

    // Override vote submission
    async submitVote(voteData) {
        try {
            // Store vote on GitHub only
            const success = await this.submitVoteToGitHub(voteData);
            
            if (!success) {
                throw new Error('Failed to submit vote to GitHub');
            }
        } catch (error) {
            console.error('Error submitting vote:', error);
            alert('Failed to submit vote. Please check your internet connection and try again.');
            return;
        }

        this.showPage('vote');
        this.renderVotePage();
    }

    async submitVoteToGitHub(voteData) {
        if (!this.isTokenValid() || !this.pollData.gistId) {
            if (!this.isTokenValid()) {
                console.error('GitHub token not set or invalid');
            }
            return false;
        }

        try {
            // Get current gist
            const response = await fetch(`https://api.github.com/gists/${this.pollData.gistId}`, {
                headers: {
                    'Authorization': `token ${this.githubToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!response.ok) {
                return false;
            }

            const gist = await response.json();
            
            // Parse current votes
            const currentVotes = JSON.parse(gist.files['votes.json'].content);
            
            // Add new vote
            const voteKey = this.pollData.requireAuth && this.currentUser 
                ? this.currentUser.email 
                : `anonymous_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            currentVotes[voteKey] = {
                ...voteData,
                timestamp: new Date().toISOString(),
                voter: this.pollData.requireAuth && this.currentUser 
                    ? { email: this.currentUser.email, name: this.currentUser.name }
                    : 'anonymous'
            };

            // Update gist
            const updateData = {
                files: {
                    "votes.json": {
                        content: JSON.stringify(currentVotes, null, 2)
                    }
                }
            };

            const updateResponse = await fetch(`https://api.github.com/gists/${this.pollData.gistId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `token ${this.githubToken}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github.v3+json'
                },
                body: JSON.stringify(updateData)
            });

            if (updateResponse.ok) {
                this.votes = currentVotes;
                return true;
            } else {
                return false;
            }
        } catch (error) {
            console.error('Error submitting vote to GitHub:', error);
            return false;
        }
    }

    // Override poll loading from parameters
    async loadPollFromParams(params) {
        try {
            // Extract poll ID (which is now a gist ID for GitHub storage)
            const pollId = params.get('id');
            
            if (pollId) {
                const success = await this.loadPollFromGitHub(pollId);
                
                if (success) {
                    return; // Successfully loaded from GitHub
                }
            }
            
            // Fallback to original URL parameter loading if GitHub fails
            super.loadPollFromParams(params);
        } catch (error) {
            console.error('Error loading poll from GitHub:', error);
            // Fallback to original method
            super.loadPollFromParams(params);
        }
    }

    async loadPollFromGitHub(pollId) {
        if (!this.isTokenValid()) {
            console.error('GitHub token not set or invalid for poll loading');
            console.log('To view polls stored on GitHub Gist:');
            console.log('1. Set your token: app.setGitHubToken("your_token")');
            console.log('2. Or create a token at: https://github.com/settings/tokens');
            
            // Show user-friendly message
            const pollNotFoundDiv = document.getElementById('vote-content') || document.getElementById('results-content');
            if (pollNotFoundDiv) {
                pollNotFoundDiv.innerHTML = `
                    <div class="error-message">
                        <h2>⚠️ GitHub Token Required</h2>
                        <p>To view polls stored on GitHub Gist, you need to set your GitHub Personal Access Token.</p>
                        <div class="setup-instructions">
                            <h3>Quick Setup:</h3>
                            <ol>
                                <li>Go to <a href="https://github.com/settings/tokens" target="_blank">GitHub Settings → Personal Access Tokens</a></li>
                                <li>Generate a new token (classic or fine-grained) with "gist" scope</li>
                                <li>Open browser console (F12) and run:<br>
                                    <code>app.setGitHubToken("your_token_here")</code></li>
                                <li>Refresh this page</li>
                            </ol>
                            <p><small>Supported formats: ghp_xxx (classic) or github_pat_xxx (fine-grained)</small></p>
                        </div>
                        <p><small>Your token will be stored securely in your browser session only.</small></p>
                    </div>
                `;
            }
            
            return false;
        }

        // Note: Polls are loaded directly by gist ID
        // No local mapping needed with GitHub storage
        
        // Extract gist ID from URL or receive it directly
        const gistId = pollId; // Assuming pollId is now the gist ID

        if (!gistId) {
            console.error('No gist ID provided for poll loading');
            return false;
        }

        console.log(`Attempting to load poll from GitHub Gist: ${gistId}`);

        try {
            const response = await fetch(`https://api.github.com/gists/${gistId}`, {
                headers: {
                    'Authorization': `token ${this.githubToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!response.ok) {
                console.error(`Failed to load gist: ${response.status} ${response.statusText}`);
                if (response.status === 404) {
                    console.error('Gist not found - check if the poll ID is correct');
                } else if (response.status === 401) {
                    console.error('Unauthorized - check if your GitHub token is valid');
                }
                return false;
            }

            const gist = await response.json();
            
            // Verify this is a QuickPoll gist
            if (!gist.files['poll-data.json'] || !gist.files['votes.json']) {
                console.error('Invalid gist format - missing required poll files');
                return false;
            }
            
            // Parse poll data and votes
            this.pollData = JSON.parse(gist.files['poll-data.json'].content);
            this.votes = JSON.parse(gist.files['votes.json'].content);
            
            // Store the gist ID in pollData for future operations
            this.pollData.gistId = gistId;
            this.pollData.gistUrl = gist.html_url;
            
            console.log('✅ Poll loaded successfully from GitHub Gist');
            console.log(`   Poll: ${this.pollData.title}`);
            console.log(`   Gist ID: ${gistId}`);
            console.log(`   Votes: ${Object.keys(this.votes).length}`);
            
            return true;
        } catch (error) {
            console.error('Error loading poll from GitHub:', error);
            
            if (error.message.includes('JSON')) {
                console.error('Invalid poll data format in gist');
            } else if (error.message.includes('network') || error.message.includes('fetch')) {
                console.error('Network error - check your internet connection');
            }
            
            return false;
        }
    }

    // Add GitHub setup to navigation
    updateUserInterface() {
        super.updateUserInterface();
        
        // Add GitHub status indicator
        const nav = document.querySelector('.nav');
        let githubIndicator = document.getElementById('github-indicator');
        
        if (!githubIndicator) {
            githubIndicator = document.createElement('div');
            githubIndicator.id = 'github-indicator';
            githubIndicator.className = 'github-indicator';
            nav.appendChild(githubIndicator);
        }

        if (this.isTokenValid()) {
            githubIndicator.innerHTML = `
                <span class="github-status connected" title="GitHub storage enabled - Token configured">
                    🔗 GitHub Connected
                </span>
            `;
        } else {
            githubIndicator.innerHTML = `
                <span class="github-status disconnected" title="Click to configure GitHub token" 
                      onclick="app.showTokenSetupModal()" style="cursor: pointer;">
                    ⚠️ Setup GitHub Token
                </span>
            `;
        }
    }

    showTokenSetupHelp() {
        const helpMessage = `
GitHub Token Setup Required

To use GitHub Gist storage, you need to set your Personal Access Token.

Steps:
1. Go to: https://github.com/settings/tokens
2. Generate a new token with "gist" scope
3. In this browser console, run:
   app.setGitHubToken("your_token_here")

The token will be stored securely in your browser session.

Note: When you create polls, the generated URLs will include your token
for seamless sharing. Recipients can view and vote without setting up tokens.
        `;
        
        alert(helpMessage);
        console.log('📝 GitHub Token Setup Instructions:');
        console.log('1. Go to: https://github.com/settings/tokens');
        console.log('2. Generate a new token with "gist" scope');
        console.log('3. Run: app.setGitHubToken("your_token_here")');
        console.log('4. Generated poll URLs will include the token for easy sharing');
    }

    // GitHub Token Setup Modal
    showTokenSetupModal() {
        const modal = document.getElementById('github-token-modal');
        if (modal) {
            modal.style.display = 'flex';
            
            // Focus on the token input
            setTimeout(() => {
                const tokenInput = document.getElementById('github-token-input');
                if (tokenInput) tokenInput.focus();
            }, 100);
        }
    }

    hideTokenSetupModal() {
        const modal = document.getElementById('github-token-modal');
        if (modal) {
            modal.style.display = 'none';
            // Clear any validation messages
            const validationResult = document.getElementById('token-validation-result');
            if (validationResult) {
                validationResult.style.display = 'none';
            }
        }
    }

    async validateAndSaveToken(token) {
        const validationResult = document.getElementById('token-validation-result');
        const saveButton = document.getElementById('save-token-btn');
        const buttonText = saveButton.querySelector('.btn-text');
        const buttonLoading = saveButton.querySelector('.btn-loading');
        
        // Show loading state
        buttonText.style.display = 'none';
        buttonLoading.style.display = 'inline-flex';
        saveButton.disabled = true;
        
        // Validate token format first
        if (!token) {
            this.showValidationResult('error', '❌ Please enter a GitHub token.');
            this.resetButtonState();
            return false;
        }
        
        // Check for both classic and fine-grained token formats
        const isClassicToken = token.startsWith('ghp_') && token.length >= 36;
        const isFineGrainedToken = token.startsWith('github_pat_') && token.length >= 50;
        
        if (!isClassicToken && !isFineGrainedToken) {
            this.showValidationResult('error', '❌ Invalid token format. GitHub tokens should start with "ghp_" (classic) or "github_pat_" (fine-grained).');
            this.resetButtonState();
            return false;
        }
        
        try {
            // Test the token by making a simple API call
            const response = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (response.ok) {
                const userData = await response.json();
                
                // Check if token has gist scope by trying to list gists
                const gistResponse = await fetch('https://api.github.com/gists', {
                    headers: {
                        'Authorization': `token ${token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
                
                if (gistResponse.ok) {
                    // Token is valid and has gist scope
                    this.setGitHubToken(token);
                    this.showValidationResult('success', `✅ Token validated successfully! Authenticated as ${userData.login}.`);
                    
                    // Close modal after a brief delay
                    setTimeout(() => {
                        this.hideTokenSetupModal();
                        
                        // Show success message in main UI
                        const githubIndicator = document.getElementById('github-indicator');
                        if (githubIndicator) {
                            githubIndicator.innerHTML = `
                                <span class="github-status connected" title="GitHub storage enabled - Token configured">
                                    ✅ Connected as ${userData.login}
                                </span>
                            `;
                        }
                    }, 2000);
                    
                    return true;
                } else {
                    this.showValidationResult('error', '❌ Token does not have "gist" scope. Please create a new token with gist permissions.');
                    this.resetButtonState();
                    return false;
                }
            } else {
                if (response.status === 401) {
                    this.showValidationResult('error', '❌ Invalid or expired token. Please check your token and try again.');
                } else {
                    this.showValidationResult('error', `❌ Failed to validate token (${response.status}). Please try again.`);
                }
                this.resetButtonState();
                return false;
            }
        } catch (error) {
            this.showValidationResult('error', '❌ Network error while validating token. Please check your internet connection and try again.');
            this.resetButtonState();
            return false;
        }
    }

    showValidationResult(type, message) {
        const validationResult = document.getElementById('token-validation-result');
        if (validationResult) {
            validationResult.className = `validation-result ${type}`;
            validationResult.textContent = message;
            validationResult.style.display = 'block';
        }
    }

    resetButtonState() {
        const saveButton = document.getElementById('save-token-btn');
        const buttonText = saveButton.querySelector('.btn-text');
        const buttonLoading = saveButton.querySelector('.btn-loading');
        
        buttonText.style.display = 'inline';
        buttonLoading.style.display = 'none';
        saveButton.disabled = false;
    }

    setupTokenModalEventListeners() {
        // Close modal events
        const closeBtn = document.getElementById('close-token-modal');
        const cancelBtn = document.getElementById('cancel-token-setup');
        const modal = document.getElementById('github-token-modal');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideTokenSetupModal());
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.hideTokenSetupModal());
        }
        
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideTokenSetupModal();
                }
            });
        }
        
        // Token form submission
        const tokenForm = document.getElementById('github-token-form');
        if (tokenForm) {
            tokenForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const token = document.getElementById('github-token-input').value.trim();
                await this.validateAndSaveToken(token);
            });
        }
        
        // Toggle token visibility
        const toggleBtn = document.getElementById('toggle-token-visibility');
        const tokenInput = document.getElementById('github-token-input');
        if (toggleBtn && tokenInput) {
            toggleBtn.addEventListener('click', () => {
                if (tokenInput.type === 'password') {
                    tokenInput.type = 'text';
                    toggleBtn.textContent = '🙈 Hide';
                } else {
                    tokenInput.type = 'password';
                    toggleBtn.textContent = '👁️ Show';
                }
            });
        }
        
        // GitHub status indicator click
        const updateGitHubStatusClick = () => {
            const githubIndicator = document.getElementById('github-indicator');
            if (githubIndicator) {
                const statusElement = githubIndicator.querySelector('.github-status.disconnected');
                if (statusElement) {
                    statusElement.removeEventListener('click', this.showTokenSetupModal.bind(this));
                    statusElement.addEventListener('click', this.showTokenSetupModal.bind(this));
                }
            }
        };
        
        // Initial setup and update when UI changes
        updateGitHubStatusClick();
        
        // Override updateUserInterface to ensure click handlers are always attached
        const originalUpdateUI = this.updateUserInterface.bind(this);
        this.updateUserInterface = () => {
            originalUpdateUI();
            setTimeout(updateGitHubStatusClick, 100);
        };
    }
}

// Initialize the app with GitHub integration
document.addEventListener('DOMContentLoaded', () => {
    window.app = new QuickPollGitHubApp();
    
    // Setup token modal event listeners
    if (window.app.setupTokenModalEventListeners) {
        window.app.setupTokenModalEventListeners();
    }
});
