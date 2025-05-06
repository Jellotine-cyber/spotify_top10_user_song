# Spotifly 🎵

This is a web app using the Spotify Web Playback SDK to log in, display top tracks, and control playback inside your browser.

## Features
- Spotify OAuth login
- Top 10 tracks display with album art
- Play, pause, resume, and restart controls
- Uses Web Playback SDK
- Backend powered by Express.js

## Setup

1. Clone repo
2. Create a `.env` file (see `.env.example`)
3. Run `npm install`
4. Start server: `node server.js`
5. Visit `http://localhost:8888/login`
   
## 🔮 Future Feature Ideas

- 🎮 **Browser Rhythm Game**
  - Inspired by Chrome's Dinosaur game or Flappy Bird
  - Obstacles appear in sync with the beat of the current Spotify track
  - Player must jump/dodge to avoid obstacles in rhythm
  - Uses tempo or beat data from Spotify's track analysis API
  - Simple controls (e.g., spacebar to jump)
  - Works directly in the browser alongside playback
