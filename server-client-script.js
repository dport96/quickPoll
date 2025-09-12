// QuickPoll Application with Server-Side Storage
class QuickPollServerApp extends QuickPollEmailApp {
    constructor() {
        super();
        
        // Server configuration - dynamically use current host
        const currentHost = window.location.hostname;
        const currentPort = window.location.port;
        
        // Handle different environments
        if (currentHost === 'localhost' || currentHost === '127.0.0.1' || currentHost.includes('192.168')) {
            // Local development
            const port = currentPort || '3001';
            this.apiUrl = `http://${currentHost}:${port}/api`;
        } else {
            // Production (App Engine, custom domain, etc.)
            this.apiUrl = `${window.location.protocol}//${window.location.host}/api`;
        }
        this.socket = null;
        this.storageMode = 'server';
        this.currentPollId = null; // Track current poll for Socket.IO
        
        // Initialize server connection
        this.initializeServerConnection();
    }

    // Ensure apiUrl is available for any method calls during initialization
    get apiUrl() {
        if (this._apiUrl) return this._apiUrl;
        
        const currentHost = window.location.hostname;
        const currentPort = window.location.port;
        
        if (currentHost === 'localhost' || currentHost === '127.0.0.1' || currentHost.includes('192.168')) {
            const port = currentPort || '3001';
            return `http://${currentHost}:${port}/api`;
        } else {
            return `${window.location.protocol}//${window.location.host}/api`;
        }
    }
    
    set apiUrl(value) {
        this._apiUrl = value;
    }

    // Override the parent's init method to handle clean URLs
    init() {
        this.bindEvents();
        this.parseQueryString(); // This will call our overridden version
        this.showPage(this.currentPage);
        
        // Check if user is already signed in
        this.checkExistingAuth();
    }

    async initializeServerConnection() {
        try {
            // Test server connection
            const response = await fetch(`${this.apiUrl}/health`);
            if (response.ok) {
                const healthData = await response.json();
                
                // Initialize Socket.IO for real-time updates
                this.initializeSocketIO();
            } else {
                console.warn("Real-time updates disabled");
                this.handleOfflineMode();
            }
        } catch (error) {
            console.warn( error);
            this.handleOfflineMode();
        }
    }

    initializeSocketIO() {
        try {
            // Load Socket.IO from CDN or local file
            if (typeof io !== 'undefined') {
                const currentHost = window.location.hostname;
                const currentPort = window.location.port;
                
                let socketUrl;
                if (currentHost === 'localhost' || currentHost === '127.0.0.1' || currentHost.includes('192.168')) {
                    // Local development
                    const port = currentPort || '3001';
                    socketUrl = `http://${currentHost}:${port}`;
                } else {
                    // Production - use current origin
                    socketUrl = window.location.origin;
                }
                
                console.log(`🔌 Connecting to Socket.IO at: ${socketUrl}`);
                this.socket = io(socketUrl);
                
                this.socket.on('connect', () => {
                    console.log('🔌 Socket.IO connected successfully');
                    this.updateConnectionStatus(true);
                    
                    // Join poll room if we have a current poll
                    if (this.currentPollId) {
                        console.log(`📊 Joining poll room for: ${this.currentPollId}`);
                        this.socket.emit('joinPoll', this.currentPollId);
                    }
                });

                this.socket.on('disconnect', () => {
                    console.log('🔌 Socket.IO disconnected');
                    this.updateConnectionStatus(false);
                });

                this.socket.on('joinedPoll', (data) => {
                    console.log('📊 Successfully joined poll room:', data);
                });

                this.socket.on('voteSubmitted', (data) => {
                    console.log('📥 Received voteSubmitted event:', data);
                    this.handleRealTimeVoteUpdate(data);
                });

                this.socket.on('resultsUpdated', (data) => {
                    console.log('📥 Received resultsUpdated event:', data);
                    this.handleRealTimeResultsUpdate(data);
                });

                this.socket.on('pollUpdated', (data) => {
                    console.log('📥 Received pollUpdated event:', data);
                    this.handleRealTimePollUpdate(data);
                });

                this.socket.on('error', (error) => {
                    console.error('🔌 Socket error:', error);
                });

                this.socket.on('connect_error', (error) => {
                    console.error('🔌 Socket connection error:', error);
                });
            } else {
                console.warn('Socket.IO not available, real-time updates disabled');
            }
        } catch (error) {
            console.error('Failed to initialize Socket.IO:', error);
        }
    }

    handleOfflineMode() {
        // Fallback to localStorage for offline functionality
        this.storageMode = 'localStorage';
        console.log('📱 Running in offline mode with localStorage');
    }

    updateConnectionStatus(isConnected) {
        // Update UI to show connection status
        const statusIndicators = document.querySelectorAll('.connection-status');
        statusIndicators.forEach(indicator => {
            indicator.textContent = isConnected ? '🟢 Connected' : '🔴 Offline';
            indicator.className = `connection-status ${isConnected ? 'connected' : 'disconnected'}`;
        });
    }

    // Override URL parsing to handle clean URLs
    // Override parseQueryString to ensure apiUrl is set
    parseQueryString() {
        // Ensure apiUrl is set before parsing
        if (!this.apiUrl) {
            const currentHost = window.location.hostname;
            const currentPort = window.location.port || '3001';
            this.apiUrl = `http://${currentHost}:${currentPort}/api`;
        }
        
        const path = window.location.pathname;
        const params = new URLSearchParams(window.location.search);
        
        // Handle clean URLs like /vote/:id or /results/:id
        if (path.startsWith('/vote/')) {
            const pollId = path.substring(6); // Remove '/vote/'
            if (pollId) {
                // Don't set currentPage yet - let loadPollById handle it
                this.loadPollById(pollId, 'vote');
                return;
            }
        } else if (path.startsWith('/results/')) {
            const pollId = path.substring(9); // Remove '/results/'
            if (pollId) {
                // Don't set currentPage yet - let loadPollById handle it
                this.loadPollById(pollId, 'results');
                return;
            }
        }
        
        // Fallback to query parameter parsing for backwards compatibility
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

    // Load poll data from server using just the poll ID
    async loadPollById(pollId, targetPage) {
        try {
            const response = await fetch(`${this.apiUrl}/polls/${pollId}`);
            
            if (response.ok) {
                const data = await response.json();
                this.pollData = data.poll;
                
                // Set the page and show it after successful loading
                this.currentPage = targetPage;
                
                // If showing results, load the results data
                if (targetPage === 'results') {
                    await this.loadPollResults(pollId);
                }
                
                // Join real-time updates for this poll
                this.currentPollId = pollId;
                this.joinPollRoom(pollId);
                
                this.showPage(targetPage);
            } else if (response.status === 404) {
                console.error('❌ Poll not found');
                console.error( {
                    status: response.status,
                    statusText: response.statusText,
                    url: response.url
                });
                const errorText = await response.text();
                console.error( errorText);
                alert('Poll not found. Please check the URL.');
                this.currentPage = 'landing';
                this.showPage('landing');
            } else {
                console.error( response.status, response.statusText);
                const errorText = await response.text();
                console.error( errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error in loadPollById:', error);
            console.error('API URL:', this.apiUrl);
            console.error('Poll ID:', pollId);
            console.error('Target Page:', targetPage);
            alert(`Failed to load poll data: ${error.message}. Please try again.`);
            this.currentPage = 'landing';
            this.showPage('landing');
        }
    }

    // Helper method to join a poll room
    joinPollRoom(pollId) {
        console.log(`📊 Attempting to join poll room for: ${pollId}`);
        if (this.socket && this.socket.connected) {
            console.log('✅ Socket connected, emitting joinPoll event');
            this.socket.emit('joinPoll', pollId);
        } else if (this.socket) {
            console.log('🔄 Socket connecting, will auto-join room when ready');
            // Socket will auto-join when it connects (handled in 'connect' event)
        } else {
            console.log('❌ Socket not available');
        }
    }

    // Override the poll creation method for server-side storage
    async handleCreatePoll(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const authMode = document.querySelector('input[name="auth-mode"]:checked').value;
        const validEmails = document.getElementById('valid-emails').value;

        // Prepare poll data
        const pollData = {
            title: formData.get('title'),
            description: formData.get('description'),
            type: formData.get('type'),
            requireAuth: authMode === 'email',
            validEmails: validEmails ? validEmails.split('\n').map(email => email.trim()).filter(email => email) : [],
            options: formData.getAll('option').filter(option => option.trim() !== ''),
            createdBy: this.currentUser ? this.currentUser.email : 'anonymous'
        };

        if (pollData.options.length < 2) {
            alert('Please add at least 2 options.');
            return;
        }

        try {
            // Show loading state
            this.showLoadingState('create');

            // Send to server
            const response = await this.createPollOnServer(pollData);
            
            if (response.success) {
                this.pollData = response.poll;
                this.votes = {};
                this.showPollCreatedPage();
            } else {
                throw new Error(response.error || 'Failed to create poll');
            }
        } catch (error) {
            console.error( error);
            alert('Failed to create poll. Please check your internet connection and try again.');
            this.showPage('create');
        }
    }

    async createPollOnServer(pollData) {
        
        const response = await fetch(`${this.apiUrl}/polls`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(pollData)
        });


        if (!response.ok) {
            const errorData = await response.json();
            console.error( errorData);
            throw new Error(errorData.error || 'Server error');
        }

        const result = await response.json();
        return result;
    }

    // Override close poll for server-side storage
    async closePoll() {
        if (!this.pollData || !this.pollData.id) {
            alert('No active poll to close.');
            return;
        }

        const confirmed = confirm('Are you sure you want to close this poll? This will prevent any further voting. All existing data and results will be preserved. [v2.0]');
        
        if (confirmed) {
            try {
                // Update poll on server
                const response = await fetch(`${this.apiUrl}/polls/${this.pollData.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        ...this.pollData,
                        isClosed: true,
                        closedAt: new Date().toISOString()
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to close poll');
                }

                // Update local poll data
                this.pollData.isClosed = true;
                this.pollData.closedAt = new Date().toISOString();
                
                // Update button state
                const closeButton = document.getElementById('close-poll');
                if (closeButton) {
                    closeButton.textContent = 'Poll Closed';
                    closeButton.disabled = true;
                    closeButton.classList.remove('btn-danger');
                    closeButton.classList.add('btn-secondary');
                }
                
                // If we're on the results page, refresh it to show updated status
                if (this.currentPage === 'results') {
                    this.renderResultsPage();
                }
                
                alert('Poll has been closed successfully. No further votes will be accepted.');
            } catch (error) {
                alert('Error closing poll: ' + error.message);
            }
        }
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
            this.showRealTimeNotification('Results image saved successfully!');
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

    // Override vote submission for server-side storage
    submitVote() {
        // First, collect the vote data using the parent's logic
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
            console.log('🔀 Found sortable options:', sortedOptions.length);
            console.log('🔀 Sortable elements:', sortedOptions);
            
            if (sortedOptions.length === 0) {
                alert('No ranking options found. Please check the poll setup.');
                return;
            }
            
            const ranking = sortedOptions.map(option => {
                const value = parseInt(option.dataset.value);
                console.log('🔀 Option value:', value, 'from element:', option);
                return value;
            });
            console.log('🔀 Final ranking data:', ranking);
            voteData = { rankings: ranking }; // Server expects 'rankings' not 'ranking'
        }

        // Now submit to the server
        this.submitVoteAsync(voteData);
    }

    async submitVoteAsync(voteData) {
        try {
            // Show loading state
            const submitBtn = document.getElementById('submit-vote');
            if (submitBtn) {
                submitBtn.textContent = 'Submitting...';
                submitBtn.disabled = true;
            }

            // Submit to server
            const response = await this.submitVoteToServer(voteData);
            
            if (response.success) {
                alert('Your vote has been submitted!');
                
                // Redirect to results page using clean URL
                const pollId = this.getPollIdFromUrl();
                window.location.href = `/results/${pollId}`;
            } else {
                throw new Error(response.error || 'Failed to submit vote');
            }
        } catch (error) {
            
            if (error.message.includes('already voted')) {
                alert('You have already voted in this poll.');
            } else if (error.message.includes('expired')) {
                alert('This poll has expired and is no longer accepting votes.');
            } else if (error.message.includes('closed by the creator')) {
                alert('This poll has been closed by the creator and is no longer accepting votes.');
            } else if (error.message.includes('not authorized')) {
                alert('Your email address is not authorized to vote in this poll.');
            } else {
                alert('Failed to submit vote. Please check your internet connection and try again.');
            }
        } finally {
            // Reset submit button
            const submitBtn = document.getElementById('submit-vote');
            if (submitBtn) {
                submitBtn.textContent = 'Submit Vote';
                submitBtn.disabled = false;
            }
        }
    }

    // Helper method to get poll ID from either clean URL or query parameters
    getPollIdFromUrl() {
        // First, check for clean URL patterns like /vote/:id or /results/:id
        const path = window.location.pathname;
        const pathMatch = path.match(/^\/(vote|results)\/([A-Za-z0-9_-]{6,12})$/);
        
        if (pathMatch) {
            return pathMatch[2]; // Return the poll ID from the URL path
        }
        
        // Fallback to query parameter format
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    }

    async submitVoteToServer(voteData) {
        const pollId = this.getPollIdFromUrl();

        // Get voter identifier for authenticated polls
        let voterIdentifier = null;
        if (this.pollData && this.pollData.requireAuth && this.currentUser) {
            voterIdentifier = this.currentUser.email;
        }

        const requestData = {
            pollId,
            voteData,
            voterInfo: {
                timestamp: new Date().toISOString()
            }
        };

        // Only include voterIdentifier if it's not null
        if (voterIdentifier) {
            requestData.voterIdentifier = voterIdentifier;
        }


        const response = await fetch(`${this.apiUrl}/votes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });


        if (!response.ok) {
            const errorData = await response.json();
            console.error( errorData);
            throw new Error(errorData.error || 'Server error');
        }

        return await response.json();
    }

    // Override poll loading for server-side storage
    async loadPollFromParams(params) {
        const pollId = params.get('id');
        if (!pollId) {
            throw new Error('Poll ID is required');
        }

        try {
            
            // Load poll data from server
            const pollResponse = await fetch(`${this.apiUrl}/polls/${pollId}`);
            
            if (!pollResponse.ok) {
                if (pollResponse.status === 404) {
                    throw new Error('Poll not found. The poll may have been deleted or the URL is incorrect.');
                } else if (pollResponse.status === 410) {
                    throw new Error('This poll has expired and is no longer available.');
                } else {
                    throw new Error('Failed to load poll from server.');
                }
            }

            const pollData = await pollResponse.json();
            this.pollData = pollData.poll;
            
            // Join real-time updates for this poll
            this.currentPollId = pollId;
            this.joinPollRoom(pollId);
            
        } catch (error) {
            console.error( error);
            throw error;
        }
    }

    // Override results loading for server-side storage
    async loadPollResults(pollId) {
        try {
            
            const response = await fetch(`${this.apiUrl}/polls/${pollId}/results`);
            
            if (!response.ok) {
                throw new Error('Failed to load poll results');
            }

            const data = await response.json();
            
            // Update local data
            this.pollData = data.poll;
            this.results = data.results;
            
            return data;
        } catch (error) {
            console.error( error);
            throw error;
        }
    }

    // Override renderResultsPage for server-side storage
    renderResultsPage() {
        const container = document.getElementById('results-content');
        
        if (!this.pollData) {
            container.innerHTML = `
                <div class="results-container">
                    <h2>Poll Not Found</h2>
                    <p>The requested poll could not be found.</p>
                    <button onclick="location.href='./'" class="btn btn-primary">Go Home</button>
                </div>
            `;
            return;
        }

        if (!this.results) {
            container.innerHTML = `
                <div class="results-container">
                    <h2>Loading Results...</h2>
                    <p>Please wait while we load the poll results.</p>
                </div>
            `;
            return;
        }

        // Calculate total votes
        const totalVotes = this.results.totalVotes || 0;
        
        const authInfo = this.pollData.requireAuth ? '📧 Email Authenticated Poll' : '📊 Anonymous Poll';

        // Determine poll status
        const pollStatus = this.pollData.isClosed ? 
            { text: '🔒 CLOSED', class: 'status-closed', detail: `Closed on ${new Date(this.pollData.closedAt).toLocaleString()}` } :
            { text: '✅ OPEN', class: 'status-open', detail: 'Accepting votes' };

        let resultsHTML = '';
        
        if (this.pollData.type === 'simple') {
            resultsHTML = this.renderSimpleResults();
        } else if (this.pollData.type === 'rating') {
            resultsHTML = this.renderRatingResults();
        } else if (this.pollData.type === 'ranking') {
            resultsHTML = this.renderRankingResults();
        }

        container.innerHTML = `
            <div class="results-container">
                <div class="poll-header">
                    <h2>${this.pollData.title}</h2>
                    ${this.pollData.description ? `<p class="poll-description">${this.pollData.description}</p>` : ''}
                    <div class="poll-status">
                        <span class="status-indicator ${pollStatus.class}">${pollStatus.text}</span>
                        <span class="status-detail">${pollStatus.detail}</span>
                    </div>
                    <div class="poll-meta">
                        <span class="poll-creator">Created by: <strong>${this.pollData.creatorName || this.pollData.createdBy || 'Unknown'}</strong></span>
                        <span class="poll-type">${authInfo}</span>
                        <span class="vote-count">Total Votes: ${totalVotes}</span>
                        <span class="poll-date">Created: ${new Date(this.pollData.createdAt).toLocaleString()}</span>
                    </div>
                </div>
                ${resultsHTML}
                ${this.shouldShowVotersList() ? this.renderVotersList() : ''}
                ${this.shouldShowVotersList() ? this.renderNonVotersList() : ''}
                <div class="form-actions">
                    <button id="refresh-results-btn" class="btn btn-primary">Refresh Results</button>
                    ${this.isCreator() ? `<button id="save-results-btn" class="btn btn-success">Save Results as Image</button>` : ''}
                    ${this.isCreator() && !this.pollData.isClosed ? `<button id="close-poll-btn" class="btn btn-danger">Close Poll</button>` : ''}
                </div>
            </div>
        `;

        // Bind event listeners
        this.bindServerResultsEvents();
    }

    isCreator() {
        if (!this.currentUser || !this.pollData.createdBy) {
            return this.pollData.createdBy === 'anonymous';
        }
        return this.currentUser.email === this.pollData.createdBy;
    }

    bindServerResultsEvents() {
        // Refresh results button
        const refreshResultsBtn = document.getElementById('refresh-results-btn');
        if (refreshResultsBtn) {
            refreshResultsBtn.addEventListener('click', async () => {
                try {
                    await this.loadPollResults();
                    this.renderResultsPage();
                } catch (error) {
                    alert('Failed to refresh results');
                }
            });
        }

        // Save results button
        const saveResultsBtn = document.getElementById('save-results-btn');
        if (saveResultsBtn) {
            saveResultsBtn.addEventListener('click', () => this.saveResultsAsImage());
        }

        // Close poll button
        const closePollBtn = document.getElementById('close-poll-btn');
        if (closePollBtn) {
            closePollBtn.addEventListener('click', () => this.closePoll());
        }
    }

    renderSimpleResults() {
        const options = this.results.options || [];
        const maxVotes = Math.max(...options.map(opt => opt.votes));
        
        return `
            <div class="results-chart simple-results">
                <h3>Results</h3>
                ${options.map(option => `
                    <div class="result-item">
                        <div class="result-label">${option.option}</div>
                        <div class="result-bar">
                            <div class="result-fill" style="width: ${maxVotes > 0 ? (option.votes / maxVotes) * 100 : 0}%"></div>
                            <span class="result-count">${option.votes} votes (${option.percentage.toFixed(1)}%)</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderRatingResults() {
        const options = this.results.options || [];
        const totalVotes = this.results.totalVotes || 0;
        
        return `
            <div class="results-chart rating-results">
                <h3>Rating Results</h3>
                ${options.map(option => `
                    <div class="result-item rating-item">
                        <div class="result-label">${option.option}</div>
                        <div class="rating-stats">
                            <div class="average-rating">
                                <span class="rating-value">${option.averageRating.toFixed(1)}</span>
                                <span class="rating-stars">${'★'.repeat(Math.round(option.averageRating))}${'☆'.repeat(5 - Math.round(option.averageRating))}</span>
                            </div>
                            <div class="vote-info">
                                <span class="vote-count">${option.voteCount} votes</span>
                                <span class="vote-percentage">(${totalVotes > 0 ? ((option.voteCount / totalVotes) * 100).toFixed(1) : 0}%)</span>
                            </div>
                        </div>
                        <div class="rating-breakdown">
                            ${option.ratings.map((count, index) => `
                                <div class="rating-bar">
                                    <span class="star-label">${index + 1}★</span>
                                    <div class="bar-container">
                                        <div class="bar-fill" style="width: ${option.voteCount > 0 ? (count / option.voteCount) * 100 : 0}%"></div>
                                        <span class="bar-count">${count}</span>
                                    </div>
                                </div>
                            `).reverse().join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderRankingResults() {
        const options = this.results.options || [];
        const totalVotes = this.results.totalVotes || 0;
        
        return `
            <div class="results-chart ranking-results">
                <h3>Ranking Results</h3>
                <div class="ranking-explanation">
                    <p>Options are ranked by average position (lower numbers = higher ranking)</p>
                </div>
                ${options.map((option, index) => `
                    <div class="result-item ranking-item">
                        <div class="ranking-position">#${index + 1}</div>
                        <div class="result-content">
                            <div class="result-label">${option.option}</div>
                            <div class="ranking-stats">
                                <div class="average-position">
                                    <span class="position-label">Avg Position:</span>
                                    <span class="position-value">${option.averagePosition.toFixed(1)}</span>
                                </div>
                                <div class="vote-info">
                                    <span class="vote-count">${option.votes} votes</span>
                                    <span class="vote-percentage">(${totalVotes > 0 ? ((option.votes / totalVotes) * 100).toFixed(1) : 0}%)</span>
                                </div>
                            </div>
                            <div class="score-bar">
                                <div class="score-fill" style="width: ${options.length > 0 ? (option.averagePosition / Math.max(...options.map(o => o.averagePosition))) * 100 : 0}%"></div>
                                <span class="score-text">Score: ${option.totalScore}</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderVotersList() {
        const voters = this.results.voters || [];
        
        if (voters.length === 0) {
            return `
                <div class="voters-section">
                    <h3>📧 Authenticated Voters</h3>
                    <div class="voters-list">
                        <p class="no-voters">No voters yet</p>
                    </div>
                </div>
            `;
        }

        return `
            <div class="voters-section">
                <h3>📧 Authenticated Voters</h3>
                <div class="voters-count">
                    <span>${voters.length} verified voter${voters.length !== 1 ? 's' : ''}</span>
                </div>
                <div class="voters-list">
                    ${voters.map((voter, index) => `
                        <div class="voter-item">
                            <div class="voter-info">
                                <div class="voter-details">
                                    <span class="voter-number">#${index + 1}</span>
                                    <span class="voter-email">${voter.email}</span>
                                    ${voter.name ? `<span class="voter-name">(${voter.name})</span>` : ''}
                                </div>
                                <span class="voter-time">${new Date(voter.submittedAt).toLocaleString()}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderNonVotersList() {
        // Only show for polls with email restrictions and when user is the creator
        if (!this.pollData.validEmails || this.pollData.validEmails.length === 0) {
            return '';
        }

        if (!this.isCreator()) {
            return '';
        }

        // Get list of emails that have voted
        const voters = this.results.voters || [];
        const voterEmails = voters.map(voter => voter.email);

        // Find emails that haven't voted
        const nonVoters = this.pollData.validEmails.filter(email => 
            !voterEmails.includes(email)
        );

        if (nonVoters.length === 0) {
            return `
                <div class="non-voters-section">
                    <h3>✅ Complete Participation</h3>
                    <div class="completion-message">
                        <p>All ${this.pollData.validEmails.length} invited participants have submitted their votes!</p>
                    </div>
                </div>
            `;
        }

        return `
            <div class="non-voters-section">
                <h3>⏳ Pending Participants</h3>
                <div class="non-voters-summary">
                    <span class="pending-count">${nonVoters.length} of ${this.pollData.validEmails.length} have not yet voted</span>
                    <span class="participation-rate">
                        Participation: ${((this.pollData.validEmails.length - nonVoters.length) / this.pollData.validEmails.length * 100).toFixed(1)}%
                    </span>
                </div>
                <div class="non-voters-list">
                    ${nonVoters.map(email => `
                        <div class="non-voter-item">
                            <span class="non-voter-email">${email}</span>
                            <button class="btn-small btn-secondary copy-email-btn" onclick="navigator.clipboard.writeText('${email}'); this.textContent='Copied!'; setTimeout(() => this.textContent='Copy', 2000);">Copy</button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    shouldShowVotersList() {
        // Only show voter list for authenticated polls
        if (!this.pollData || !this.pollData.requireAuth) {
            return false;
        }
        
        // Only show to the poll creator
        if (!this.currentUser || !this.pollData.createdBy) {
            return false;
        }
        
        return this.currentUser.email === this.pollData.createdBy;
    }

    // Handle real-time vote updates
    async handleRealTimeVoteUpdate(data) {
        console.log('🔄 Processing real-time vote update:', data);
        console.log('📊 Current poll data:', this.pollData);
        console.log('📄 Current page:', this.currentPage);
        
        if (this.pollData && this.pollData.id === data.pollId && this.currentPage === 'results') {
            try {
                console.log('✅ Conditions met, updating results...');
                // Reload the poll results to get updated data
                await this.loadPollResults(data.pollId);
                
                // Re-render the results page with fresh data
                this.renderResultsPage();
                
                // Show notification
                this.showRealTimeNotification('New vote received! Results updated.');
                console.log('✅ Real-time vote update completed');
            } catch (error) {
                console.error('Error updating results in real-time:', error);
            }
        } else {
            console.log('❌ Conditions not met for real-time update:', {
                hasPollData: !!this.pollData,
                pollIdMatch: this.pollData?.id === data.pollId,
                onResultsPage: this.currentPage === 'results'
            });
        }
    }

    // Handle real-time results updates
    async handleRealTimeResultsUpdate(data) {
        console.log('🔄 Processing real-time results update:', data);
        console.log('📊 Current poll data:', this.pollData);
        console.log('📄 Current page:', this.currentPage);
        
        if (this.pollData && this.pollData.id === data.pollId && this.currentPage === 'results') {
            try {
                console.log('✅ Conditions met, updating results directly...');
                // Update results data directly from the event
                this.results = data.results;
                this.pollData = { ...this.pollData, ...data.poll };
                
                // Re-render the results page
                this.renderResultsPage();
                
                // Show notification
                this.showRealTimeNotification('Results updated!');
                console.log('✅ Real-time results update completed');
            } catch (error) {
                console.error('Error handling real-time results update:', error);
            }
        } else {
            console.log('❌ Conditions not met for real-time results update:', {
                hasPollData: !!this.pollData,
                pollIdMatch: this.pollData?.id === data.pollId,
                onResultsPage: this.currentPage === 'results'
            });
        }
    }

    // Handle real-time poll updates (e.g., when poll is closed)
    async handleRealTimePollUpdate(data) {
        console.log('🔄 Processing real-time poll update:', data);
        console.log('📊 Current poll data:', this.pollData);
        console.log('📄 Current page:', this.currentPage);
        
        if (this.pollData && this.pollData.id === data.pollId) {
            try {
                console.log('✅ Updating poll data with changes:', data.updates);
                
                // Update poll data with the changes
                Object.assign(this.pollData, data.updates);
                
                // If on results page, re-render to show updated status
                if (this.currentPage === 'results') {
                    this.renderResultsPage();
                    
                    // Show notification if poll was closed
                    if (data.updates.isClosed) {
                        this.showRealTimeNotification('Poll has been closed!');
                    }
                }
                
                // Update UI elements based on poll status
                if (data.updates.isClosed !== undefined) {
                    this.updatePollStatusUI(data.updates.isClosed);
                }
                
                console.log('✅ Real-time poll update completed');
            } catch (error) {
                console.error('Error handling real-time poll update:', error);
            }
        } else {
            console.log('❌ Poll ID does not match current poll');
        }
    }

    // Update poll status UI elements
    updatePollStatusUI(isClosed) {
        // Update close poll button if it exists
        const closeButton = document.getElementById('close-poll');
        const closePollBtn = document.getElementById('close-poll-btn');
        
        if (isClosed) {
            if (closeButton) {
                closeButton.textContent = 'Poll Closed';
                closeButton.disabled = true;
                closeButton.classList.remove('btn-danger');
                closeButton.classList.add('btn-secondary');
            }
            
            if (closePollBtn) {
                closePollBtn.textContent = 'Poll Closed';
                closePollBtn.disabled = true;
                closePollBtn.classList.remove('btn-danger');
                closePollBtn.classList.add('btn-secondary');
            }
        }
    }

    updateVoteCountDisplay(totalVotes) {
        const voteCountElements = document.querySelectorAll('.total-votes');
        voteCountElements.forEach(element => {
            element.textContent = totalVotes;
        });
    }

    showRealTimeNotification(message) {
        // Create or update notification element
        let notification = document.getElementById('realtime-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'realtime-notification';
            notification.className = 'realtime-notification';
            document.body.appendChild(notification);
        }
        
        notification.textContent = message;
        notification.classList.add('show');
        
        // Hide after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    // Override the parseQueryString to handle server-side loading with clean URLs
    async parseQueryStringAsync() {
        // First, check for clean URL patterns like /vote/:id or /results/:id
        const path = window.location.pathname;
        const pathMatch = path.match(/^\/(vote|results)\/([A-Za-z0-9_-]{6,12})$/);
        
        let mode, pollId;
        
        if (pathMatch) {
            // Clean URL format: /vote/:id or /results/:id
            mode = pathMatch[1];
            pollId = pathMatch[2];
        } else {
            // Fallback to query parameter format for backwards compatibility
            const params = new URLSearchParams(window.location.search);
            mode = params.get('mode');
            pollId = params.get('id');
            
            if (mode && pollId) {
            }
        }

        if (mode && pollId) {
            // Show loading state
            this.showLoadingState(mode);
            
            try {
                // Create a params object for loadPollFromParams method
                const params = new Map([['id', pollId]]);
                params.get = function(key) { return this.has(key) ? Map.prototype.get.call(this, key) : null; };
                
                await this.loadPollFromParams(params);
                
                // Set the current page after successful loading
                if (mode === 'vote') {
                    this.currentPage = 'vote';
                } else if (mode === 'results') {
                    this.currentPage = 'results';
                    // Load results data
                    await this.loadPollResults(pollId);
                }
                
                // Now show the page with loaded data
                this.showPage(this.currentPage);
                
            } catch (error) {
                console.error( error);
                this.showPollLoadError(mode, pollId, error.message);
            }
        }
    }

    // Override showPollCreatedPage to use server-provided URLs
    async showPollCreatedPage() {
        if (!this.pollData) return;

        // Use URLs provided by the server response
        const votingUrl = this.pollData.votingUrl || `${window.location.origin}/vote/${this.pollData.id}`;
        const resultsUrl = this.pollData.resultsUrl || `${window.location.origin}/results/${this.pollData.id}`;

        // Update URL fields
        document.getElementById('voting-link').value = votingUrl;
        document.getElementById('results-link').value = resultsUrl;
        
        // Update the Poll ID display - this was missing!
        document.getElementById('poll-id-value').textContent = this.pollData.id;

        // Generate QR code for voting URL
        await this.generateQRCode(votingUrl);

        this.showPage('poll-created');
    }

    // Generate QR code for the voting URL
    async generateQRCode(url) {
        const qrCodeImg = document.getElementById('voting-qr-code');
        const qrLoading = document.getElementById('qr-loading');
        
        // Show loading state
        qrCodeImg.style.display = 'none';
        qrLoading.style.display = 'flex';
        qrLoading.textContent = 'Generating QR code...';
        qrLoading.className = 'qr-loading'; // Reset any error classes
        
        try {
            // Use our own API endpoint
            const response = await fetch(`${this.apiUrl}/qrcode?url=${encodeURIComponent(url)}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // QR code generated successfully
            qrCodeImg.src = data.qrCode;
            qrCodeImg.style.display = 'block';
            qrLoading.style.display = 'none';
            
        } catch (error) {
            console.error('QR code generation failed:', error);
            
            // Fallback: show error message
            qrLoading.textContent = 'QR code unavailable';
            qrLoading.className = 'qr-loading qr-error';
        }
    }

    // Add connection status to UI
    showLoadingState(mode) {
        // Simple loading state implementation
        
        // Add connection status
        const loadingContent = document.querySelector('.loading-message');
        if (loadingContent) {
            const statusDiv = document.createElement('div');
            statusDiv.className = 'connection-status';
            statusDiv.textContent = this.socket && this.socket.connected ? '🟢 Connected' : '🔴 Connecting...';
            loadingContent.appendChild(statusDiv);
        }
    }

    // Clean up when leaving page
    cleanup() {
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.app = new QuickPollServerApp();
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (window.app && window.app.cleanup) {
            window.app.cleanup();
        }
    });
});

// Add Socket.IO script dynamically if not already loaded
if (typeof io === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js';
    script.onload = () => {
    };
    script.onerror = () => {
        console.warn("Real-time updates disabled");
    };
    document.head.appendChild(script);
}
