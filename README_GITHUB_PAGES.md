# QuickPoll - GitHub Pages Edition

A serverless real-time polling application that uses GitHub Issues as a backend, deployed on GitHub Pages.

## 🌟 Features

- **Serverless Architecture**: No backend server needed - runs entirely on GitHub Pages
- **GitHub Issues as Database**: All poll data stored as GitHub Issues, fully transparent and version controlled
- **Real-Time Results**: See poll results update as votes come in
- **Email Authentication**: Optional voter authentication via GitHub
- **Restricted Voting**: Limit voting to specific email addresses
- **Mobile-Friendly**: Responsive design works on all devices
- **QR Code Generation**: Easy sharing with auto-generated QR codes

## 🚀 How It Works

### Data Storage
- **Polls**: Each poll is created as a GitHub Issue with labels `quickpoll`, `poll`, and `active`
- **Votes**: Votes are stored as comments on the poll's GitHub Issue
- **Sessions**: User sessions are managed client-side using localStorage
- **Active Poll**: The most recent open issue with `quickpoll` and `active` labels

### Architecture
```
┌─────────────────┐
│   GitHub Pages  │  ← Static hosting
│   (Frontend)    │
└────────┬────────┘
         │
         ├─→ GitHub API (Issues)
         │   └─→ Create/Read/Update Issues
         │   └─→ Create/Read Comments
         │
         └─→ localStorage (Client)
             └─→ Store auth tokens
             └─→ Track anonymous voters
```

## 📋 Setup Instructions

### 1. Create a GitHub Personal Access Token

You can use either a **fine-grained token** (recommended for better security) or a **classic token**.

#### Option A: Fine-Grained Token (Recommended)

1. Go to [GitHub Settings > Developer settings > Personal access tokens > Fine-grained tokens](https://github.com/settings/tokens?type=beta)
2. Click **"Generate new token"**
3. Give it a name like "QuickPoll"
4. Set **Expiration** (e.g., 90 days, 1 year, or custom)
5. Under **Repository access**, select **"Only select repositories"**
6. Choose your QuickPoll repository from the dropdown
7. Under **Permissions > Repository permissions**, grant:
   - **Issues**: Read and write access
   - **Metadata**: Read-only (automatically granted)
8. Click **"Generate token"**
9. **Copy the token** (you won't be able to see it again!)

#### Option B: Classic Token

1. Go to [GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)](https://github.com/settings/tokens)
2. Click **"Generate new token (classic)"**
3. Give it a name like "QuickPoll"
4. Select the **`public_repo`** scope (allows access to public repositories)
5. Click **"Generate token"**
6. **Copy the token** (you won't be able to see it again!)

### 2. Configure Your Repository

1. Update [`config.js`](config.js) with your GitHub username and repository name:

```javascript
window.GITHUB_CONFIG = {
    owner: 'YOUR_GITHUB_USERNAME',
    repo: 'YOUR_REPO_NAME',
    version: '3.0.0-github-pages',
    debug: true
};
```

2. Make sure your repository has **Issues enabled**:
   - Go to your repository settings
   - Scroll to "Features"
   - Ensure "Issues" is checked

### 3. Deploy to GitHub Pages

1. Rename [`index-github.html`](index-github.html) to `index.html`:
   ```bash
   mv index-github.html index.html
   ```

2. Commit and push your changes:
   ```bash
   git add .
   git commit -m "Setup GitHub Pages version"
   git push origin main
   ```

3. Enable GitHub Pages:
   - Go to your repository **Settings**
   - Scroll to **Pages** section
   - Under "Source", select **Deploy from a branch**
   - Select **main** branch and **/ (root)** folder
   - Click **Save**

4. Wait a few minutes for deployment, then visit:
   ```
   https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/
   ```

## 🎯 Usage

### Creating a Poll

1. Visit your GitHub Pages site
2. Click **"Sign in with GitHub"**
3. Enter your Personal Access Token when prompted
4. Fill in the poll details:
   - Poll title
   - Description (optional)
   - Poll type (Simple Choice or Multiple Choice)
   - Authentication mode
   - Poll options
5. Click **"Create Poll"**

### Voting

1. Share the voting link with participants
2. Voters click the link and select their choice
3. Votes are submitted as comments on the GitHub Issue
4. Results update in real-time

### Managing Polls

- **View Results**: Navigate to the Results page to see vote counts
- **Close Poll**: Poll creators can close polls to prevent further voting
- **Delete Poll**: Close the GitHub Issue directly to remove the poll

## 📁 File Structure

```
quickPoll/
├── index-github.html          # Main HTML file for GitHub Pages
├── config.js                  # Configuration (owner, repo)
├── github-api-client.js       # GitHub API wrapper
├── github-auth.js             # Authentication handler
├── github-pages-app.js        # Main application logic
├── styles.css                 # Styling
├── email-auth-styles.css      # Additional styles
└── README_GITHUB_PAGES.md     # This file
```

## 🔐 Security Considerations

### Token Storage
- Personal Access Tokens are stored in **localStorage**
- Tokens are **never sent to any server** (except GitHub API)
- Users should use tokens with **minimal required permissions** (`public_repo` only)

### Vote Integrity
- Anonymous voting: Uses browser fingerprinting (localStorage ID)
- Authenticated voting: Requires GitHub sign-in
- Duplicate vote prevention: Checks existing comments for voter identifiers

### Data Privacy
- All poll data is stored as **public GitHub Issues**
- Voter identifiers (emails) are visible in issue comments
- Consider using restricted polls for sensitive topics

## 🛠️ Troubleshooting

### "Failed to create poll"
- **Check token permissions**: Make sure your token has `public_repo` scope
- **Verify repository config**: Ensure `config.js` has correct owner/repo names
- **Check Issues enabled**: Make sure Issues are enabled in repository settings

### "No active poll found"
- **Create a poll first**: Visit the home page and create a poll
- **Check poll status**: Make sure the poll Issue is open, not closed
- **Verify labels**: Poll should have `quickpoll`, `poll`, and `active` labels

### Rate Limiting
- GitHub API has rate limits (60 requests/hour for unauthenticated, 5000/hour for authenticated)
- Authenticated requests use your token's rate limit
- If you hit the limit, wait an hour or use a different token

## 🔄 Migrating from Server Version

If you're migrating from the Express.js server version:

1. **Export existing poll data**:
   - The server version stores data in memory
   - You'll need to manually recreate polls as GitHub Issues

2. **Update client code**:
   - Replace `server-client-script.js` with `github-pages-app.js`
   - Update `index.html` to use `index-github.html`

3. **Authentication changes**:
   - Users now sign in with GitHub tokens instead of email OTP
   - Update any documentation or instructions

## 📊 GitHub Issues Structure

### Poll Issue Format

```markdown
## Poll Title

Description of the poll (if provided)

### Options

1. Option 1
2. Option 2
3. Option 3

### Poll Configuration

- **Created By**: user@example.com
- **Created At**: 2025-10-20T12:00:00.000Z
- **Type**: simple
- **Require Auth**: true
- **Authorized Emails**: email1@example.com, email2@example.com

---

<!-- POLL_DATA
{
  "title": "Poll Title",
  "description": "Description",
  "options": ["Option 1", "Option 2", "Option 3"],
  "type": "simple",
  "requireAuth": true,
  "validEmails": ["email1@example.com"],
  "createdBy": "user@example.com",
  "createdByGitHub": "username"
}
-->
```

### Vote Comment Format

```markdown
### 🗳️ Vote Submitted

**Selected Option**: 0
**Voter**: user@example.com
**Timestamp**: 2025-10-20T12:05:00.000Z

<!-- VOTE_DATA
{
  "option": 0,
  "selectedOptions": [0],
  "voterIdentifier": "user@example.com"
}
-->
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- Built with GitHub API
- QR codes powered by QRServer API
- Inspired by the need for simple, transparent polling solutions

## 📞 Support

If you encounter issues:
1. Check the [Troubleshooting](#-troubleshooting) section
2. Review GitHub Issues in your repository
3. Check browser console for error messages
4. Verify your Personal Access Token has correct permissions

---

**Made with ❤️ using GitHub Issues as a database**
