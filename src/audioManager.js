export class AudioManager {
    constructor() {
        this.playlist = [];
        this.currentTrackIndex = 0;
        this.backgroundMusic = null;
        this.volume = 0.5; // Default volume (0.0 to 1.0)
        this.isPlaying = false;
        this.isPaused = false;
        this.shuffle = false;
    }
    
    init(musicPaths) {
        // Accept array of music paths or single path for backward compatibility
        if (Array.isArray(musicPaths)) {
            this.playlist = musicPaths;
        } else {
            this.playlist = [musicPaths];
        }
        
        // Load first track
        this.loadTrack(0);
    }
    
    loadTrack(index) {
        if (index < 0 || index >= this.playlist.length) {
            console.warn('Invalid track index:', index);
            return;
        }
        
        // Stop current track if playing
        if (this.backgroundMusic) {
            this.backgroundMusic.pause();
            this.backgroundMusic = null;
        }
        
        this.currentTrackIndex = index;
        const musicPath = this.playlist[index];
        
        // Create audio element for background music
        this.backgroundMusic = new Audio(musicPath);
        this.backgroundMusic.loop = false; // Don't loop individual tracks, we'll handle playlist looping
        this.backgroundMusic.volume = this.volume;
        
        // Handle track end - move to next track
        this.backgroundMusic.addEventListener('ended', () => {
            this.nextTrack();
        });
        
        // Handle audio loading errors
        this.backgroundMusic.addEventListener('error', (e) => {
            console.warn('Failed to load background music:', musicPath);
            // Try next track if available
            if (this.playlist.length > 1) {
                this.nextTrack();
            }
        });
        
        // Preload audio (some browsers require user interaction first)
        this.backgroundMusic.preload = 'auto';
    }
    
    nextTrack() {
        if (this.playlist.length <= 1) return;
        
        let nextIndex;
        if (this.shuffle) {
            // Random track, but not the same one
            do {
                nextIndex = Math.floor(Math.random() * this.playlist.length);
            } while (nextIndex === this.currentTrackIndex && this.playlist.length > 1);
        } else {
            // Sequential
            nextIndex = (this.currentTrackIndex + 1) % this.playlist.length;
        }
        
        const wasPlaying = this.isPlaying && !this.isPaused;
        this.loadTrack(nextIndex);
        
        // Resume playing if it was playing before
        if (wasPlaying) {
            this.play();
        }
    }
    
    previousTrack() {
        if (this.playlist.length <= 1) return;
        
        let prevIndex;
        if (this.shuffle) {
            // Random track, but not the same one
            do {
                prevIndex = Math.floor(Math.random() * this.playlist.length);
            } while (prevIndex === this.currentTrackIndex && this.playlist.length > 1);
        } else {
            // Sequential
            prevIndex = (this.currentTrackIndex - 1 + this.playlist.length) % this.playlist.length;
        }
        
        const wasPlaying = this.isPlaying && !this.isPaused;
        this.loadTrack(prevIndex);
        
        // Resume playing if it was playing before
        if (wasPlaying) {
            this.play();
        }
    }
    
    getCurrentTrackName() {
        if (this.playlist.length === 0) return 'No Track';
        const path = this.playlist[this.currentTrackIndex];
        // Extract filename without extension
        const filename = path.split('/').pop().replace(/\.[^/.]+$/, '');
        // Map filenames to proper track names
        const trackNames = {
            'music': 'RetroFuture Clean',
            'music2': 'Voltaic',
            'music3': 'Electro Cabello',
            'music4': 'Interloper'
        };
        return trackNames[filename] || filename.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    getTrackCount() {
        return this.playlist.length;
    }
    
    getCurrentTrackIndex() {
        return this.currentTrackIndex;
    }
    
    setShuffle(enabled) {
        this.shuffle = enabled;
    }
    
    play() {
        if (!this.backgroundMusic) return;
        
        // Try to play - may fail due to browser autoplay restrictions
        const playPromise = this.backgroundMusic.play();
        
        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    this.isPlaying = true;
                    this.isPaused = false;
                })
                .catch(error => {
                    // Autoplay was prevented - user interaction required
                    console.log('Autoplay prevented. Music will start after user interaction.');
                    this.isPlaying = false;
                });
        }
    }
    
    pause() {
        if (!this.backgroundMusic) return;
        
        if (this.isPlaying && !this.isPaused) {
            this.backgroundMusic.pause();
            this.isPaused = true;
        }
    }
    
    resume() {
        if (!this.backgroundMusic) return;
        
        if (this.isPaused) {
            const playPromise = this.backgroundMusic.play();
            
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        this.isPaused = false;
                    })
                    .catch(error => {
                        console.warn('Failed to resume music:', error);
                    });
            }
        }
    }
    
    stop() {
        if (!this.backgroundMusic) return;
        
        this.backgroundMusic.pause();
        this.backgroundMusic.currentTime = 0;
        this.isPlaying = false;
        this.isPaused = false;
    }
    
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume)); // Clamp between 0 and 1
        
        if (this.backgroundMusic) {
            this.backgroundMusic.volume = this.volume;
        }
    }
    
    getVolume() {
        return this.volume;
    }
}


