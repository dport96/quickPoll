// QuickPoll Application with Server-Side Storage
class QuickPollServerApp extends QuickPollEmailApp {
    constructor() {
        console.log('🚀 QuickPollServerApp constructor called');
        super();
        
        // Server configuration
        this.apiUrl = 'http://localhost:3001/api'; // Change this for production
        this.socket = null;
        this.storageMode = 'server';
        
        // Initialize server connection
        this.initializeServerConnection();
        console.log('✅ QuickPollServerApp constructor completed');
    }

    // Remove async from init - revert to parent behavior
    // init() will be inherited from parent class

    async initializeServerConnection() {
        try {
            console.log('🔄 Testing server connection...');
            // Test server connection
            const response = await fetch(`${this.apiUrl}/health`);
            console.log('📡 Server response status:', response.status);
            if (response.ok) {
                const healthData = await response.json();
                console.log('✅ Server connection established:', healthData);
                
                // Initialize Socket.IO for real-time updates
                this.initializeSocketIO();
            } else {
                console.warn('⚠️ Server not responding, using offline mode');
                this.handleOfflineMode();
            }
        } catch (error) {
            console.warn('⚠️ Server connection failed, using offline mode:', error);
            this.handleOfflineMode();
        }
    }

    initializeSocketIO() {
        try {
            // Load Socket.IO from CDN or local file
            if (typeof io !== 'undefined') {
                this.socket = io('http://localhost:3001');
                
                this.socket.on('connect', () => {
                    console.log('🔌 Real-time connection established');
                    this.updateConnectionStatus(true);
                });

                this.socket.on('disconnect', () => {
                    console.log('🔌 Real-time connection lost');
                    this.updateConnectionStatus(false);
                });

                this.socket.on('voteSubmitted', (data) => {
                    this.handleRealTimeVoteUpdate(data);
                });

                this.socket.on('resultsUpdated', (data) => {
                    this.handleRealTimeResultsUpdate(data);
                });

                this.socket.on('error', (error) => {
                    console.error('🔌 Socket error:', error);
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
    parseQueryString() {
        console.log('🔍 parseQueryString called, pathname:', window.location.pathname);
        const path = window.location.pathname;
        const params = new URLSearchParams(window.location.search);
        
        // Handle clean URLs like /vote/:id or /results/:id
        if (path.startsWith('/vote/')) {
            const pollId = path.substring(6); // Remove '/vote/'
            console.log('📊 Detected vote URL with poll ID:', pollId);
            if (pollId) {
                // Don't set currentPage yet - let loadPollById handle it
                this.loadPollById(pollId, 'vote');
                return;
            }
        } else if (path.startsWith('/results/')) {
            const pollId = path.substring(9); // Remove '/results/'
            console.log('📈 Detected results URL with poll ID:', pollId);
            if (pollId) {
                // Don't set currentPage yet - let loadPollById handle it
                this.loadPollById(pollId, 'results');
                return;
            }
        }
        
        console.log('🔄 Checking query parameters...');
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
        console.log('✅ parseQueryString completed');
    }

    // Load poll data from server using just the poll ID
    async loadPollById(pollId, targetPage) {
        try {
            console.log(`🔍 Loading poll data for ID: ${pollId}`);
            const response = await fetch(`${this.apiUrl}/polls/${pollId}`);
            
            if (response.ok) {
                const data = await response.json();
                this.pollData = data.poll;
                console.log('✅ Poll data loaded from server:', this.pollData);
                
                // Set the page and show it after successful loading
                this.currentPage = targetPage;
                this.showPage(targetPage);
            } else if (response.status === 404) {
                console.error('❌ Poll not found');
                alert('Poll not found. Please check the URL.');
                this.currentPage = 'landing';
                this.showPage('landing');
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            console.error('❌ Failed to load poll data:', error);
            alert('Failed to load poll data. Please try again.');
            this.currentPage = 'landing';
            this.showPage('landing');
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

            console.log('📝 Creating poll with data:', pollData);
            // Send to server
            const response = await this.createPollOnServer(pollData);
            console.log('📋 Server response:', response);
            
            if (response.success) {
                console.log('✅ Poll created on server successfully');
                this.pollData = response.poll;
                this.votes = {};
                this.showPollCreatedPage();
            } else {
                throw new Error(response.error || 'Failed to create poll');
            }
        } catch (error) {
            console.error('❌ Error creating poll:', error);
            alert('Failed to create poll. Please check your internet connection and try again.');
            this.showPage('create');
        }
    }

    async createPollOnServer(pollData) {
        console.log('🌐 Sending request to:', `${this.apiUrl}/polls`);
        console.log('📦 Request data:', pollData);
        
        const response = await fetch(`${this.apiUrl}/polls`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(pollData)
        });

        console.log('📡 Response status:', response.status);
        console.log('📡 Response ok:', response.ok);

        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ Server error response:', errorData);
            throw new Error(errorData.error || 'Server error');
        }

        const result = await response.json();
        console.log('✅ Server success response:', result);
        return result;
    }

    // Override vote submission for server-side storage
    async submitVote(voteData) {
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
                console.log('✅ Vote submitted successfully');
                alert('Your vote has been submitted!');
                
                // Redirect to results page using clean URL
                const pollId = this.getPollIdFromUrl();
                window.location.href = `/results/${pollId}`;
            } else {
                throw new Error(response.error || 'Failed to submit vote');
            }
        } catch (error) {
            console.error('❌ Error submitting vote:', error);
            
            if (error.message.includes('already voted')) {
                alert('You have already voted in this poll.');
            } else if (error.message.includes('expired')) {
                alert('This poll has expired and is no longer accepting votes.');
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
        const pathMatch = path.match(/^\/(vote|results)\/([a-f0-9-]{36})$/);
        
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

        const response = await fetch(`${this.apiUrl}/votes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                pollId,
                voteData,
                voterIdentifier,
                voterInfo: {
                    timestamp: new Date().toISOString()
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
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
            console.log(`📊 Loading poll from server: ${pollId}`);
            
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
            if (this.socket) {
                this.socket.emit('joinPoll', pollId);
            }

            console.log('✅ Poll loaded successfully from server');
            console.log(`   Poll: ${this.pollData.title}`);
            console.log(`   Type: ${this.pollData.type}`);
            console.log(`   Total votes: ${this.pollData.totalVotes}`);
            
        } catch (error) {
            console.error('❌ Error loading poll:', error);
            throw error;
        }
    }

    // Override results loading for server-side storage
    async loadPollResults(pollId) {
        try {
            console.log(`📊 Loading results from server for poll: ${pollId}`);
            
            const response = await fetch(`${this.apiUrl}/polls/${pollId}/results`);
            
            if (!response.ok) {
                throw new Error('Failed to load poll results');
            }

            const data = await response.json();
            
            // Update local data
            this.pollData = data.poll;
            this.results = data.results;
            
            console.log('✅ Results loaded successfully from server');
            console.log(`   Total votes: ${data.metadata.totalVotes}`);
            
            return data;
        } catch (error) {
            console.error('❌ Error loading results:', error);
            throw error;
        }
    }

    // Handle real-time vote updates
    handleRealTimeVoteUpdate(data) {
        if (this.pollData && this.pollData.id === data.pollId) {
            console.log('🔄 Real-time vote update received');
            
            // Update vote count
            this.pollData.totalVotes = data.totalVotes;
            
            // Update UI if we're on results page
            if (this.currentPage === 'results') {
                this.updateVoteCountDisplay(data.totalVotes);
                
                // Show notification
                this.showRealTimeNotification('New vote received!');
            }
        }
    }

    // Handle real-time results updates
    handleRealTimeResultsUpdate(data) {
        if (this.pollData && this.pollData.id === data.pollId && this.currentPage === 'results') {
            console.log('🔄 Real-time results update received');
            
            // Update results data
            this.results = data.results;
            
            // Re-render results
            this.renderResultsContent();
            
            // Show notification
            this.showRealTimeNotification('Results updated!');
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
        const pathMatch = path.match(/^\/(vote|results)\/([a-f0-9-]{36})$/);
        
        let mode, pollId;
        
        if (pathMatch) {
            // Clean URL format: /vote/:id or /results/:id
            mode = pathMatch[1];
            pollId = pathMatch[2];
            console.log(`📊 Loading poll from clean URL: /${mode}/${pollId}`);
        } else {
            // Fallback to query parameter format for backwards compatibility
            const params = new URLSearchParams(window.location.search);
            mode = params.get('mode');
            pollId = params.get('id');
            
            if (mode && pollId) {
                console.log(`📊 Loading poll from query params: mode=${mode}, id=${pollId}`);
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
                console.error('❌ Error loading poll:', error);
                this.showPollLoadError(mode, pollId, error.message);
            }
        }
    }

    // Override showPollCreatedPage to use server-provided URLs
    showPollCreatedPage() {
        if (!this.pollData) return;

        // Use URLs provided by the server response
        const votingUrl = this.pollData.votingUrl || `${window.location.origin}/vote/${this.pollData.id}`;
        const resultsUrl = this.pollData.resultsUrl || `${window.location.origin}/results/${this.pollData.id}`;

        // Update URL fields
        document.getElementById('voting-link').value = votingUrl;
        document.getElementById('results-link').value = resultsUrl;

        this.showPage('poll-created');
    }

    // Add connection status to UI
    showLoadingState(mode) {
        // Simple loading state implementation
        console.log(`🔄 Loading ${mode}...`);
        
        // Add connection status
        const loadingContent = document.querySelector('.loading-message');
        if (loadingContent) {
            const statusDiv = document.createElement('div');
            statusDiv.className = 'connection-status';
            statusDiv.textContent = this.socket && this.socket.connected ? '🟢 Connected' : '🔴 Connecting...';
            loadingContent.appendChild(statusDiv);
        }
    }

    // Handle real-time vote updates
    handleRealTimeVoteUpdate(data) {
        console.log('📊 Real-time vote update received:', data);
        if (this.currentPage === 'results' && this.pollData && this.pollData.id === data.pollId) {
            // Refresh results if we're viewing this poll
            this.loadPollById(data.pollId);
        }
    }

    // Handle real-time results updates  
    handleRealTimeResultsUpdate(data) {
        console.log('📈 Real-time results update received:', data);
        if (this.currentPage === 'results' && this.pollData && this.pollData.id === data.pollId) {
            // Update results display
            this.pollData = data.poll;
            this.showPage('results');
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
        console.log('📡 Socket.IO loaded from CDN');
    };
    script.onerror = () => {
        console.warn('⚠️ Failed to load Socket.IO, real-time updates disabled');
    };
    document.head.appendChild(script);
}
