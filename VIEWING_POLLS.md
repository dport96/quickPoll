# Using QuickPoll with GitHub Gist Storage

## For Poll Creators

### 1. Set Up Your GitHub Token
```javascript
// In browser console (F12):
app.setGitHubToken("your_github_token_here")
```

### 2. Create Polls
- Polls are automatically stored as private GitHub Gists
- The gist ID becomes the poll identifier
- Share the voting/results links with your audience

### 3. Share Poll Links
After creating a poll, you'll get two links:
- **Voting Link**: For participants to vote
- **Results Link**: To view live results

## For Poll Viewers/Voters

### Viewing Polls Created by Others

**If you're just voting** (no GitHub account needed):
- Click the voting link shared with you
- Vote directly (no setup required)

**If you want to view results** and the poll is stored on GitHub:

1. **Get a GitHub token:**
   - Go to: https://github.com/settings/tokens
   - Generate new token with "gist" scope
   - Copy the token

2. **Set token in browser:**
   - Open browser console (F12)
   - Run: `app.setGitHubToken("your_token_here")`

3. **View the poll:**
   - Refresh the page or click the results link again

### Why Do I Need a Token to View Results?

GitHub Gists (where polls are stored) require authentication to access, even for viewing. This ensures:
- Poll data is securely stored
- Only intended viewers can see results
- No risk of poll data being lost

## Troubleshooting

### "Poll Not Found" Error
1. **Check if you have a token set:**
   ```javascript
   app.isTokenValid() // Should return true
   ```

2. **Set your token:**
   ```javascript
   app.setGitHubToken("your_token_here")
   ```

3. **Verify token works:**
   ```javascript
   quickGistTest() // Should show "Token is valid"
   ```

### "GitHub Token Required" Message
This means you need to set up your GitHub token (see instructions above).

### Invalid Gist ID
- Check that the poll URL is correct
- Ensure the gist ID in the URL is valid
- Verify the poll creator shared the correct link

## Security Notes

- Tokens are stored in your browser session only
- Tokens are never committed to the repository
- Use minimal "gist" scope for security
- Regenerate tokens if compromised

## Quick Commands

```javascript
// Check app status
quickGistTest()

// Set token
app.setGitHubToken("your_token")

// Check token validity
app.isTokenValid()

// Clear token
app.clearGitHubToken()

// Full storage test
testGistStorage()
```
