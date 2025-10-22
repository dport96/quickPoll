/**
 * QuickPoll GitHub Pages Application
 * Serverless version using GitHub Issues as backend
 */
class QuickPollGitHubApp {
    constructor() {
        // Initialize GitHub clients
        this.githubAPI = new GitHubAPIClient();
        this.githubAuth = new GitHubAuth();
        
        // Current state
        this.currentUser = null;
        this.pollData = null;
        this.currentPage = 'landing';
        
        // Initialize app
        this.init();
    }

    /**
     * Initialize application
     */
    async init() {
        console.log('🚀 Initializing QuickPoll GitHub Pages App...');
        
        // Check authentication
        await this.checkAuthStatus();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Handle initial route
        this.handleRoute();
        
        console.log('✅ App initialized');
    }

    /**
     * Check authentication status
     */
    async checkAuthStatus() {
        if (this.githubAuth.isAuthenticated()) {
            const isValid = await this.githubAuth.checkAuth();
            if (isValid) {
                this.currentUser = this.githubAuth.getCurrentUser();
                this.updateUserInterface();
            }
        }
    }

    /**
     * Update UI based on authentication status
     */
    updateUserInterface() {
        const signInBtn = document.getElementById('sign-in-btn');
        const signOutBtn = document.getElementById('sign-out-btn');
        const userInfo = document.getElementById('user-info');
        const userName = document.getElementById('user-name');

        if (this.currentUser) {
            if (signInBtn) signInBtn.style.display = 'none';
            if (signOutBtn) signOutBtn.style.display = 'inline-block';
            if (userInfo) userInfo.style.display = 'inline-block';
            if (userName) userName.textContent = this.currentUser.name || this.currentUser.login;
        } else {
            if (signInBtn) signInBtn.style.display = 'inline-block';
            if (signOutBtn) signOutBtn.style.display = 'none';
            if (userInfo) userInfo.style.display = 'none';
        }
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Sign in/out buttons
        const signInBtn = document.getElementById('sign-in-btn');
        if (signInBtn) {
            signInBtn.addEventListener('click', () => this.handleSignIn());
        }

        const signOutBtn = document.getElementById('sign-out-btn');
        if (signOutBtn) {
            signOutBtn.addEventListener('click', () => this.handleSignOut());
        }

        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.target.getAttribute('href').substring(1);
                this.navigateTo(page);
            });
        });

        // Create poll form
        const createPollForm = document.getElementById('create-poll-form');
        if (createPollForm) {
            createPollForm.addEventListener('submit', (e) => this.handleCreatePoll(e));
        }

        // Vote form
        const voteForm = document.getElementById('vote-form');
        if (voteForm) {
            voteForm.addEventListener('submit', (e) => this.handleSubmitVote(e));
        }

        // Close poll button
        const closePollBtn = document.getElementById('close-poll');
        if (closePollBtn) {
            closePollBtn.addEventListener('click', () => this.handleClosePoll());
        }

        // Handle browser back/forward
        window.addEventListener('popstate', () => this.handleRoute());
    }

    /**
     * Handle sign in
     */
    async handleSignIn() {
        const success = await this.githubAuth.signIn();
        if (success) {
            this.currentUser = this.githubAuth.getCurrentUser();
            this.updateUserInterface();
            
            // Reload current page to show updated state
            this.handleRoute();
        }
    }

    /**
     * Handle sign out
     */
    handleSignOut() {
        if (confirm('Are you sure you want to sign out?')) {
            this.githubAuth.signOut();
            this.currentUser = null;
            this.updateUserInterface();
            
            // Go to landing page
            this.navigateTo('');
        }
    }

    /**
     * Navigate to a page
     */
    navigateTo(page) {
        const qs = page ? `?page=${page}` : '';
        window.history.pushState({}, '', qs);
        this.handleRoute();
    }

    /**
     * Handle routing based on URL
     */
    async handleRoute() {
        // Use query string for routing
        const params = new URLSearchParams(window.location.search);
        const page = params.get('page') || '';

        console.log('📍 Navigating to:', page || 'landing');

        // Hide all pages
        document.querySelectorAll('.page').forEach(pageEl => {
            pageEl.style.display = 'none';
        });

        switch (page) {
            case '':
            case 'index.html':
                await this.loadLandingPage();
                break;
            case 'create':
                await this.loadCreatePage();
                break;
            case 'vote':
                await this.loadVotePage();
                break;
            case 'results':
                await this.loadResultsPage();
                break;
            case 'created':
                await this.loadCreatedPage();
                break;
            default:
                await this.loadLandingPage();
        }
    }

    /**
     * Show a specific page
     */
    showPage(pageId) {
        document.querySelectorAll('.page').forEach(page => {
            page.style.display = 'none';
        });

        const page = document.getElementById(`${pageId}-page`);
        if (page) {
            page.style.display = 'block';
            this.currentPage = pageId;
        }
    }

    /**
     * Load landing page
     */
    async loadLandingPage() {
        this.showPage('landing');
        
        try {
            const poll = await this.githubAPI.getActivePoll();
            
            if (poll) {
                // Show active poll notice
                await this.displayActivePollNotice(poll);
                
                // Update vote button on landing page
                await this.updateLandingPageVoteButton(poll);
            } else {
                // No active poll
                this.hideActivePollNotice();
            }
        } catch (error) {
            console.error('Error loading landing page:', error);
        }
    }

    /**
     * Display active poll notice
     */
    async displayActivePollNotice(poll) {
        const notice = document.getElementById('active-poll-notice');
        if (!notice) return;

        const isCreator = this.currentUser && 
            this.currentUser.email.toLowerCase() === poll.createdBy.toLowerCase();

        const createdDate = new Date(poll.createdAt).toLocaleString();
        
        if (isCreator) {
            notice.innerHTML = `
                <h4>📊 Your Active Poll</h4>
                <p><strong>Title:</strong> ${poll.title}</p>
                <p><strong>Created:</strong> ${createdDate}</p>
                <p>You have an active poll running. Go to the results page to manage it.</p>
                <div class="active-poll-actions">
                    <a href="?page=results" class="btn btn-primary">Manage Your Poll</a>
                    <a href="?page=vote" class="btn btn-secondary">Preview Vote Page</a>
                </div>
            `;
        } else {
            notice.innerHTML = `
                <h4>⚠️ Active Poll Detected</h4>
                <p><strong>Title:</strong> ${poll.title}</p>
                <p><strong>Created:</strong> ${createdDate}</p>
                <p><strong>Created by:</strong> ${poll.createdBy}</p>
                <p>There is currently an active poll. You cannot create a new poll until this one is closed.</p>
                <div class="active-poll-actions">
                    <a href="?page=vote" class="btn btn-primary">Vote in Current Poll</a>
                    <a href="?page=results" class="btn btn-secondary">View Results</a>
                </div>
            `;
        }

        notice.style.display = 'block';

        // Disable create form if not creator
        if (!isCreator) {
            const createForm = document.getElementById('create-poll-form');
            if (createForm) {
                const inputs = createForm.querySelectorAll('input, textarea, button, select');
                inputs.forEach(input => input.disabled = true);
            }
        }
    }

    /**
     * Hide active poll notice
     */
    hideActivePollNotice() {
        const notice = document.getElementById('active-poll-notice');
        if (notice) {
            notice.style.display = 'none';
        }

        // Enable create form
        const createForm = document.getElementById('create-poll-form');
        if (createForm) {
            const inputs = createForm.querySelectorAll('input, textarea, button, select');
            inputs.forEach(input => input.disabled = false);
        }
    }

    /**
     * Update landing page vote button
     */
    async updateLandingPageVoteButton(poll) {
        const voteNotice = document.getElementById('active-poll-voting-notice');
        if (!voteNotice) return;

        if (!poll || poll.isClosed) {
            voteNotice.style.display = 'none';
            return;
        }

        // Check if user can vote
        const canVote = await this.checkIfUserCanVote(poll);

        if (canVote) {
            const pollTitleElement = document.getElementById('active-poll-title');
            if (pollTitleElement) {
                pollTitleElement.innerHTML = `<strong>Title:</strong> ${poll.title}`;
            }

            voteNotice.style.display = 'block';

            // Set up buttons
            const voteBtn = document.getElementById('vote-in-active-poll-btn');
            const resultsBtn = document.getElementById('view-active-poll-results-btn');

            if (voteBtn) {
                voteBtn.onclick = () => this.navigateTo('vote');
            }

            if (resultsBtn) {
                resultsBtn.onclick = () => this.navigateTo('results');
            }
        } else {
            voteNotice.style.display = 'none';
        }
    }

    /**
     * Check if user can vote
     */
    async checkIfUserCanVote(poll) {
        try {
            const voterIdentifier = this.currentUser ? this.currentUser.email : this.getAnonymousId();
            const status = await this.githubAPI.getVoteStatus(poll.id, voterIdentifier);
            return status.canVote;
        } catch (error) {
            console.error('Error checking vote status:', error);
            return false;
        }
    }

    /**
     * Load create page
     */
    async loadCreatePage() {
        // Redirect to landing page (creation happens there)
        this.navigateTo('');
    }

    /**
     * Load vote page
     */
    async loadVotePage() {
        try {
            const poll = await this.githubAPI.getActivePoll();

            if (!poll) {
                alert('No active poll found.');
                this.navigateTo('');
                return;
            }

            if (poll.isClosed) {
                alert('This poll has been closed.');
                this.navigateTo('results');
                return;
            }

            // Check if user has already voted
            const voterIdentifier = this.currentUser ? this.currentUser.email : this.getAnonymousId();
            const hasVoted = await this.githubAPI.hasUserVoted(poll.id, voterIdentifier);

            if (hasVoted) {
                alert('You have already voted in this poll.');
                this.navigateTo('results');
                return;
            }

            this.pollData = poll;
            this.renderVotePage();
            this.showPage('vote');

        } catch (error) {
            console.error('Error loading vote page:', error);
            alert(`Error loading poll: ${error.message}`);
            this.navigateTo('');
        }
    }

    /**
     * Render vote page with poll data
     */
    renderVotePage() {
        const pollTitle = document.getElementById('poll-title-display');
        const pollDescription = document.getElementById('poll-description-display');
        const optionsContainer = document.getElementById('poll-options');

        if (pollTitle) pollTitle.textContent = this.pollData.title;
        if (pollDescription) pollDescription.textContent = this.pollData.description || '';

        if (optionsContainer) {
            optionsContainer.innerHTML = '';

            this.pollData.options.forEach((option, index) => {
                const optionDiv = document.createElement('div');
                optionDiv.className = 'poll-option';

                const input = document.createElement('input');
                input.type = 'radio';
                input.name = 'poll-option';
                input.value = index;
                input.id = `option-${index}`;

                const label = document.createElement('label');
                label.htmlFor = `option-${index}`;
                label.textContent = option;

                optionDiv.appendChild(input);
                optionDiv.appendChild(label);
                optionsContainer.appendChild(optionDiv);
            });
        }
    }

    /**
     * Handle poll creation
     */
    async handleCreatePoll(event) {
        event.preventDefault();

        if (!this.currentUser) {
            alert('Please sign in with GitHub to create a poll.');
            await this.handleSignIn();
            return;
        }

        try {
            // Check for existing active poll
            const existingPoll = await this.githubAPI.getActivePoll();
            if (existingPoll && !existingPoll.isClosed) {
                alert('There is already an active poll. Please close it before creating a new one.');
                return;
            }

            // Get form data
            const form = event.target;
            const formData = new FormData(form);
            const authMode = document.querySelector('input[name="auth-mode"]:checked')?.value || 'none';
            const validEmails = document.getElementById('valid-emails')?.value || '';

            // Collect options
            const options = [];
            document.querySelectorAll('.option-input').forEach(input => {
                const value = input.value.trim();
                if (value) options.push(value);
            });

            // Validate
            const title = formData.get('title')?.trim();
            if (!title) {
                alert('Please enter a poll title.');
                return;
            }

            if (options.length < 2) {
                alert('Please add at least 2 options.');
                return;
            }

            // Create poll data
            const pollData = {
                title,
                description: formData.get('description')?.trim() || '',
                type: formData.get('type') || 'simple',
                options,
                requireAuth: authMode === 'email',
                validEmails: validEmails ? 
                    validEmails.split('\n').map(e => e.trim().toLowerCase()).filter(e => e) : 
                    [],
                createdBy: this.currentUser.email,
                createdByGitHub: this.currentUser.login
            };

            console.log('📝 Creating poll:', pollData);

            // Create poll on GitHub
            const issue = await this.githubAPI.createPoll(pollData);

            console.log('✅ Poll created successfully:', issue.html_url);

            // Redirect to created page
            this.navigateTo('created');

        } catch (error) {
            console.error('❌ Error creating poll:', error);
            alert(`Error creating poll: ${error.message}\n\nMake sure your GitHub token has the "public_repo" scope.`);
        }
    }

    /**
     * Handle vote submission
     */
    async handleSubmitVote(event) {
        event.preventDefault();

        if (!this.pollData) {
            alert('No poll data found.');
            return;
        }

        try {
            const selectedOption = document.querySelector('input[name="poll-option"]:checked');

            if (!selectedOption) {
                alert('Please select an option.');
                return;
            }

            // Get voter identifier
            const voterIdentifier = this.currentUser ? 
                this.currentUser.email : 
                this.getAnonymousId();

            // Check authorization
            const status = await this.githubAPI.getVoteStatus(this.pollData.id, voterIdentifier);

            if (!status.canVote) {
                alert(status.authError || 'You are not authorized to vote in this poll.');
                return;
            }

            // Submit vote
            const voteData = {
                option: parseInt(selectedOption.value),
                selectedOptions: [parseInt(selectedOption.value)],
                voterIdentifier: voterIdentifier
            };

            console.log('🗳️ Submitting vote:', voteData);

            await this.githubAPI.submitVote(this.pollData.id, voteData);

            console.log('✅ Vote submitted successfully');

            alert('Thank you for voting!');

            // Redirect to results
            this.navigateTo('results');

        } catch (error) {
            console.error('❌ Error submitting vote:', error);
            alert(`Error submitting vote: ${error.message}`);
        }
    }

    /**
     * Load results page
     */
    async loadResultsPage() {
        try {
            const poll = await this.githubAPI.getActivePoll();

            if (!poll) {
                alert('No active poll found.');
                this.navigateTo('');
                return;
            }

            this.pollData = poll;

            // Get results
            const results = await this.githubAPI.getPollResults(poll.id);

            this.renderResultsPage(results);
            this.showPage('results');

        } catch (error) {
            console.error('Error loading results:', error);
            alert(`Error loading results: ${error.message}`);
            this.navigateTo('');
        }
    }

    /**
     * Render results page
     */
    renderResultsPage(results) {
        const pollTitle = document.getElementById('results-poll-title');
        const pollDescription = document.getElementById('results-poll-description');
        const pollStatus = document.getElementById('poll-status');
        const resultsContainer = document.getElementById('poll-results-container');
        const totalVotesEl = document.getElementById('total-votes');
        const closePollBtn = document.getElementById('close-poll');

        if (pollTitle) pollTitle.textContent = results.poll.title;
        if (pollDescription) pollDescription.textContent = results.poll.description || '';

        // Status
        if (pollStatus) {
            const statusHtml = results.poll.isClosed ?
                '<span class="status-indicator status-closed">🔴 Closed</span>' :
                '<span class="status-indicator status-open">🟢 Open</span>';
            pollStatus.innerHTML = statusHtml;
        }

        // Total votes
        if (totalVotesEl) {
            totalVotesEl.textContent = `Total Votes: ${results.totalVotes}`;
        }

        // Results
        if (resultsContainer) {
            resultsContainer.innerHTML = '';

            results.results.forEach((result, index) => {
                const resultDiv = document.createElement('div');
                resultDiv.className = 'result-item';
                resultDiv.innerHTML = `
                    <div class="result-header">
                        <strong>${result.option}</strong>
                        <span>${result.votes} vote${result.votes !== 1 ? 's' : ''} (${result.percentage}%)</span>
                    </div>
                    <div class="result-bar">
                        <div class="result-bar-fill" style="width: ${result.percentage}%"></div>
                    </div>
                `;
                resultsContainer.appendChild(resultDiv);
            });
        }

        // Close poll button visibility
        if (closePollBtn) {
            const isCreator = this.currentUser && 
                this.currentUser.email.toLowerCase() === results.poll.createdBy.toLowerCase();
            
            closePollBtn.style.display = (isCreator && !results.poll.isClosed) ? 
                'inline-block' : 'none';
        }
    }

    /**
     * Handle poll closing
     */
    async handleClosePoll() {
        if (!this.pollData) {
            alert('No poll data found.');
            return;
        }

        if (!this.currentUser) {
            alert('Please sign in to close the poll.');
            return;
        }

        const isCreator = this.currentUser.email.toLowerCase() === this.pollData.createdBy.toLowerCase();

        if (!isCreator) {
            alert('Only the poll creator can close the poll.');
            return;
        }

        if (confirm('Are you sure you want to close this poll? This action cannot be undone.')) {
            try {
                await this.githubAPI.closePoll(this.pollData.id, this.currentUser.email);

                console.log('✅ Poll closed successfully');

                alert('Poll closed successfully!');

                // Reload results
                this.loadResultsPage();

            } catch (error) {
                console.error('❌ Error closing poll:', error);
                alert(`Error closing poll: ${error.message}`);
            }
        }
    }

    /**
     * Load created page
     */
    async loadCreatedPage() {
        try {
            const poll = await this.githubAPI.getActivePoll();

            if (!poll) {
                // No poll found, show message
                this.showPage('poll-created');
                return;
            }

            this.pollData = poll;
            this.displayPollCreatedPage();
            this.showPage('poll-created');

        } catch (error) {
            console.error('Error loading created page:', error);
            this.showPage('poll-created');
        }
    }

    /**
     * Display poll created page
     */
    displayPollCreatedPage() {
        // Update poll status info
        const pollStatusInfo = document.getElementById('poll-status-info');
        if (this.pollData && pollStatusInfo) {
            const statusIndicator = document.getElementById('poll-status-indicator');
            const pollTitleDisplay = document.getElementById('poll-title-display');
            const pollCreatedDisplay = document.getElementById('poll-created-display');

            if (statusIndicator) {
                const isOpen = !this.pollData.isClosed;
                statusIndicator.textContent = isOpen ? '🟢 Open' : '🔴 Closed';
                statusIndicator.className = `status-indicator ${isOpen ? 'status-open' : 'status-closed'}`;
            }

            if (pollTitleDisplay) {
                pollTitleDisplay.textContent = this.pollData.title;
            }

            if (pollCreatedDisplay) {
                const createdDate = new Date(this.pollData.createdAt).toLocaleString();
                pollCreatedDisplay.textContent = createdDate;
            }

            pollStatusInfo.style.display = 'block';
        }

        // Update GitHub info
        const gistInfo = document.getElementById('gist-info');
        const gistLink = document.getElementById('gist-link');

        if (this.pollData && gistInfo && gistLink) {
            gistLink.href = this.pollData.issueUrl;
            gistLink.textContent = 'View on GitHub';
            gistInfo.querySelector('h4').textContent = '🔗 Stored on GitHub';
            gistInfo.querySelector('p').innerHTML = `This poll is stored as a GitHub Issue: <a href="${this.pollData.issueUrl}" target="_blank" class="gist-link">View Issue</a>`;
            gistInfo.style.display = 'block';
        }

        // Update links
        const votingLink = document.getElementById('voting-link');
        const resultsLink = document.getElementById('results-link');

        if (votingLink) {
            votingLink.value = `${window.location.origin}/vote`;
        }

        if (resultsLink) {
            resultsLink.value = `${window.location.origin}/results`;
        }

        // Copy buttons
        this.setupCopyButtons();

        // QR code generation
        this.generateQRCode(`${window.location.origin}/vote`);

        // Close poll button
        const closePollBtn = document.getElementById('close-poll');
        if (closePollBtn && this.pollData) {
            const isCreator = this.currentUser && 
                this.currentUser.email.toLowerCase() === this.pollData.createdBy.toLowerCase();
            
            closePollBtn.style.display = (isCreator && !this.pollData.isClosed) ? 
                'inline-block' : 'none';
        }
    }

    /**
     * Setup copy buttons for links
     */
    setupCopyButtons() {
        const copyVotingBtn = document.getElementById('copy-voting-link');
        const copyResultsBtn = document.getElementById('copy-results-link');

        if (copyVotingBtn) {
            copyVotingBtn.onclick = () => {
                const link = document.getElementById('voting-link');
                if (link) {
                    link.select();
                    document.execCommand('copy');
                    alert('Voting link copied to clipboard!');
                }
            };
        }

        if (copyResultsBtn) {
            copyResultsBtn.onclick = () => {
                const link = document.getElementById('results-link');
                if (link) {
                    link.select();
                    document.execCommand('copy');
                    alert('Results link copied to clipboard!');
                }
            };
        }
    }

    /**
     * Generate QR code for voting URL
     */
    async generateQRCode(url) {
        const qrImage = document.getElementById('voting-qr-code');
        const qrLoading = document.getElementById('qr-loading');

        if (!qrImage) return;

        try {
            // Use QRServer API for QR code generation
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
            
            qrImage.src = qrUrl;
            qrImage.style.display = 'block';
            if (qrLoading) qrLoading.style.display = 'none';

        } catch (error) {
            console.error('Error generating QR code:', error);
            if (qrLoading) qrLoading.textContent = 'Failed to generate QR code';
        }
    }

    /**
     * Get or create anonymous ID
     */
    getAnonymousId() {
        let id = localStorage.getItem('anonymous_voter_id');
        if (!id) {
            id = `anonymous-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem('anonymous_voter_id', id);
        }
        return id;
    }
}

// Initialize app when DOM is ready
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        window.app = new QuickPollGitHubApp();
    });
}
