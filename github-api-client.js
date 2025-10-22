/**
 * GitHub API Client for QuickPoll
 * Handles all interactions with GitHub Issues API for data persistence
 */
class GitHubAPIClient {
    constructor() {
        // GitHub repository configuration
        this.owner = window.GITHUB_CONFIG?.owner || 'dport96';
        this.repo = window.GITHUB_CONFIG?.repo || 'quickPoll';
        this.apiBase = 'https://api.github.com';
        this.token = null;
        
        // Load token from localStorage if available
        this.loadToken();
    }

    /**
     * Load GitHub token from localStorage
     */
    loadToken() {
        const stored = localStorage.getItem('github_token');
        if (stored) {
            this.token = stored;
        }
    }

    /**
     * Save GitHub token to localStorage
     */
    saveToken(token) {
        this.token = token;
        localStorage.setItem('github_token', token);
    }

    /**
     * Clear GitHub token
     */
    clearToken() {
        this.token = null;
        localStorage.removeItem('github_token');
    }

    /**
     * Make authenticated request to GitHub API
     */
    async makeRequest(endpoint, options = {}) {
        // Always reload token from localStorage before each request
        this.loadToken();
        const url = `${this.apiBase}${endpoint}`;
        const headers = {
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (!this.token) {
            alert('Authentication required: Please sign in with your GitHub token.');
            throw new Error('Requires authentication');
        }
        headers['Authorization'] = `token ${this.token}`;

        const response = await fetch(url, {
            ...options,
            headers
        });

        if (!response.ok) {
            let errorMessage = `GitHub API error: ${response.status}`;
            try {
                const error = await response.json();
                errorMessage = error.message || errorMessage;
            } catch (e) {
                // Could not parse error response
            }
            throw new Error(errorMessage);
        }

        return response.json();
    }

    /**
     * Get current authenticated user
     */
    async getCurrentUser() {
        return this.makeRequest('/user');
    }

    /**
     * Create a new poll as a GitHub Issue
     */
    async createPoll(pollData) {
        const issue = {
            title: `Poll: ${pollData.title}`,
            body: this.formatPollBody(pollData),
            labels: ['quickpoll', 'poll', 'active']
        };

        return this.makeRequest(`/repos/${this.owner}/${this.repo}/issues`, {
            method: 'POST',
            body: JSON.stringify(issue)
        });
    }

    /**
     * Format poll data as issue body
     */
    formatPollBody(pollData) {
        let body = `## ${pollData.title}\n\n`;
        
        if (pollData.description) {
            body += `${pollData.description}\n\n`;
        }

        body += `### Options\n\n`;
        pollData.options.forEach((option, index) => {
            body += `${index + 1}. ${option}\n`;
        });

        body += `\n### Poll Configuration\n\n`;
        body += `- **Created By**: ${pollData.createdBy}\n`;
        body += `- **Created At**: ${new Date().toISOString()}\n`;
        body += `- **Type**: ${pollData.type || 'simple'}\n`;
        body += `- **Require Auth**: ${pollData.requireAuth || false}\n`;
        
        if (pollData.validEmails && pollData.validEmails.length > 0) {
            body += `- **Authorized Emails**: ${pollData.validEmails.join(', ')}\n`;
        }

        body += `\n---\n\n`;
        body += `<!-- POLL_DATA\n`;
        body += JSON.stringify(pollData, null, 2);
        body += '\n-->\n';

        return body;
    }

    /**
     * Get active poll (most recent open issue with 'poll' and 'active' labels)
     */
    async getActivePoll() {
        const issues = await this.makeRequest(
            `/repos/${this.owner}/${this.repo}/issues?labels=quickpoll,poll,active&state=open&per_page=1&sort=created&direction=desc`
        );

        if (issues.length === 0) {
            return null;
        }

        return this.parseIssueToPoll(issues[0]);
    }

    /**
     * Get poll by issue number
     */
    async getPoll(issueNumber) {
        const issue = await this.makeRequest(
            `/repos/${this.owner}/${this.repo}/issues/${issueNumber}`
        );
        return this.parseIssueToPoll(issue);
    }

    /**
     * Parse GitHub issue to poll data
     */
    parseIssueToPoll(issue) {
        // Extract JSON data from issue body (in HTML comment)
        const jsonMatch = issue.body.match(/<!-- POLL_DATA\n([\s\S]*?)\n-->/);
        if (!jsonMatch) {
            throw new Error('Invalid poll data format');
        }

        const pollData = JSON.parse(jsonMatch[1]);
        
        return {
            ...pollData,
            id: issue.number,
            issueUrl: issue.html_url,
            isClosed: issue.state === 'closed',
            closedAt: issue.closed_at,
            createdAt: issue.created_at
        };
    }

    /**
     * Close poll (close the GitHub issue and update labels)
     */
    async closePoll(issueNumber, closedBy) {
        // First, add a closing comment
        await this.makeRequest(
            `/repos/${this.owner}/${this.repo}/issues/${issueNumber}/comments`,
            {
                method: 'POST',
                body: JSON.stringify({
                    body: `🔒 **Poll Closed**\n\nClosed by: ${closedBy}\nClosed at: ${new Date().toISOString()}`
                })
            }
        );

        // Then close the issue and update labels
        return this.makeRequest(`/repos/${this.owner}/${this.repo}/issues/${issueNumber}`, {
            method: 'PATCH',
            body: JSON.stringify({
                state: 'closed',
                labels: ['quickpoll', 'poll', 'closed']
            })
        });
    }

    /**
     * Submit vote as issue comment
     */
    async submitVote(issueNumber, voteData) {
        const comment = {
            body: this.formatVoteComment(voteData)
        };

        return this.makeRequest(
            `/repos/${this.owner}/${this.repo}/issues/${issueNumber}/comments`,
            {
                method: 'POST',
                body: JSON.stringify(comment)
            }
        );
    }

    /**
     * Format vote data as comment
     */
    formatVoteComment(voteData) {
        let comment = `### 🗳️ Vote Submitted\n\n`;
        
        if (Array.isArray(voteData.selectedOptions)) {
            comment += `**Selected Options**: ${voteData.selectedOptions.join(', ')}\n`;
        } else {
            comment += `**Selected Option**: ${voteData.option}\n`;
        }
        
        comment += `**Voter**: ${voteData.voterIdentifier || 'anonymous'}\n`;
        comment += `**Timestamp**: ${new Date().toISOString()}\n\n`;
        comment += `<!-- VOTE_DATA\n`;
        comment += JSON.stringify(voteData, null, 2);
        comment += '\n-->\n';
        
        return comment;
    }

    /**
     * Get all votes for a poll (read issue comments)
     */
    async getVotes(issueNumber) {
        let allComments = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
            const comments = await this.makeRequest(
                `/repos/${this.owner}/${this.repo}/issues/${issueNumber}/comments?per_page=100&page=${page}`
            );

            if (comments.length === 0) {
                hasMore = false;
            } else {
                allComments = allComments.concat(comments);
                page++;
                if (comments.length < 100) {
                    hasMore = false;
                }
            }
        }

        return allComments
            .filter(comment => comment.body.includes('### 🗳️ Vote Submitted'))
            .map(comment => this.parseCommentToVote(comment))
            .filter(vote => vote !== null);
    }

    /**
     * Parse comment to vote data
     */
    parseCommentToVote(comment) {
        const jsonMatch = comment.body.match(/<!-- VOTE_DATA\n([\s\S]*?)\n-->/);
        if (!jsonMatch) {
            return null;
        }

        try {
            const voteData = JSON.parse(jsonMatch[1]);
            return {
                ...voteData,
                commentId: comment.id,
                commentUrl: comment.html_url,
                submittedAt: comment.created_at
            };
        } catch (e) {
            console.error('Error parsing vote data:', e);
            return null;
        }
    }

    /**
     * Check if user has voted
     */
    async hasUserVoted(issueNumber, voterIdentifier) {
        const votes = await this.getVotes(issueNumber);
        const normalizedIdentifier = voterIdentifier.toLowerCase();
        return votes.some(vote => 
            vote && vote.voterIdentifier && 
            vote.voterIdentifier.toLowerCase() === normalizedIdentifier
        );
    }

    /**
     * Get poll results
     */
    async getPollResults(issueNumber) {
        const [poll, votes] = await Promise.all([
            this.getPoll(issueNumber),
            this.getVotes(issueNumber)
        ]);

        // Count votes by option
        const results = {};
        poll.options.forEach((option, index) => {
            results[index] = {
                option: option,
                votes: 0,
                percentage: 0
            };
        });

        votes.forEach(vote => {
            if (vote && vote.selectedOptions) {
                // Handle multiple choice
                vote.selectedOptions.forEach(optionIndex => {
                    if (results[optionIndex]) {
                        results[optionIndex].votes++;
                    }
                });
            } else if (vote && vote.option !== undefined) {
                // Handle single choice
                const optionIndex = parseInt(vote.option);
                if (results[optionIndex]) {
                    results[optionIndex].votes++;
                }
            }
        });

        // Calculate percentages
        const totalVotes = votes.length;
        if (totalVotes > 0) {
            Object.keys(results).forEach(key => {
                results[key].percentage = Math.round((results[key].votes / totalVotes) * 100);
            });
        }

        return {
            poll,
            votes,
            results: Object.values(results),
            totalVotes,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Get vote status for current user
     */
    async getVoteStatus(issueNumber, voterIdentifier) {
        if (!voterIdentifier) {
            return {
                success: true,
                hasVoted: false,
                isAuthorized: false,
                canVote: false,
                authError: 'Authentication required'
            };
        }

        const poll = await this.getPoll(issueNumber);
        const hasVoted = await this.hasUserVoted(issueNumber, voterIdentifier);

        let isAuthorized = true;
        let authError = null;

        if (poll.requireAuth) {
            if (!voterIdentifier) {
                isAuthorized = false;
                authError = 'Email authentication required';
            } else if (poll.validEmails && poll.validEmails.length > 0) {
                const normalizedEmail = voterIdentifier.toLowerCase();
                const isValidEmail = poll.validEmails.includes(normalizedEmail);
                if (!isValidEmail) {
                    isAuthorized = false;
                    authError = 'Email not authorized';
                }
            }
        }

        return {
            success: true,
            hasVoted,
            isAuthorized,
            authError,
            canVote: isAuthorized && !hasVoted,
            poll: {
                requireAuth: poll.requireAuth,
                hasValidEmailsList: !!(poll.validEmails && poll.validEmails.length > 0)
            }
        };
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.GitHubAPIClient = GitHubAPIClient;
}
