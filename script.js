// MyVote Application
class MyVoteApp {
    constructor() {
        this.currentPage = 'landing';
        this.pollData = null;
        this.votes = {};
        this.init();
    }

    init() {
        this.bindEvents();
        this.parseQueryString();
        this.showPage(this.currentPage);
    }

    bindEvents() {
        // Navigation events
        document.getElementById('create-poll-btn').addEventListener('click', () => this.showCreatePage());
        document.getElementById('create-ranking-btn').addEventListener('click', () => this.showCreatePage('ranking'));
        document.getElementById('create-rating-btn').addEventListener('click', () => this.showCreatePage('rating'));
        document.getElementById('create-poll-btn-hero').addEventListener('click', () => this.showCreatePage('simple'));
        document.getElementById('view-results-btn').addEventListener('click', () => this.showResultsPage());
        document.getElementById('back-to-home').addEventListener('click', () => this.showPage('landing'));

        // Form events
        document.getElementById('poll-form').addEventListener('submit', (e) => this.handleCreatePoll(e));
        document.getElementById('add-option-btn').addEventListener('click', () => this.addOption());
        document.getElementById('poll-type').addEventListener('change', (e) => this.handlePollTypeChange(e));

        // Option removal events
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-option')) {
                this.removeOption(e.target);
            }
        });

        // Poll created page events
        document.getElementById('copy-voting-link').addEventListener('click', () => this.copyToClipboard('voting-link'));
        document.getElementById('copy-results-link').addEventListener('click', () => this.copyToClipboard('results-link'));
        document.getElementById('view-results-now').addEventListener('click', () => this.viewResults());
        document.getElementById('create-another-poll').addEventListener('click', () => this.showPage('landing'));
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
        this.showPage('create');
        if (type) {
            document.getElementById('poll-type').value = type;
            this.handlePollTypeChange({ target: { value: type } });
        }
    }

    showResultsPage() {
        const pollId = prompt('Enter Poll ID to view results:');
        if (pollId) {
            window.location.href = `?mode=results&id=${pollId}`;
        }
    }

    handlePollTypeChange(e) {
        const type = e.target.value;
        const optionsContainer = document.getElementById('options-container');
        
        if (type === 'rating') {
            optionsContainer.style.display = 'block';
            // For rating polls, we need items to rate
        } else if (type === 'ranking') {
            optionsContainer.style.display = 'block';
            // For ranking polls, we need items to rank
        } else {
            optionsContainer.style.display = 'block';
            // For simple polls, we need options to choose from
        }
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
    }

    removeOption(button) {
        const optionsList = document.getElementById('options-list');
        if (optionsList.children.length > 2) {
            button.parentElement.remove();
        } else {
            alert('You must have at least 2 options.');
        }
    }

    handleCreatePoll(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const pollData = {
            id: this.generateId(),
            title: formData.get('title'),
            description: formData.get('description'),
            type: formData.get('type'),
            options: formData.getAll('option').filter(option => option.trim() !== ''),
            created: new Date().toISOString()
        };

        if (pollData.options.length < 2) {
            alert('Please add at least 2 options.');
            return;
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
        const baseUrl = window.location.origin + window.location.pathname;
        const pollParams = this.createPollParams(this.pollData);
        
        const votingLink = `${baseUrl}?mode=vote&${pollParams}`;
        const resultsLink = `${baseUrl}?mode=results&${pollParams}`;

        document.getElementById('voting-link').value = votingLink;
        document.getElementById('results-link').value = resultsLink;

        this.showPage('poll-created');
    }

    createPollParams(pollData) {
        const params = new URLSearchParams();
        params.set('id', pollData.id);
        params.set('title', pollData.title);
        if (pollData.description) params.set('desc', pollData.description);
        params.set('type', pollData.type);
        
        pollData.options.forEach((option, index) => {
            params.set(`opt${index}`, option);
        });

        return params.toString();
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
        window.location.href = resultsLink;
    }

    renderVotePage() {
        const container = document.getElementById('vote-content');
        
        if (!this.pollData) {
            container.innerHTML = `
                <div class="vote-container">
                    <h2>Poll Not Found</h2>
                    <p>The requested poll could not be found.</p>
                    <button onclick="location.href='./'" class="btn btn-primary">Go Home</button>
                </div>
            `;
            return;
        }

        let content = `
            <div class="vote-container">
                <h2>${this.pollData.title}</h2>
                ${this.pollData.description ? `<p>${this.pollData.description}</p>` : ''}
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
                    <button onclick="location.href='./'" class="btn btn-secondary">Back to Home</button>
                </div>
            </div>
        `;

        container.innerHTML = content;
        this.bindVoteEvents();
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

        if (this.pollData.type === 'simple') {
            this.bindSimplePollEvents();
        } else if (this.pollData.type === 'rating') {
            this.bindRatingEvents();
        } else if (this.pollData.type === 'ranking') {
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
        const voterId = this.generateId();
        const votesKey = `votes_${this.pollData.id}`;
        
        // Load existing votes
        const existingVotes = JSON.parse(localStorage.getItem(votesKey) || '{}');
        
        // Add new vote
        existingVotes[voterId] = {
            ...voteData,
            timestamp: new Date().toISOString()
        };
        
        // Save updated votes
        localStorage.setItem(votesKey, JSON.stringify(existingVotes));
        this.votes = existingVotes;

        // Show success message and redirect to results
        alert('Your vote has been submitted!');
        
        // Redirect to results page
        const baseUrl = window.location.origin + window.location.pathname;
        const pollParams = this.createPollParams(this.pollData);
        const resultsLink = `${baseUrl}?mode=results&${pollParams}`;
        window.location.href = resultsLink;
    }

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

        const totalVotes = Object.keys(this.votes).length;
        
        let content = `
            <div class="results-container">
                <h2>Results: ${this.pollData.title}</h2>
                ${this.pollData.description ? `<p>${this.pollData.description}</p>` : ''}
                <p><strong>Total Votes: ${totalVotes}</strong></p>
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
        }

        content += `
                <div class="form-actions">
                    <button onclick="location.reload()" class="btn btn-primary">Refresh Results</button>
                    <button onclick="location.href='./'" class="btn btn-secondary">Back to Home</button>
                </div>
            </div>
        `;

        container.innerHTML = content;
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
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new MyVoteApp();
});
