require('dotenv').config();
const cookieParser = require('cookie-parser');
const express = require('express');
const querystring = require('querystring');
const axios = require('axios');

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;
const PORT = process.env.PORT || 3000;

if(!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET){
    console.error("Missing Spotify API credentials!");
    process.exit(1);
}



console.log("Loaded Spotify credentials successfully!");

function generateRandomString(length) {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    
    for (let i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

const app = express();
app.use(cookieParser());

app.use(express.static('public'));

app.get('/login',function(req,res){
    const state = generateRandomString(16);
    const scope = [
      'user-read-private',
      'user-read-email',
      'playlist-read-private',
      'user-top-read',
      'streaming',
      'user-modify-playback-state',  // ← To control playback
      'user-read-playback-state',
      'user-read-recently-played',
      'user-read-playback-state'
    ].join(' ');
    res.cookie('spotify_auth_state', state);

    res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: SPOTIFY_CLIENT_ID,
      scope: scope,
      redirect_uri: SPOTIFY_REDIRECT_URI,
      state: state,
      show_dialog:true
    }));
})

app.get('/callback', async function(req, res) {
    const code = req.query.code || null;
    const state = req.query.state || null;
    const storedState = req.cookies ? req.cookies.spotify_auth_state : null;
  
    if (state === null || state !== storedState) {
      res.redirect('/#' +
        querystring.stringify({
          error: 'state_mismatch'
        }));
      return;
    }
    
    // Clear the state cookie
    res.clearCookie('spotify_auth_state');
    
    try {
      // Exchange code for access token
      const response = await axios({
        method: 'post',
        url: 'https://accounts.spotify.com/api/token',
        data: querystring.stringify({
          code: code,
          redirect_uri: SPOTIFY_REDIRECT_URI,
          grant_type: 'authorization_code'
        }),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET).toString('base64')
        }
      });
      
      if (response.status === 200) {
        const { access_token, refresh_token } = response.data;
        
        res.redirect('/#' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token
          }));
      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    } catch (error) {
      console.error(error.response?.data|| error.message);
      res.redirect('/#' +
        querystring.stringify({
          error: 'invalid_token'
        }));
    }
});

app.listen(PORT,()=>{
    console.log(`Listening in PORT${PORT}`);
});