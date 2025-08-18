// GitHub Gist Storage Test Script
// Open browser console and run this to test GitHub Gist storage functionality

class GistStorageTest {
    constructor() {
        this.testResults = [];
        this.mockToken = 'ghp_test_token_example_only';
        this.testPollId = `test_poll_${Date.now()}`;
        this.testGistId = null;
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${type.toUpperCase()}: ${message}`;
        console.log(logMessage);
        this.testResults.push({ timestamp, type, message });
    }

    async testGitHubGistCreation() {
        this.log('Testing GitHub Gist creation...', 'test');
        
        const testPollData = {
            id: this.testPollId,
            title: 'Test Poll for Gist Storage',
            description: 'This is a test poll to verify GitHub Gist storage functionality',
            type: 'single-choice',
            requireAuth: false,
            validEmails: [],
            options: ['Option A', 'Option B', 'Option C'],
            created: new Date().toISOString(),
            createdBy: 'test-user'
        };

        const gistData = {
            description: `QuickPoll: ${testPollData.title}`,
            public: false,
            files: {
                "poll-data.json": {
                    content: JSON.stringify(testPollData, null, 2)
                },
                "votes.json": {
                    content: JSON.stringify({}, null, 2)
                },
                "metadata.json": {
                    content: JSON.stringify({
                        created: new Date().toISOString(),
                        pollId: testPollData.id,
                        version: "1.0"
                    }, null, 2)
                }
            }
        };

        // Check if we have a valid token using the app's validation method
        if (window.app && window.app.isTokenValid && window.app.isTokenValid()) {
            
            try {
                const response = await fetch('https://api.github.com/gists', {
                    method: 'POST',
                    headers: {
                        'Authorization': `token ${window.app.githubToken}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/vnd.github.v3+json'
                    },
                    body: JSON.stringify(gistData)
                });

                if (response.ok) {
                    const gist = await response.json();
                    this.testGistId = gist.id;
                    this.log(`✅ Gist created successfully: ${gist.id}`, 'success');
                    this.log(`   Gist URL: ${gist.html_url}`, 'info');
                    return true;
                } else {
                    this.log(`❌ Failed to create gist: ${response.status} ${response.statusText}`, 'error');
                    const errorText = await response.text();
                    this.log(`   Error details: ${errorText}`, 'error');
                    
                    if (response.status === 401) {
                        this.log(`   💡 This is likely due to an invalid or expired GitHub token`, 'warn');
                        this.log(`   Current token: ${window.app.githubToken.substring(0, 10)}...`, 'info');
                        this.log(`   Please ensure you have a valid GitHub Personal Access Token`, 'warn');
                    }
                    
                    return false;
                }
            } catch (error) {
                this.log(`❌ Network error creating gist: ${error.message}`, 'error');
                return false;
            }
        } else {
            this.log('⚠️  Cannot test actual GitHub API - no valid token found', 'warn');
            this.log('   Please set your GitHub token using: app.setGitHubToken("your_token")', 'warn');
            
            if (window.app && window.app.githubToken) {
                if (window.app.githubToken === 'GITHUB_TOKEN_NOT_SET') {
                    this.log(`   Token not configured - use app.setGitHubToken("your_token")`, 'info');
                } else {
                    this.log(`   Current token: ${window.app.githubToken.substring(0, 10)}... (length: ${window.app.githubToken.length})`, 'info');
                }
            } else {
                this.log(`   No token available`, 'info');
            }
            
            this.log('   To get a valid token:', 'info');
            this.log('   1. Go to GitHub → Settings → Developer Settings → Personal Access Tokens', 'info');
            this.log('   2. Generate a new token with "gist" scope', 'info');
            this.log('   3. Run: app.setGitHubToken("your_token_here")', 'info');
            
            return false;
        }
    }

    async testGistRetrieval() {
        this.log('Testing GitHub Gist retrieval...', 'test');
        
        if (!this.testGistId) {
            this.log('❌ No test gist ID available for retrieval test', 'error');
            return false;
        }

        if (window.app && window.app.isTokenValid && window.app.isTokenValid()) {
            
            try {
                const response = await fetch(`https://api.github.com/gists/${this.testGistId}`, {
                    headers: {
                        'Authorization': `token ${window.app.githubToken}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });

                if (response.ok) {
                    const gist = await response.json();
                    this.log('✅ Gist retrieved successfully', 'success');
                    this.log(`   Files found: ${Object.keys(gist.files).join(', ')}`, 'info');
                    
                    // Verify required files exist
                    const requiredFiles = ['poll-data.json', 'votes.json', 'metadata.json'];
                    const missingFiles = requiredFiles.filter(file => !gist.files[file]);
                    
                    if (missingFiles.length === 0) {
                        this.log('✅ All required files present in gist', 'success');
                        
                        // Test parsing of poll data
                        try {
                            const pollData = JSON.parse(gist.files['poll-data.json'].content);
                            const votes = JSON.parse(gist.files['votes.json'].content);
                            const metadata = JSON.parse(gist.files['metadata.json'].content);
                            
                            this.log('✅ All gist files contain valid JSON', 'success');
                            this.log(`   Poll title: ${pollData.title}`, 'info');
                            this.log(`   Poll options: ${pollData.options.length}`, 'info');
                            this.log(`   Votes count: ${Object.keys(votes).length}`, 'info');
                            
                            return true;
                        } catch (parseError) {
                            this.log(`❌ Failed to parse gist file content: ${parseError.message}`, 'error');
                            return false;
                        }
                    } else {
                        this.log(`❌ Missing required files: ${missingFiles.join(', ')}`, 'error');
                        return false;
                    }
                } else {
                    this.log(`❌ Failed to retrieve gist: ${response.status} ${response.statusText}`, 'error');
                    return false;
                }
            } catch (error) {
                this.log(`❌ Network error retrieving gist: ${error.message}`, 'error');
                return false;
            }
        } else {
            this.log('⚠️  Cannot test actual GitHub API - no valid token found', 'warn');
            return false;
        }
    }

    async testVoteSubmission() {
        this.log('Testing vote submission to gist...', 'test');
        
        if (!this.testGistId) {
            this.log('❌ No test gist ID available for vote test', 'error');
            return false;
        }

        if (window.app && window.app.isTokenValid && window.app.isTokenValid()) {
            
            try {
                // First get current gist
                const getResponse = await fetch(`https://api.github.com/gists/${this.testGistId}`, {
                    headers: {
                        'Authorization': `token ${window.app.githubToken}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });

                if (!getResponse.ok) {
                    this.log(`❌ Failed to get gist for vote test: ${getResponse.status}`, 'error');
                    return false;
                }

                const gist = await getResponse.json();
                const currentVotes = JSON.parse(gist.files['votes.json'].content);
                
                // Add a test vote
                const testVote = {
                    choice: 'Option A',
                    timestamp: new Date().toISOString(),
                    voter: 'test-voter'
                };
                
                const voteKey = `test_vote_${Date.now()}`;
                currentVotes[voteKey] = testVote;

                // Update gist with new vote
                const updateData = {
                    files: {
                        "votes.json": {
                            content: JSON.stringify(currentVotes, null, 2)
                        }
                    }
                };

                const updateResponse = await fetch(`https://api.github.com/gists/${this.testGistId}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `token ${window.app.githubToken}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/vnd.github.v3+json'
                    },
                    body: JSON.stringify(updateData)
                });

                if (updateResponse.ok) {
                    this.log('✅ Vote successfully submitted to gist', 'success');
                    this.log(`   Vote key: ${voteKey}`, 'info');
                    this.log(`   Vote choice: ${testVote.choice}`, 'info');
                    return true;
                } else {
                    this.log(`❌ Failed to update gist with vote: ${updateResponse.status}`, 'error');
                    const errorText = await updateResponse.text();
                    this.log(`   Error details: ${errorText}`, 'error');
                    return false;
                }
            } catch (error) {
                this.log(`❌ Network error submitting vote: ${error.message}`, 'error');
                return false;
            }
        } else {
            this.log('⚠️  Cannot test actual GitHub API - no valid token found', 'warn');
            return false;
        }
    }

    async testApplicationIntegration() {
        this.log('Testing application integration...', 'test');
        
        // Check if QuickPollGitHubApp is available
        if (typeof QuickPollGitHubApp === 'undefined') {
            this.log('❌ QuickPollGitHubApp class not found', 'error');
            return false;
        }
        
        this.log('✅ QuickPollGitHubApp class is available', 'success');
        
        // Check if app instance exists
        if (window.app && window.app instanceof QuickPollGitHubApp) {
            this.log('✅ App instance is available and correct type', 'success');
            
            // Check storage mode
            if (window.app.storageMode === 'gist') {
                this.log('✅ App configured for GitHub Gist storage', 'success');
            } else {
                this.log(`❌ App storage mode is ${window.app.storageMode}, expected 'gist'`, 'error');
                return false;
            }
            
            // Check if required methods exist
            const requiredMethods = ['storePollOnGitHub', 'loadPollFromGitHub', 'submitVoteToGitHub'];
            const missingMethods = requiredMethods.filter(method => 
                typeof window.app[method] !== 'function'
            );
            
            if (missingMethods.length === 0) {
                this.log('✅ All required GitHub methods are available', 'success');
                return true;
            } else {
                this.log(`❌ Missing methods: ${missingMethods.join(', ')}`, 'error');
                return false;
            }
        } else {
            this.log('❌ App instance not found or incorrect type', 'error');
            return false;
        }
    }

    async cleanupTestGist() {
        this.log('Cleaning up test gist...', 'test');
        
        if (!this.testGistId) {
            this.log('⚠️  No test gist to cleanup', 'warn');
            return true;
        }

        if (window.app && window.app.isTokenValid && window.app.isTokenValid()) {
            
            try {
                const response = await fetch(`https://api.github.com/gists/${this.testGistId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `token ${window.app.githubToken}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });

                if (response.ok || response.status === 404) {
                    this.log('✅ Test gist cleaned up successfully', 'success');
                    return true;
                } else {
                    this.log(`⚠️  Failed to delete test gist: ${response.status}`, 'warn');
                    this.log(`   Gist ID: ${this.testGistId} (manual cleanup may be needed)`, 'warn');
                    return false;
                }
            } catch (error) {
                this.log(`⚠️  Error deleting test gist: ${error.message}`, 'warn');
                this.log(`   Gist ID: ${this.testGistId} (manual cleanup may be needed)`, 'warn');
                return false;
            }
        } else {
            this.log('⚠️  Cannot cleanup - no valid token found', 'warn');
            return false;
        }
    }

    async runAllTests() {
        console.log('🚀 Starting GitHub Gist Storage Tests...');
        console.log('='.repeat(60));
        
        const startTime = Date.now();
        let passedTests = 0;
        let totalTests = 0;
        
        // Test 1: Application Integration
        totalTests++;
        const integrationResult = await this.testApplicationIntegration();
        if (integrationResult) passedTests++;
        
        // Test 2: Gist Creation (only if app is properly configured)
        totalTests++;
        const creationResult = await this.testGitHubGistCreation();
        if (creationResult) passedTests++;
        
        // Test 3: Gist Retrieval (only if creation succeeded)
        if (creationResult) {
            totalTests++;
            const retrievalResult = await this.testGistRetrieval();
            if (retrievalResult) passedTests++;
            
            // Test 4: Vote Submission (only if retrieval succeeded)
            if (retrievalResult) {
                totalTests++;
                const voteResult = await this.testVoteSubmission();
                if (voteResult) passedTests++;
            }
            
            // Cleanup
            await this.cleanupTestGist();
        }
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log('='.repeat(60));
        console.log('📊 Test Results Summary:');
        console.log(`   Tests passed: ${passedTests}/${totalTests}`);
        console.log(`   Success rate: ${Math.round((passedTests/totalTests) * 100)}%`);
        console.log(`   Duration: ${duration}ms`);
        
        if (passedTests === totalTests) {
            console.log('🎉 All tests passed! GitHub Gist storage is working correctly.');
        } else {
            console.log('⚠️  Some tests failed. Check the logs above for details.');
        }
        
        return {
            passed: passedTests,
            total: totalTests,
            success: passedTests === totalTests,
            duration,
            results: this.testResults
        };
    }
}

// Convenience functions
function testGistStorage() {
    const tester = new GistStorageTest();
    return tester.runAllTests();
}

function quickGistTest() {
    console.log('🔍 Quick GitHub Gist Storage Check...');
    
    // Check if app is available
    if (typeof QuickPollGitHubApp === 'undefined') {
        console.log('❌ QuickPollGitHubApp class not found - make sure github-gist-script.js is loaded');
        return;
    }
    
    if (!window.app) {
        console.log('❌ App instance not found - make sure the app is initialized');
        return;
    }
    
    console.log('✅ App instance found');
    console.log(`   Storage mode: ${window.app.storageMode}`);
    console.log(`   GitHub token set: ${!!window.app.githubToken}`);
    console.log(`   Token valid: ${window.app.isTokenValid ? window.app.isTokenValid() : 'method not available'}`);
    
    // Check for token in URL
    const urlToken = window.app.loadTokenFromURL ? window.app.loadTokenFromURL() : null;
    if (urlToken) {
        console.log('✅ Token found in URL - will be loaded automatically');
        console.log(`   URL Token preview: ${urlToken.substring(0, 15)}... (length: ${urlToken.length})`);
    }
    
    if (window.app.githubToken) {
        const tokenPreview = window.app.githubToken.substring(0, 15) + '...';
        console.log(`   Token preview: ${tokenPreview} (length: ${window.app.githubToken.length})`);
        
        // Detect token type
        if (window.app.githubToken.startsWith('ghp_')) {
            console.log(`   Token type: Classic (ghp_)`);
        } else if (window.app.githubToken.startsWith('github_pat_')) {
            console.log(`   Token type: Fine-grained (github_pat_)`);
        } else {
            console.log(`   Token type: Unknown format`);
        }
        
        if (window.app.githubToken === 'GITHUB_TOKEN_NOT_SET') {
            console.log('⚠️  Token not configured - use app.setGitHubToken("your_token")');
            console.log('   📝 Instructions:');
            console.log('   1. Go to GitHub → Settings → Developer Settings → Personal Access Tokens');
            console.log('   2. Generate a new token (classic or fine-grained) with "gist" scope');
            console.log('   3. Run: app.setGitHubToken("your_token_here")');
            console.log('   💡 Or include token in URL: ?token=your_token_here');
        } else if (window.app.isTokenValid && window.app.isTokenValid()) {
            console.log('✅ Token is valid and ready for use');
            console.log('✅ Poll URLs will include token for seamless sharing');
        } else {
            console.log('⚠️  Token format may be invalid - use app.setGitHubToken("your_token")');
            console.log('   📝 Supported formats:');
            console.log('   - Classic: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
            console.log('   - Fine-grained: github_pat_11XXXXXXXXX_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
        }
    }
    
    const requiredMethods = ['storePollOnGitHub', 'loadPollFromGitHub', 'submitVoteToGitHub'];
    const availableMethods = requiredMethods.filter(method => 
        typeof window.app[method] === 'function'
    );
    
    console.log(`   Available GitHub methods: ${availableMethods.length}/${requiredMethods.length}`);
    
    console.log('\n💡 Run testGistStorage() for comprehensive testing');
}

// Auto-run quick test on load
console.log('GitHub Gist Storage Test Script Loaded');
console.log('Run quickGistTest() for a quick check or testGistStorage() for full testing');
