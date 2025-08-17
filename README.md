# QuickPoll - Real-time Voting Application

QuickPoll is a web-based application that enables you to create ranking, rating, and poll voting contests and view the results in real time. Your audience can participate live on their mobile phones, tablets, and desktops. There is nothing to download or install.

## Features

- **Three Types of Polls:**
  - **Simple Polls**: Multiple choice or Yes/No questions
  - **Rating Polls**: Rate items on a 1-5 star scale
  - **Ranking Polls**: Drag and drop to rank items in order of preference

- **Real-time Results**: View live results as votes come in
- **Mobile Responsive**: Works on all devices
- **No Server Required**: Runs entirely in the browser using localStorage
- **Easy Sharing**: Generate shareable links for voting and viewing results
- **Query String Communication**: All data is passed via URL parameters

## How to Use

### Creating a Poll

1. Open `index.html` in your web browser
2. Click on one of the "Create Poll" buttons on the homepage
3. Fill in your poll details:
   - Poll title (required)
   - Description (optional)
   - Poll type (Simple, Rating, or Ranking)
   - Add your options (minimum 2 required)
4. Click "Create Poll"
5. Copy the generated voting and results links to share with your audience

### Voting

1. Use the voting link shared by the poll creator
2. Select your choice(s) based on the poll type:
   - **Simple Poll**: Click on your preferred option
   - **Rating Poll**: Click stars to rate each option (1-5 stars)
   - **Ranking Poll**: Drag options to reorder them by preference
3. Click "Submit Vote"
4. You'll be redirected to see the current results

### Viewing Results

1. Use the results link or enter the Poll ID when prompted
2. Results update in real-time as new votes are submitted
3. Click "Refresh Results" to see the latest data
4. Use "Close Poll" button to permanently delete the poll and all its data

### Managing Polls

- **Close Poll**: Permanently delete a poll and all its votes from localStorage
- **Confirmation Required**: Double confirmation prevents accidental deletion
- **Immediate Effect**: Once closed, the poll becomes completely inaccessible

## Technical Details

### File Structure

```text
quickPoll/
├── index.html          # Main application file
├── styles.css          # Styling and responsive design
├── email-auth-script.js # Application logic and functionality
├── email-auth-styles.css # Email authentication styles
└── README.md          # This documentation
```

### Data Storage

- **Poll Data**: Stored in localStorage using the key `poll_{pollId}`
- **Vote Data**: Stored in localStorage using the key `votes_{pollId}`
- **URL Parameters**: Used for sharing polls and passing data between sessions

### URL Parameters

The application uses query string parameters for communication:

**Voting URL Format:**

```text
?mode=vote&id={pollId}&title={title}&type={type}&opt0={option1}&opt1={option2}...
```

**Results URL Format:**

```text
?mode=results&id={pollId}&title={title}&type={type}&opt0={option1}&opt1={option2}...
```

### Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- JavaScript ES6+ support required
- localStorage support required

## Poll Types Explained

### Simple Polls

- Single or multiple choice questions
- Results show vote counts and percentages
- Example: "What's your favorite color?"

### Rating Polls

- Rate multiple items on a 1-5 star scale
- Results show average ratings
- Example: "Rate these movie genres"

### Ranking Polls

- Drag and drop to rank items in order of preference
- Results calculated using positional scoring
- Example: "Rank these features by importance"

## Key Features

### Responsive Design

- Mobile-first approach
- Touch-friendly interface
- Works on phones, tablets, and desktops

### Real-time Updates

- Results update immediately after voting
- No page refresh required
- Live vote counting

### Easy Sharing

- One-click copy buttons for sharing links
- QR codes can be generated for the URLs
- No account registration required

## Getting Started

1. Download or clone this repository
2. Open `index.html` in any modern web browser
3. Start creating polls immediately - no setup required!

## Limitations

- Data is stored locally in the browser
- Polls are not persistent across different browsers/devices for the creator
- No authentication system
- No vote validation (users can vote multiple times from different browsers)
- No admin controls or poll management

## Future Enhancements

- QR code generation for easy mobile sharing
- Export results to CSV
- Poll templates
- Time-limited polls
- Anonymous vs. identified voting options
- Poll password protection

## License

This project is open source and available under the MIT License.
