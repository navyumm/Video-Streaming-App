import './App.css';
import VideoPlayer from './VideoPlayer';
import { useEffect, useState, useRef, useCallback } from 'react';
import videojs from 'video.js';

function App() {
  const [videoLinks, setVideoLinks] = useState([]);
  const [expandedIndex, setExpandedIndex] = useState(null);
  const playersRef = useRef([]);

  useEffect(() => {
    // Fetch the video URLs from the backend
    fetch('http://localhost:8000/uploaded-videos')
      .then(response => response.json())
      .then(data => setVideoLinks(data.videoUrls))
      .catch(error => console.error('Error fetching video URLs:', error));
  }, []);

  const handlePlayerReady = (player, index) => {
    playersRef.current[index] = player;

    player.on('play', () => {
      playersRef.current.forEach((p, i) => {
        if (i !== index && p && !p.paused()) {
          p.pause();
        }
      });
    });

    player.on('waiting', () => {
      videojs.log('player is waiting');
    });

    player.on('dispose', () => {
      videojs.log('player will dispose');
    });
  };

  const handleClick = useCallback((index) => {
    // If the clicked video is already expanded, collapse it and pause it
    if (expandedIndex === index) {
      setExpandedIndex(null);
      if (playersRef.current[index]) {
        playersRef.current[index].pause();
      }
    } else {
      // Collapse the previously expanded video
      if (expandedIndex !== null && playersRef.current[expandedIndex]) {
        playersRef.current[expandedIndex].pause();
      }

      // Set the new expanded video
      setExpandedIndex(index);

      // Play the newly expanded video after state update
      setTimeout(() => {
        if (playersRef.current[index]) {
          playersRef.current[index].play();
        }
      }, 200); // Adjust delay if needed
    }
  }, [expandedIndex]);

return (
  <>
    <div>
      <h1>Video player</h1>
    </div>
    <div className="video-grid">
      {videoLinks.map((videoLink, index) => (
        <div
          key={index}
          className={`video-container ${expandedIndex === index ? 'expanded' : ''}`}
          onClick={() => handleClick(index)}
          tabIndex={0}
        >
          <VideoPlayer
            className="video-player"
            options={{
              controls: true,
              responsive: true,
              fluid: true,
              autoplay: false,
              sources: [
                {
                  src: videoLink,
                  type: 'application/x-mpegURL'
                }
              ]
            }}
            onReady={(player) => handlePlayerReady(player, index)}
          />
        </div>
      ))}
    </div>
  </>
);
}

export default App;
