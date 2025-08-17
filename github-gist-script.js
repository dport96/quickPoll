// QuickPoll Application with GitHub Gist Storage
class QuickPollGitHubApp extends QuickPollEmailApp {
    constructor() {
        super();
        
        // GitHub configuration - replace with your actual token
        this.githubToken = 'ghp_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
        this.githubOwner = 'dport96'; // Your GitHub username
        this.githubRepo = 'quickPoll'; // Your repository name
        
        // Storage mode: always use GitHub Gist
        this.storageMode = 'gist';
        
        console.log('GitHub Gist storage enabled with example token - replace with your actual token');
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
        if (!this.githubToken) {
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
                
                // Store gist ID mapping locally for quick access
                const gistMapping = JSON.parse(localStorage.getItem('poll_gist_mapping') || '{}');
                gistMapping[pollData.id] = gist.id;
                localStorage.setItem('poll_gist_mapping', JSON.stringify(gistMapping));
                
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
        if (!this.githubToken || !this.pollData.gistId) {
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
                // Keep local cache for faster UI updates
                localStorage.setItem(`votes_${this.pollData.id}`, JSON.stringify(currentVotes));
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
        if (!this.githubToken) {
            return false;
        }

        // Check if we have the gist ID for this poll
        const gistMapping = JSON.parse(localStorage.getItem('poll_gist_mapping') || '{}');
        const gistId = gistMapping[pollId];

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
            
            // Store locally for offline access
            localStorage.setItem(`poll_${pollId}`, JSON.stringify(this.pollData));
            localStorage.setItem(`votes_${pollId}`, JSON.stringify(this.votes));
            
            return true;
        } catch (error) {
            console.error('Error loading poll from GitHub:', error);
            return false;
        }
    }

    // Add GitHub setup to navigation
    updateUserInterface() {
        super.updateUserInterface();
        
        // Add GitHub status indicator - always connected
        const nav = document.querySelector('.nav');
        let githubIndicator = document.getElementById('github-indicator');
        
        if (!githubIndicator) {
            githubIndicator = document.createElement('div');
            githubIndicator.id = 'github-indicator';
            githubIndicator.className = 'github-indicator';
            nav.appendChild(githubIndicator);
        }

        githubIndicator.innerHTML = `
            <span class="github-status connected" title="GitHub storage enabled">
                🔗 GitHub Connected
            </span>
        `;
    }
}

// Initialize the app with GitHub integration
document.addEventListener('DOMContentLoaded', () => {
    window.app = new QuickPollGitHubApp();
});
