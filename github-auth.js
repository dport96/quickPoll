/**
 * GitHub Authentication Handler for QuickPoll
 * Handles GitHub token management for API access
 */
class GitHubAuth {
    constructor() {
        this.storageKey = 'github_token';
        this.userKey = 'github_user';
        
        // Check if we have a saved user
        this.loadSavedUser();
    }

    /**
     * Load saved user from localStorage
     */
    loadSavedUser() {
        const saved = localStorage.getItem(this.userKey);
        if (saved) {
            try {
                this.currentUser = JSON.parse(saved);
            } catch (e) {
                console.error('Error loading saved user:', e);
                this.currentUser = null;
            }
        }
    }

    /**
     * Save user to localStorage
     */
    saveUser(user) {
        this.currentUser = user;
        localStorage.setItem(this.userKey, JSON.stringify(user));
    }

    /**
     * Prompt user for Personal Access Token
     */
    async promptForToken() {
        const instructions = `To use QuickPoll, you need a GitHub Personal Access Token.

Steps to create one:
1. Go to: https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Give it a name like "QuickPoll"
4. Select scope: "public_repo"
5. Click "Generate token"
6. Copy the token and paste it below

Note: The token will be stored locally in your browser.`;

        alert(instructions);
        
        const token = prompt('Enter your GitHub Personal Access Token:');
        
        if (!token || token.trim() === '') {
            return false;
        }

        try {
            // Verify token by making a test request
            const api = new GitHubAPIClient();
            api.saveToken(token.trim());
            
            const user = await api.getCurrentUser();
            
            // Save user info
            this.saveUser({
                login: user.login,
                name: user.name || user.login,
                email: user.email || `${user.login}@users.noreply.github.com`,
                avatarUrl: user.avatar_url,
                profileUrl: user.html_url
            });
            
            console.log('✅ Authenticated as:', user.login);
            return true;
            
        } catch (error) {
            console.error('❌ Authentication failed:', error);
            alert(`Authentication failed: ${error.message}\n\nPlease make sure your token has the "public_repo" scope.`);
            
            // Clear invalid token
            const api = new GitHubAPIClient();
            api.clearToken();
            
            return false;
        }
    }

    /**
     * Sign in - prompt for token if needed
     */
    async signIn() {
        if (this.isAuthenticated()) {
            return true;
        }

        return await this.promptForToken();
    }

    /**
     * Sign out - clear token and user data
     */
    signOut() {
        const api = new GitHubAPIClient();
        api.clearToken();
        localStorage.removeItem(this.userKey);
        this.currentUser = null;
        console.log('👋 Signed out');
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        const api = new GitHubAPIClient();
        return !!api.token && !!this.currentUser;
    }

    /**
     * Get current user
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Re-authenticate if token is invalid
     */
    async reAuthenticate() {
        this.signOut();
        return await this.signIn();
    }

    /**
     * Check authentication status and refresh user data
     */
    async checkAuth() {
        if (!this.isAuthenticated()) {
            return false;
        }

        try {
            const api = new GitHubAPIClient();
            const user = await api.getCurrentUser();
            
            // Update saved user info
            this.saveUser({
                login: user.login,
                name: user.name || user.login,
                email: user.email || `${user.login}@users.noreply.github.com`,
                avatarUrl: user.avatar_url,
                profileUrl: user.html_url
            });
            
            return true;
            
        } catch (error) {
            console.error('Auth check failed:', error);
            
            // If unauthorized, clear auth and prompt for new token
            if (error.message.includes('401')) {
                console.log('Token expired or invalid, prompting for new token...');
                return await this.reAuthenticate();
            }
            
            return false;
        }
    }

    /**
     * Get voter identifier for current user
     */
    getVoterIdentifier() {
        if (!this.isAuthenticated()) {
            return null;
        }
        
        return this.currentUser.email.toLowerCase();
    }

    /**
     * Get display name for current user
     */
    getDisplayName() {
        if (!this.isAuthenticated()) {
            return null;
        }
        
        return this.currentUser.name || this.currentUser.login;
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.GitHubAuth = GitHubAuth;
}
