let playerSpotify = null;
let currentTrackUri = null;
const trackButtons = {};

function getAccessTokenFromURL(){
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    return {
        accessToken: params.get('access_token'),
        refreshToken: params.get('refresh_token')
    };
}

const {accessToken, refreshToken} = getAccessTokenFromURL();

    if (accessToken){
        //store the data somewhere locally
        localStorage.setItem("spotify_access_token",accessToken);
        console.log("Access token loaded!");
        loadDashboard(accessToken);
    }
    else{
        console.warn("No access token found.");
    }

    //fetch user profile info
    fetch("https://api.spotify.com/v1/me",{
        headers: {
            Authorization : `Bearer ${accessToken}`,
        },
    })
    .then ((res) =>res.json())
    .then ((data) =>{
        console.log("User Profile:",data);
        displayUserProfile(data); //using a helper
    })
    .catch((err) =>{
        console.error("Error fetching Spotify profile:",err);
    }); 

window.onSpotifyWebPlaybackSDKReady = () =>{
    if(!Spotify || !Spotify.Player){
        console.error("Spotify SDK not available.");
        return;
    }

    const token = localStorage.getItem("spotify_access_token");
    playerSpotify = new Spotify.Player({
        name: 'My Web Player',
        getOAuthToken : cb => {cb(token);},
        volume:0.1
    });

    //error handling
    playerSpotify.addListener('initialization_error',({message})=> console.error(message));
    playerSpotify.addListener('authentication_error',({message})=>console.error(message));
    playerSpotify.addListener('account_error',({message})=>console.error(message));
    playerSpotify.addListener('playback_error',({message})=>console.error(message));
    
    //playback status update
    playerSpotify.addListener('player_state_changed',state =>{
        if(!state)return;

        const currentUri = state.track_window.current_track.uri;
        const isPaused=state.paused;

        currentTrackUri=currentUri;

        Object.values(trackButtons).forEach(btn => {
            btn.textContent="▶️";
        });

        if(!isPaused && trackButtons[currentUri]){
            trackButtons[currentUri].textContent="⏸️";
        }
    });

    //ready
    playerSpotify.addListener('ready',({device_id})=>{
        console.log('Player ready, ID: ',device_id);
        localStorage.setItem('spotify_device_id',device_id);
        
        const token = localStorage.getItem("spotify_access_token");

        //transfer playback to sdk device
        fetch ('https://api.spotify.com/v1/me/player',{
            method:'PUT',
            body:JSON.stringify({device_ids:[device_id],play:false}),
            headers:{
                'Content-Type':'application/json',
                'Authorization':`Bearer ${token}` 
            }
        }).then(res =>{
            if(!res.ok){
                console.error("Failed to transfer playback to Web SDK");
            }
            else{
                console.log("Playback transferred to SDK");
            }
        });

    });

    //connect player
    playerSpotify.connect();
};

//play the track
function playTrack(trackUri){
    const token = localStorage.getItem("spotify_access_token");
    const deviceID=localStorage.getItem("spotify_device_id");

    if(!token || !deviceID){
        console.error("Missing token or device ID!");
        return;
    }
    fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceID}`,
        {
        method:'PUT',
        body : JSON.stringify({uris: [trackUri]}),
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
        }).then(res=>{
            if(!res.ok){
                res.text().then(text => console.error('Failed to play track: ', text));
            }else{
                console.log("Track is playing!");
            }
        });
        fetch('https://api.spotify.com/v1/me/player/devices', {
            headers: {
              Authorization: `Bearer ${token}`
            }
          })
          .then(res => res.json())
          .then(data => console.log("Devices:", data));
}

//function to display data
function displayUserProfile(user){
    const main = document.querySelector("main");

    const profileHTML=`
     <section>
      <h2>Welcome, ${user.display_name}</h2>
      <img src="${user.images?.[0]?.url || ""}" alt="Profile Image" width="150"/>
      <p>Email: ${user.email}</p>
      <p>Country: ${user.country}</p>
    </section>
  `
  main.insertAdjacentHTML("beforeend",profileHTML);
}
//fetch and display top tracks
function loadDashboard(token){
    fetch("https://api.spotify.com/v1/me/top/tracks?limit=10",{
        headers: {
            Authorization : `Bearer ${token}`,
        },
    })
    .then((res)=>{
        if(!res.ok) throw new Error("Failed to fetch top tracks");
        return res.json();
    })
    .then ((data)=>{
        displayTopTracks(data.items);
    })
    .catch((err)=>{
        console.error("Error fetching top tracks:",err);
    });
}
//render top tracks
function displayTopTracks(tracks){
    const main = document.querySelector("main");

    const section = document.createElement("section");
    section.classList.add("dashboard");

    const title = document.createElement("h2");
    title.textContent = "🎵 Your Top 10 Tracks";
    section.appendChild(title);

    const list = document.createElement("div");
    list.classList.add("track-list");
    tracks.forEach((track)=>{
        const trackDiv = document.createElement("div");
        trackDiv.classList.add("track");

        //Album image
        const albumImg=document.createElement("img");
        albumImg.src=track.album.images[1]?.url || track.album.images[0]?.url;
        albumImg.alt="Album Image";
        albumImg.width=120;
        trackDiv.appendChild(albumImg);

        //track info
        const info = document.createElement("div");
        info.innerHTML= `<p><strong>${track.name}</strong> by ${track.artists.map(a => a.name).join(", ")}</p>
        `
        trackDiv.appendChild(info);

        //button for track
        const button = document.createElement("button");
        button.textContent="▶️";
        button.addEventListener("click", () => {
            if (!playerSpotify) return;
          
            playerSpotify.getCurrentState().then(state => {
                const isSameTrack = currentTrackUri===track.uri;
                const isPaused= state?.paused ??true;
              
                if (!state || !state.track_window?.current_track?.uri ) {
                    //play new track
                    playTrack(track.uri);
                    currentTrackUri=track.uri;
                    return;
                }
                const currentUri = state.track_window.current_track.uri;

                if(isSameTrack){
                    if(isPaused){
                        playerSpotify.resume().then(()=>{
                            console.log("Resume playback");
                        });
                    }
                    else{
                        playerSpotify.pause().then(()=>{
                            console.log("Paused playback");
                        });
                    }
                }
                else{
                    //new track, start playback
                    playTrack(track.uri);
                    currentTrackUri=track.uri;
                }
            });
          });
        trackButtons[track.uri]=button;
        const restartBtn = document.createElement("button");
        restartBtn.textContent="🔄️"

        restartBtn.addEventListener("click",()=>{
            if(!playerSpotify){
                console.error("Player not initialized");
                return;
            }

            playerSpotify.getCurrentState().then(state =>{
                if(!state){
                    console.warn("no active state, playing track");
                    playTrack(track.uri);
                    currentTrackUri=track.uri;
                    return;
                }
                const currentUri=state.track_window.current_track.uri;

                if(currentUri===track.uri){
                    playerSpotify.seek(0).then(()=>{
                        console.log("Restarting track:", track.name);
                    });
                }else{
                    //diff track
                    playTrack(track.uri);
                    currentTrackUri=track.uri;
                }
            });
        });
        trackDiv.appendChild(button);
        trackDiv.appendChild(restartBtn);
        list.appendChild(trackDiv);
    });

    section.appendChild(list);
    main.appendChild(section);
}