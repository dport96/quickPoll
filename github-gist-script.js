// QuickPoll Application with GitHub Gist Storage
class QuickPollGitHubApp extends QuickPollEmailApp {
    constructor() {
        super();
        
        // GitHub configuration - DO NOT commit actual tokens to repository!
        // For development: Set token via browser console: app.setGitHubToken('your_token_here')
        // For production: Use environment variables or secure token management
        this.githubToken = this.loadTokenFromStorage() || 'GITHUB_TOKEN_NOT_SET';
        this.githubOwner = 'dport96'; // Your GitHub username
        this.githubRepo = 'quickPoll'; // Your repository name
        
        // Storage mode: always use GitHub Gist
        this.storageMode = 'gist';
    }

    // Token management methods (secure handling)
    loadTokenFromStorage() {
        // Load token from sessionStorage (not committed to repo)
        return sessionStorage.getItem('github_token') || localStorage.getItem('github_token');
    }

    setGitHubToken(token) {
        if (!token || token.length < 20) {
            console.error('Invalid GitHub token provided');
            return false;
        }
        
        // Store in sessionStorage (cleared when browser closes)
        sessionStorage.setItem('github_token', token);
        this.githubToken = token;
        
        console.log('✅ GitHub token set successfully');
        console.log('Token preview:', token.substring(0, 10) + '...');
        
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
        return this.githubToken && 
               this.githubToken !== 'GITHUB_TOKEN_NOT_SET' && 
               this.githubToken.length > 20 &&
               !this.githubToken.includes('EXAMPLE');
    }

    // Override the poll creation method
    async handleCreatePoll(e) {
        e.preventDefault();
        
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
            // First try to load from GitHub
            const pollId = params.get('id');
            const success = await this.loadPollFromGitHub(pollId);
            
            if (!success) {
                // Fallback to original URL parameter loading
                super.loadPollFromParams(params);
            }
        } catch (error) {
            console.error('Error loading poll from GitHub:', error);
            // Fallback to original method
            super.loadPollFromParams(params);
        }
    }

    async loadPollFromGitHub(pollId) {
        if (!this.isTokenValid()) {
            console.error('GitHub token not set or invalid');
            return false;
        }

        // Note: Polls are loaded directly by gist ID
        // No local mapping needed with GitHub storage
        
        // Extract gist ID from URL or receive it directly
        const gistId = pollId; // Assuming pollId is now the gist ID

        if (!gistId) {
            return false;
        }

        try {
            const response = await fetch(`https://api.github.com/gists/${gistId}`, {
                headers: {
                    'Authorization': `token ${this.githubToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!response.ok) {
                return false;
            }

            const gist = await response.json();
            
            // Parse poll data and votes
            this.pollData = JSON.parse(gist.files['poll-data.json'].content);
            this.votes = JSON.parse(gist.files['votes.json'].content);
            
            return true;
        } catch (error) {
            console.error('Error loading poll from GitHub:', error);
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
                <span class="github-status disconnected" title="GitHub token not configured" 
                      onclick="app.showTokenSetupHelp()" style="cursor: pointer;">
                    ⚠️ GitHub Token Required
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
        `;
        
        alert(helpMessage);
        console.log('📝 GitHub Token Setup Instructions:');
        console.log('1. Go to: https://github.com/settings/tokens');
        console.log('2. Generate a new token with "gist" scope');
        console.log('3. Run: app.setGitHubToken("your_token_here")');
    }
}

// Initialize the app with GitHub integration
document.addEventListener('DOMContentLoaded', () => {
    window.app = new QuickPollGitHubApp();
});
