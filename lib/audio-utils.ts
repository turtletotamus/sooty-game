// Audio utilities for Pomodoro Timer

// Generate tick sound using Web Audio API
export function createTickSound(audioContext: AudioContext, volume: number = 0.3): () => void {
  return () => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 1000; // High pitch tick
    oscillator.type = "sine";
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    // Normalize loudness scale across background sounds (louder overall)
    gainNode.gain.linearRampToValueAtTime(volume * 0.5, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  };
}

// Generate fire crackling sound
export function createFireSound(audioContext: AudioContext, volume: number = 0.2): () => () => void {
  return () => {
    const bufferSize = audioContext.sampleRate * 0.5;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1);
    }
    
    const source = audioContext.createBufferSource();
    const gainNode = audioContext.createGain();
    
    source.buffer = buffer;
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    const now = audioContext.currentTime;
    const targetGain = volume * 0.5;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(targetGain, now + 0.08);
    
    source.loop = true;
    source.start();
    
    return () => {
      source.stop();
    };
  };
}

// Generate rain sound
export function createRainSound(audioContext: AudioContext, volume: number = 0.2): () => () => void {
  return () => {
    const bufferSize = audioContext.sampleRate * 2;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      // White noise shaped to sound like rain
      data[i] = (Math.random() * 2 - 1) * Math.random();
    }
    
    const source = audioContext.createBufferSource();
    const gainNode = audioContext.createGain();
    
    source.buffer = buffer;
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    const now = audioContext.currentTime;
    const targetGain = volume * 0.5;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(targetGain, now + 0.25);
    
    source.loop = true;
    source.start();
    
    return () => {
      source.stop();
    };
  };
}

// Generate alarm sound (multiple options)
export function createAlarmSound(
  audioContext: AudioContext, 
  type: "bell" | "chime" | "beep" | "gentle",
  volume: number = 0.5
): () => void {
  return () => {
    const oscillator1 = audioContext.createOscillator();
    const oscillator2 = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    switch (type) {
      case "bell":
        oscillator1.frequency.value = 800;
        oscillator2.frequency.value = 1000;
        oscillator1.type = "sine";
        oscillator2.type = "sine";
        break;
      case "chime":
        oscillator1.frequency.value = 523.25; // C5
        oscillator2.frequency.value = 659.25; // E5
        oscillator1.type = "sine";
        oscillator2.type = "sine";
        break;
      case "beep":
        oscillator1.frequency.value = 1000;
        oscillator2.frequency.value = 0;
        oscillator1.type = "square";
        break;
      case "gentle":
        oscillator1.frequency.value = 440;
        oscillator2.frequency.value = 0;
        oscillator1.type = "sine";
        break;
    }
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
    
    oscillator1.start(audioContext.currentTime);
    oscillator1.stop(audioContext.currentTime + 1);
    
    if (oscillator2.frequency.value > 0) {
      oscillator2.start(audioContext.currentTime);
      oscillator2.stop(audioContext.currentTime + 1);
    }
  };
}

// Background sound manager with support for custom audio files
interface SoundControl {
  stop: () => void;
  setVolume?: (volume: number) => void;
}

export class BackgroundSoundManager {
  private audioContext: AudioContext;
  private currentSound: SoundControl | null = null;
  private currentType: "tick" | "fire" | "rain" | null = null;
  private volume: number = 0.3;
  private isEnabled: boolean = true;
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  
  // Custom audio file paths
  private customTickSound: string | null = null;
  private customFireSound: string | null = null;
  private customRainSound: string | null = null;

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
  }

  setCustomSound(type: "tick" | "fire" | "rain", filePath: string | null) {
    if (type === "tick") {
      this.customTickSound = filePath;
    } else if (type === "fire") {
      this.customFireSound = filePath;
    } else if (type === "rain") {
      this.customRainSound = filePath;
    }
  }

  start(type: "tick" | "fire" | "rain", volume: number = 0.3) {
    if (!this.audioContext || !this.isEnabled) return;
    
    this.stop();
    this.currentType = type;
    this.volume = volume;

    if (type === "tick") {
      const customFile = this.customTickSound;
      
      if (customFile) {
        // Use custom audio file
        const audio = new Audio(customFile);
        audio.volume = Math.max(0.01, Math.min(1, volume));
        audio.loop = false;
        
        if (this.tickInterval) {
          clearInterval(this.tickInterval);
        }
        
        const playTick = () => {
          if (this.currentType !== "tick" || !this.isEnabled) return;
          audio.currentTime = 0;
          audio.play().catch((error) => {
            console.warn("Failed to play tick sound:", error);
          });
        };
        
        // Delay first tick slightly to avoid burst when AudioContext resumes on first click
        const firstTickDelay = 120;
        const tickIntervalMs = 1000;
        const startTimeout = setTimeout(() => {
          if (this.currentType !== "tick" || !this.isEnabled) return;
          playTick();
          this.tickInterval = setInterval(() => {
            if (this.currentType === "tick" && this.isEnabled) {
              playTick();
            } else {
              if (this.tickInterval) {
                clearInterval(this.tickInterval);
                this.tickInterval = null;
              }
            }
          }, tickIntervalMs);
        }, firstTickDelay);
        
        this.currentSound = {
          stop: () => {
            clearTimeout(startTimeout);
            audio.pause();
            audio.currentTime = 0;
            if (this.tickInterval) {
              clearInterval(this.tickInterval);
              this.tickInterval = null;
            }
          }
        };
      } else {
        // Use generated sound (delay first tick to avoid burst on first click)
        const playTick = createTickSound(this.audioContext, volume);
        if (this.tickInterval) {
          clearInterval(this.tickInterval);
        }
        const firstTickDelay = 120;
        setTimeout(() => {
          if (this.currentType !== "tick" || !this.isEnabled) return;
          playTick();
        }, firstTickDelay);
        this.tickInterval = setInterval(() => {
          if (this.currentType === "tick" && this.isEnabled) {
            playTick();
          } else {
            if (this.tickInterval) {
              clearInterval(this.tickInterval);
              this.tickInterval = null;
            }
          }
        }, 1000);
        
        this.currentSound = {
          stop: () => {
            if (this.tickInterval) {
              clearInterval(this.tickInterval);
              this.tickInterval = null;
            }
          }
        };
      }
    } else if (type === "fire") {
      const customFile = this.customFireSound;
      
      if (customFile) {
        const audio = new Audio(customFile);
        audio.volume = Math.max(0.01, Math.min(1, volume));
        audio.loop = true;
        const startTimeout = setTimeout(() => {
          audio.play().catch((error) => {
            console.warn("Failed to play fire sound, using fallback:", error);
            const createSound = createFireSound(this.audioContext, volume);
            const stopFn = createSound();
            this.currentSound = { stop: stopFn };
          });
        }, 80);
        this.currentSound = {
          stop: () => {
            clearTimeout(startTimeout);
            audio.pause();
            audio.currentTime = 0;
          },
          setVolume: (newVol: number) => {
            const clampedVol = Math.max(0.01, Math.min(1, newVol));
            audio.volume = clampedVol;
          }
        };
      } else {
        const createSound = createFireSound(this.audioContext, volume);
        const stopFn = createSound();
        this.currentSound = { stop: stopFn };
      }
    } else if (type === "rain") {
      const customFile = this.customRainSound;
      
      if (customFile) {
        const audio = new Audio(customFile);
        const targetVol = Math.max(0.01, Math.min(1, volume));
        audio.volume = 0.12;
        audio.loop = true;
        const startTimeout = setTimeout(() => {
          audio.play().catch((error) => {
            console.warn("Failed to play rain sound, using fallback:", error);
            const createSound = createRainSound(this.audioContext, volume);
            const stopFn = createSound();
            this.currentSound = { stop: stopFn };
          });
        }, 80);
        const rampTimeout = setTimeout(() => {
          audio.volume = targetVol;
        }, 220);
        this.currentSound = {
          stop: () => {
            clearTimeout(startTimeout);
            clearTimeout(rampTimeout);
            audio.pause();
            audio.currentTime = 0;
          },
          setVolume: (newVol: number) => {
            const clampedVol = Math.max(0.01, Math.min(1, newVol));
            audio.volume = clampedVol;
          }
        };
      } else {
        const createSound = createRainSound(this.audioContext, volume);
        const stopFn = createSound();
        this.currentSound = { stop: stopFn };
      }
    }
  }

  stop() {
    if (this.currentSound) {
      this.currentSound.stop();
      this.currentSound = null;
    }
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    this.currentType = null;
  }

  setVolume(volume: number) {
    this.volume = volume;
    if (this.currentType && this.isEnabled) {
      // For HTML Audio elements (custom files), update volume directly without restarting
      if (this.currentSound && (this.currentSound as any).setVolume) {
        (this.currentSound as any).setVolume(volume);
      } else {
        // For Web Audio API sounds, restart with new volume
        this.start(this.currentType, volume);
      }
    }
  }

  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (!enabled) {
      this.stop();
    } else if (this.currentType) {
      this.start(this.currentType, this.volume);
    }
  }
}
