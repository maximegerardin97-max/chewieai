# Image Canvas with Dust.tt AI Integration

A beautiful image canvas application built with ShadCN design principles, now enhanced with Dust.tt AI agent integration for intelligent design analysis and feedback.

## Features

- **Drag & Drop Interface**: Intuitive image upload and manipulation
- **Magnetic Zone**: AI-powered design analysis when images are placed in the central zone
- **Real-time Feedback**: Get instant AI feedback on your designs
- **Responsive Design**: Works seamlessly across all devices
- **Modern UI**: Built with ShadCN design system principles

## AI Integration

This app connects to your Dust.tt AI agent to provide intelligent design analysis. When you drag an image to the central magnetic zone, it will:

1. Analyze the design composition, colors, and style
2. Provide specific feedback and improvement suggestions
3. Rate the overall impact and effectiveness
4. Offer actionable recommendations

## Setup

### 1. Get Your Dust.tt Credentials

1. Go to [Dust.tt](https://dust.tt) and sign in
2. Navigate to your AI agent
3. Copy your **API Key** and **Agent ID**

### 2. Configure the App

1. Open the app in your browser
2. Look for the **🤖 Dust.tt AI Settings** panel on the top right
3. Enter your API Key and Agent ID
4. Click "Save Settings"

### 3. Start Using

1. Upload images using the "Upload Images" button
2. Drag images to the central magnetic zone
3. Wait for AI analysis (usually takes 10-30 seconds)
4. View detailed feedback and suggestions

## Usage

### Basic Operations

- **Upload Images**: Click the upload button or drag files directly
- **Move Images**: Click and drag images around the canvas
- **Resize Images**: Use the corner handles to resize (hold Shift for aspect ratio)
- **Delete Images**: Press Delete/Backspace or use the × button
- **Clear All**: Remove all images with confirmation

### AI Analysis

1. **Drag to Zone**: Move any image to the central magnetic zone
2. **Automatic Processing**: The AI will analyze your design
3. **View Feedback**: See detailed analysis and suggestions
4. **Apply Insights**: Use the feedback to improve your designs

## Technical Details

- **Frontend**: Vanilla JavaScript with modern ES6+ features
- **Styling**: Custom CSS with ShadCN design tokens
- **AI Integration**: RESTful API calls to Dust.tt
- **Storage**: Local browser storage for configuration
- **Responsive**: Mobile-first design with touch support

## API Endpoints Used

- `POST /api/v1/agents/{agent_id}/runs` - Submit image for analysis
- `GET /api/v1/agents/{agent_id}/runs/{run_id}` - Check analysis status

## Troubleshooting

### Common Issues

1. **"API key or Agent ID not configured"**
   - Check your settings in the configuration panel
   - Ensure both fields are filled correctly

2. **"Processing Error"**
   - Verify your Dust.tt credentials are valid
   - Check your internet connection
   - Ensure your agent is active and accessible

3. **Images not processing**
   - Make sure images are in supported formats (JPEG, PNG, etc.)
   - Check that images are properly uploaded

### Getting Help

- Verify your Dust.tt account has active credits
- Check that your agent is properly configured for image analysis
- Ensure your API key has the necessary permissions

## Development

### Running Locally

```bash
# Start a local server
npm run dev

# Or use Python
python3 -m http.server 8000
```

### Project Structure

```
├── index.html          # Main HTML file
├── script.js           # JavaScript application logic
├── styles.css          # CSS styles and animations
├── package.json        # Project configuration
└── README.md           # This file
```

## Contributing

Feel free to submit issues and enhancement requests!

## License

ISC License - feel free to use this project for personal or commercial purposes.
