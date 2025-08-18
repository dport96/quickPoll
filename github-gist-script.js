// QuickPoll Application with GitHub Gist Storage
class QuickPollGitHubApp extends QuickPollEmailApp {
    constructor() {
        // Call super constructor first
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

    // Override parent's init method to use async initialization
    init() {
        this.initializeAsync();
    }

    async initializeAsync() {
        // Call parent methods manually to maintain control
        this.bindEvents();
        
        // Check for existing auth first
        this.checkExistingAuth();
        
        // Handle URL parameters with async loading
        const params = new URLSearchParams(window.location.search);
        const mode = params.get('mode');
        const pollId = params.get('id');

        if (mode && pollId) {
            // We have a poll to load
            await this.parseQueryString();
        } else {
            // No poll to load, show default page
            this.showPage(this.currentPage);
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

    // Override showResultsPage to handle GitHub Gist IDs
    showResultsPage() {
        if (!this.isTokenValid()) {
            // Show token setup modal if no valid token
            this.showTokenSetupModal();
            return;
        }

        const gistId = prompt('Enter Poll ID (Gist ID) to view results:');
        if (gistId) {
            window.location.href = `?mode=results&id=${gistId}&token=${this.githubToken}`;
        }
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
        // Extract poll ID (which is now a gist ID for GitHub storage)
        const pollId = params.get('id');
        
        if (!pollId) {
            throw new Error('No poll ID provided');
        }
        
        const success = await this.loadPollFromGitHub(pollId);
        
        if (!success) {
            throw new Error(`Failed to load poll from GitHub Gist: ${pollId}`);
        }
    }

    // Override parseQueryString to handle async poll loading
    async parseQueryString() {
        const params = new URLSearchParams(window.location.search);
        const mode = params.get('mode');
        const pollId = params.get('id');

        if (mode && pollId) {
            console.log(`Loading poll from GitHub: mode=${mode}, id=${pollId}`);
            
            // Show loading state
            this.showLoadingState(mode);
            
            try {
                await this.loadPollFromParams(params);
                
                // Set the current page after successful loading
                if (mode === 'vote') {
                    this.currentPage = 'vote';
                } else if (mode === 'results') {
                    this.currentPage = 'results';
                    // For results page, always refresh vote data from GitHub
                    console.log('Refreshing votes for results page...');
                    const refreshSuccess = await this.refreshVotesFromGitHub();
                    if (!refreshSuccess) {
                        console.warn('Failed to refresh votes, using loaded vote data');
                    }
                }
                
                // Now show the page with loaded data
                this.showPage(this.currentPage);
                
            } catch (error) {
                console.error('Error loading poll:', error);
                this.showPollLoadError(mode, pollId, error.message);
            }
        }
    }

    // Method to refresh votes from GitHub Gist
    async refreshVotesFromGitHub() {
        if (!this.pollData?.gistId || !this.isTokenValid()) {
            console.warn('Cannot refresh votes: missing gist ID or invalid token');
            return false;
        }

        try {
            console.log(`🔄 Refreshing votes from GitHub Gist: ${this.pollData.gistId}`);
            const response = await fetch(`https://api.github.com/gists/${this.pollData.gistId}`, {
                headers: {
                    'Authorization': `token ${this.githubToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (response.ok) {
                const gist = await response.json();
                if (gist.files['votes.json']) {
                    const newVotes = JSON.parse(gist.files['votes.json'].content);
                    this.votes = newVotes;
                    console.log(`✅ Votes refreshed from GitHub: ${Object.keys(this.votes).length} votes found`);
                    return true;
                } else {
                    console.warn('⚠️ votes.json file not found in Gist');
                    return false;
                }
            } else {
                console.warn('Failed to refresh votes from GitHub:', response.status, response.statusText);
                return false;
            }
        } catch (error) {
            console.warn('Error refreshing votes from GitHub:', error);
            return false;
        }
    }

    // Override renderResultsPage to ensure we're using GitHub data
    renderResultsPage() {
        console.log('🔍 Rendering results page with GitHub data...');
        console.log('   Poll data:', this.pollData ? this.pollData.title : 'null');
        console.log('   Votes data:', this.votes ? Object.keys(this.votes).length : 'null', 'votes');
        console.log('   Storage mode:', this.storageMode);
        
        // Ensure we're not using any localStorage data for GitHub polls
        if (this.storageMode === 'gist' && this.pollData) {
            // Clear any localStorage votes that might interfere
            const votesKey = `votes_${this.pollData.id}`;
            if (localStorage.getItem(votesKey)) {
                console.log('   Clearing localStorage votes (GitHub mode)');
                localStorage.removeItem(votesKey);
            }
        }
        
        // Call parent method with our GitHub-loaded data
        super.renderResultsPage();
        
        // For GitHub storage, replace the refresh button to use our method
        this.replaceRefreshButton();
    }

    replaceRefreshButton() {
        // Find the refresh button and replace its onclick handler
        const refreshButton = document.querySelector('button[onclick="location.reload()"]');
        if (refreshButton) {
            refreshButton.onclick = () => this.refreshResults();
            refreshButton.innerHTML = '🔄 Refresh from GitHub';
            refreshButton.title = 'Refresh vote data from GitHub Gist';
        }
    }

    async refreshResults() {
        const refreshButton = document.querySelector('button[onclick="location.reload()"]') || 
                            document.querySelector('.btn[title="Refresh vote data from GitHub Gist"]');
        if (refreshButton) {
            const originalText = refreshButton.innerHTML;
            refreshButton.innerHTML = '⏳ Refreshing...';
            refreshButton.disabled = true;
        }

        try {
            await this.refreshVotesFromGitHub();
            this.renderResultsPage();
        } catch (error) {
            console.error('Error refreshing results:', error);
            alert('Failed to refresh results from GitHub. Please try again.');
        } finally {
            if (refreshButton) {
                refreshButton.innerHTML = '🔄 Refresh from GitHub';
                refreshButton.disabled = false;
            }
        }
    }

    showLoadingState(mode) {
        const pageId = mode === 'vote' ? 'vote' : 'results';
        const container = document.getElementById(`${pageId}-content`);
        
        if (container) {
            container.innerHTML = `
                <div class="${pageId}-container">
                    <div class="loading-state">
                        <h2>⏳ Loading Poll...</h2>
                        <p>Fetching poll data from GitHub Gist...</p>
                        <div class="loading-spinner"></div>
                    </div>
                </div>
            `;
        }
    }

    showPollLoadError(mode, pollId, errorMessage = null) {
        const pageId = mode === 'vote' ? 'vote' : 'results';
        const container = document.getElementById(`${pageId}-content`);
        
        if (container) {
            // Determine specific error message
            let specificError = 'The requested poll could not be found.';
            let troubleshooting = [];
            
            if (!this.isTokenValid()) {
                specificError = 'GitHub token is not configured or invalid.';
                troubleshooting = [
                    'Set up your GitHub Personal Access Token',
                    'Go to GitHub Settings → Personal Access Tokens',
                    'Generate a token with "gist" scope',
                    'Set token using: app.setGitHubToken("your_token")'
                ];
            } else if (errorMessage && errorMessage.includes('404')) {
                specificError = 'Poll not found - the Gist ID may be incorrect or the poll may have been deleted.';
                troubleshooting = [
                    'Check if the poll URL is correct',
                    'Verify the poll creator shared the right link',
                    'The poll may have been deleted by its creator'
                ];
            } else if (errorMessage && errorMessage.includes('401')) {
                specificError = 'Access denied - your GitHub token may not have permission to access this poll.';
                troubleshooting = [
                    'Check if your GitHub token is valid',
                    'Ensure the token has "gist" scope',
                    'The poll may be private and not accessible to you'
                ];
            } else if (errorMessage && errorMessage.includes('network')) {
                specificError = 'Network error - unable to connect to GitHub.';
                troubleshooting = [
                    'Check your internet connection',
                    'GitHub may be temporarily unavailable',
                    'Try refreshing the page'
                ];
            } else {
                troubleshooting = [
                    'Check if your GitHub token is valid',
                    'Verify the poll URL is correct',
                    'Try refreshing the page',
                    'Contact the poll creator if the issue persists'
                ];
            }
            
            container.innerHTML = `
                <div class="${pageId}-container">
                    <div class="error-message">
                        <h2>❌ Poll Not Found</h2>
                        <p class="error-description">${specificError}</p>
                        ${pollId ? `<p><strong>Poll ID:</strong> ${pollId}</p>` : ''}
                        
                        ${troubleshooting.length > 0 ? `
                        <div class="error-details">
                            <p><strong>What you can try:</strong></p>
                            <ul>
                                ${troubleshooting.map(item => `<li>${item}</li>`).join('')}
                            </ul>
                        </div>
                        ` : ''}
                        
                        <div class="error-actions">
                            <button onclick="window.location.reload()" class="btn btn-primary">
                                🔄 Retry Loading
                            </button>
                            ${!this.isTokenValid() ? `
                            <button onclick="app.showTokenSetupModal()" class="btn btn-secondary">
                                🔧 Set Up GitHub Token
                            </button>
                            ` : ''}
                            <button onclick="location.href='./'" class="btn btn-secondary">
                                🏠 Go Home
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    async loadPollFromGitHub(pollId) {
        if (!this.isTokenValid()) {
            console.error('GitHub token not set or invalid for poll loading');
            throw new Error('GitHub token not configured or invalid. Please set up your GitHub Personal Access Token.');
        }

        // Note: Polls are loaded directly by gist ID
        // No local mapping needed with GitHub storage
        
        // Extract gist ID from URL or receive it directly
        const gistId = pollId; // Assuming pollId is now the gist ID

        if (!gistId) {
            throw new Error('No Gist ID provided for poll loading');
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
                const errorMessage = `HTTP ${response.status}: ${response.statusText}`;
                console.error(`Failed to load gist: ${errorMessage}`);
                
                if (response.status === 404) {
                    throw new Error('404: Poll not found. The Gist ID may be incorrect or the poll may have been deleted.');
                } else if (response.status === 401) {
                    throw new Error('401: Access denied. Check if your GitHub token is valid and has the correct permissions.');
                } else if (response.status === 403) {
                    throw new Error('403: Forbidden. Your GitHub token may not have access to this poll.');
                } else {
                    throw new Error(`GitHub API error: ${errorMessage}`);
                }
            }

            const gist = await response.json();
            
            // Verify this is a QuickPoll gist
            if (!gist.files['poll-data.json'] || !gist.files['votes.json']) {
                throw new Error('Invalid poll format: This Gist is not a valid QuickPoll.');
            }
            
            // Parse poll data and votes
            try {
                this.pollData = JSON.parse(gist.files['poll-data.json'].content);
                this.votes = JSON.parse(gist.files['votes.json'].content);
            } catch (parseError) {
                throw new Error('Invalid poll data: Unable to parse poll content from Gist.');
            }
            
            // Store the gist ID in pollData for future operations
            this.pollData.gistId = gistId;
            this.pollData.gistUrl = gist.html_url;
            
            console.log('✅ Poll loaded successfully from GitHub Gist');
            console.log(`   Poll: ${this.pollData.title}`);
            console.log(`   Gist ID: ${gistId}`);
            console.log(`   Votes: ${Object.keys(this.votes).length}`);
            
            return true;
        } catch (error) {
            // Re-throw our custom errors
            if (error.message.includes('404:') || error.message.includes('401:') || error.message.includes('403:') || error.message.includes('Invalid poll')) {
                throw error;
            }
            
            // Handle network and other errors
            if (error.name === 'TypeError' || error.message.includes('fetch')) {
                throw new Error('network: Unable to connect to GitHub. Check your internet connection.');
            }
            
            // Generic error
            throw new Error(`Unexpected error loading poll: ${error.message}`);
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
