# Processor Learning Hub

## Overview
An interactive learning platform for computer architecture and microprocessors. Built with React, Vite, and powered by Google's Gemini AI for intelligent tutoring, code analysis, and educational content generation.

## Project Architecture

### Frontend
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS (CDN)
- **Port**: 5000

### Key Features
- Processor selection and comparison
- Interactive learning hub with AI-powered explanations
- Code editor with syntax highlighting
- Architecture visualizations
- Timeline of processor evolution
- Glossary of computer architecture terms
- Quiz generation and interview preparation

### Technologies
- **React**: UI framework
- **Vite**: Build tool and dev server
- **TypeScript**: Type safety
- **Google Gemini AI**: AI-powered educational features
- **Firebase**: Authentication (currently disabled)
- **Tailwind CSS**: Styling

## Configuration

### Environment Variables
The application requires a Gemini API key to function. Set the following secret in Replit:

- `GEMINI_API_KEY`: Your Google Gemini API key

The Vite configuration automatically maps `GEMINI_API_KEY` to `VITE_GEMINI_API_KEY` for client-side access.

### Development Server
- Port: 5000
- Host: 0.0.0.0 (configured for Replit proxy)
- Command: `npm run dev`

## Project Structure
```
components/          - React components (UI, views, visualizations)
contexts/           - React contexts (Auth, UserProgress)
services/           - External service integrations (Gemini, Firebase)
assets/             - Static assets (images, diagrams)
constants.ts        - Application constants
types.ts            - TypeScript type definitions
App.tsx             - Main application component
index.tsx           - Application entry point
vite.config.ts      - Vite configuration
```

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set API Key**
   - Add `GEMINI_API_KEY` secret in Replit Secrets
   - Get your key from: https://aistudio.google.com/apikey

3. **Run Development Server**
   ```bash
   npm run dev
   ```
   Server will start on http://localhost:5000

## Recent Changes (2025-10-04)

### Replit Environment Setup
- Configured Vite to use port 5000 (Replit requirement)
- Updated host configuration to 0.0.0.0 with proper HMR settings
- Fixed API key handling to use Vite environment variables
- Removed insecure `define` block that exposed API keys
- Created TypeScript declarations for environment variables
- Configured workflow for automatic server startup

### Security Improvements
- Migrated from `process.env` to `import.meta.env` for Vite compatibility
- API key now properly sourced from Replit secrets
- Added vite-env.d.ts for TypeScript support

## Notes
- Firebase authentication is currently disabled
- Application uses CDN version of Tailwind CSS (not recommended for production)
- API key is exposed client-side (inherent limitation of frontend-only architecture)
