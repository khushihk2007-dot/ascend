import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Cpu, Volume2, VolumeX, EyeOff, RotateCcw, Sparkles, AlertTriangle, X } from 'lucide-react';
import cursedHamoodUrl from './assets/images/cursed_hamood_1780926559179.png';
import hamoodAudioUrl from './assets/hamood_8sec.mp3';
import hamoodVideoUrl from './assets/HamoodHabibi_GreenScreen.mp4';

// ==========================================
// PROCEDURAL HAMOOD INFECTION SYNTHESIZER
// ==========================================
class HamoodSynthEngine {
  constructor() {
    this.ctx = null;
    this.isActive = false;
    this.isPlaying = false;
    this.timer = null;
    this.themeTimer = null; // Autoplay Hamood melody sequencer
    this.outGain = null;
    this.delayNode = null;
    this.filterNode = null;
    this.brownNoise = null;
    this.shaperNode = null; // Deep Fried Distortion
    this._corruptionLevel = 0; // Scales up from 0 to 15+
    this.extraLayers = []; // Continuous overlapping sub-beeps or loops
    this.pannerNode = null;
    this.screamtimer = null;
    this.isMuteLyingMode = false;

    // MP3 Audio elements
    this.audio = null;
    this.audioSource = null;
    this.analyser = null;
    this.dataArray = null;
    this.bassBoostNode = null;
  }

  get corruptionLevel() {
    return this._corruptionLevel || 0;
  }

  set corruptionLevel(val) {
    this._corruptionLevel = val;
    this.updateVolumeForCorruption();
    if (this.filterNode && this.ctx) {
      // Open up filter as corruption increases to make it raw, bright, and harsh
      const freq = 600 + (val * 150);
      this.filterNode.frequency.setValueAtTime(Math.min(3000, freq), this.ctx.currentTime);
    }
  }

  updateVolumeForCorruption() {
    if (!this.ctx) return;
    const baseVol = 0.06 + (this.corruptionLevel * 0.06);
    const maxVol = this.isMuteLyingMode ? 0.98 : 0.85;
    const targetVolume = Math.min(maxVol, baseVol);
    this.setVolume(targetVolume);
  }

  setBassBoost(enabled) {
    if (!this.bassBoostNode || !this.ctx) return;
    if (enabled) {
      // Massive bass boost: low shelf filter at 100Hz boosted by 25dB
      this.bassBoostNode.gain.setValueAtTime(25, this.ctx.currentTime);
    } else {
      this.bassBoostNode.gain.setValueAtTime(0, this.ctx.currentTime);
    }
  }

  startTakeoverAudio() {
    if (!this.isActive) {
      this.init();
    }
    if (this.audio && this.audio.paused) {
      this.audio.play().catch(e => console.log("Audio play failed:", e));
    }
  }

  stopTakeoverAudio() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
  }

  getAudioIntensity() {
    if (!this.analyser || !this.dataArray) return 0;
    this.analyser.getByteFrequencyData(this.dataArray);
    let maxVal = 0;
    // Look at low-to-mid frequencies for beat/kick tracking
    const endBin = Math.floor(this.dataArray.length * 0.4);
    for (let i = 0; i < endBin; i++) {
      if (this.dataArray[i] > maxVal) {
        maxVal = this.dataArray[i];
      }
    }
    return maxVal / 255; // Normalize to 0-1
  }

  init() {
    if (this.isActive) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    try {
      this.ctx = new AudioContextClass();
      this.isActive = true;

      // Bass Boost filter (lowshelf)
      this.bassBoostNode = this.ctx.createBiquadFilter();
      this.bassBoostNode.type = 'lowshelf';
      this.bassBoostNode.frequency.setValueAtTime(120, this.ctx.currentTime);
      this.bassBoostNode.gain.setValueAtTime(0, this.ctx.currentTime); // Normal initially

      // Filter settings for a deep, cinematic warm profile
      this.filterNode = this.ctx.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.setValueAtTime(600, this.ctx.currentTime);
      this.filterNode.Q.setValueAtTime(1.2, this.ctx.currentTime);

      // Stereo Panning for chaotic motion
      this.pannerNode = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
      if (this.pannerNode) {
        this.pannerNode.pan.setValueAtTime(0, this.ctx.currentTime);
      }

      // Deepfried distortion wave shaper
      this.shaperNode = this.ctx.createWaveShaper();
      this.shaperNode.curve = this.makeDistortionCurve(180); // Upgraded distortion clip factor
      this.shaperNode.oversample = '4x';

      // Warm Stereo Echo Line
      this.delayNode = this.ctx.createDelay(3.0);
      this.delayGain = this.ctx.createGain();
      this.delayNode.delayTime.setValueAtTime(0.35, this.ctx.currentTime); // Cursed decay trail
      this.delayGain.gain.setValueAtTime(0.65, this.ctx.currentTime);

      // Feedback routing
      this.delayNode.connect(this.delayGain);
      this.delayGain.connect(this.delayNode);

      // Global Master Volume
      this.outGain = this.ctx.createGain();
      this.outGain.gain.setValueAtTime(0.06, this.ctx.currentTime);

      // Route channels standard:
      this.filterNode.connect(this.bassBoostNode);
      this.bassBoostNode.connect(this.outGain);
      this.filterNode.connect(this.delayNode);
      this.delayGain.connect(this.outGain);

      if (this.pannerNode) {
        this.outGain.connect(this.pannerNode);
        this.pannerNode.connect(this.ctx.destination);
      } else {
        this.outGain.connect(this.ctx.destination);
      }

      // Initialize MP3 Audio element
      this.audio = new Audio(hamoodAudioUrl);
      this.audio.loop = true;
      this.audio.crossOrigin = "anonymous";

      // Create media element source
      this.audioSource = this.ctx.createMediaElementSource(this.audio);

      // Create AnalyserNode
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 128;
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

      // Connect MP3 to analyser -> outGain
      this.audioSource.connect(this.analyser);
      this.analyser.connect(this.outGain);

      // Warm background hiss
      this.startWarmHiss();

      this.isPlaying = true;
      this.scheduleNextNote();
      
      // Start background artifacts
      this.screamtimer = setInterval(() => this.playRandomChaoticArtifacts(), 2500);

      // Start the iconic Hamood Habibi Theme Loop dynamically
      this.themeTimer = setInterval(() => {
        if (this.corruptionLevel > 0) {
          this.playHamoodHabibiThemeLoop();
        }
      }, 3400); // Rerun loop every 3.4 seconds representing a standard rhythm speed
    } catch (e) {
      console.warn("Audio Context failed to boot: ", e);
    }
  }

  makeDistortionCurve(amount) {
    const k = Math.max(30, amount);
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = (3 + k) * x * 65 * deg / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  startWarmHiss() {
    if (!this.ctx) return;
    try {
      const bufferSize = 4 * this.ctx.sampleRate;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0.0;

      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + (0.015 * white)) / 1.015;
        lastOut = output[i];
      }

      this.brownNoise = this.ctx.createBufferSource();
      this.brownNoise.buffer = noiseBuffer;
      this.brownNoise.loop = true;

      const noiseFilter = this.ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(140, this.ctx.currentTime);
      noiseFilter.Q.setValueAtTime(0.4, this.ctx.currentTime);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.003, this.ctx.currentTime);

      this.brownNoise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      this.brownNoise.start(0);
    } catch (e) {
      console.warn("Hiss synth failed: ", e);
    }
  }

  playPianoTone(freq, duration = 4.0, velocity = 0.4) {
    if (!this.ctx || this.ctx.state === 'suspended') return;
    try {
      const now = this.ctx.currentTime;

      // Pure bell
      const osc1 = this.ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, now);

      // Deepfried Square or Sawtooth depending on corruption level
      const osc2 = this.ctx.createOscillator();
      osc2.type = this.corruptionLevel > 5 ? 'square' : 'triangle';
      osc2.frequency.setValueAtTime(freq * 1.0025, now);

      const oscGain = this.ctx.createGain();
      oscGain.gain.setValueAtTime(0, now);
      
      // Boost volume aggressively as corruption increases
      const volumeBoost = 1.0 + (this.corruptionLevel * 0.4);
      oscGain.gain.linearRampToValueAtTime(velocity * 0.45 * volumeBoost, now + 0.05);
      oscGain.gain.exponentialRampToValueAtTime(velocity * 0.20 * volumeBoost, now + 0.5);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc1.connect(oscGain);
      osc2.connect(oscGain);

      if (this.corruptionLevel > 3) {
        const distortGain = this.ctx.createGain();
        distortGain.gain.setValueAtTime(0.18 * (this.corruptionLevel / 3), now);
        
        oscGain.connect(this.shaperNode);
        this.shaperNode.connect(distortGain);
        distortGain.connect(this.filterNode);
      } else {
        oscGain.connect(this.filterNode);
      }

      osc1.start(now);
      osc2.start(now);

      osc1.stop(now + duration + 0.2);
      osc2.stop(now + duration + 0.2);
    } catch (e) {}
  }

  // Plays the complete procedural Hamood Habibi retro-synth theme!
  playHamoodHabibiThemeLoop() {
    if (!this.ctx || !this.isPlaying || this.ctx.state === 'suspended') return;
    try {
      const now = this.ctx.currentTime;
      // High pitched, Middle Eastern slide pattern
      const notes = [
        { freq: 392.00, time: 0.0, dur: 0.21, type: 'sawtooth' }, // G4
        { freq: 466.16, time: 0.22, dur: 0.21, type: 'sawtooth' }, // Bb4
        { freq: 523.25, time: 0.44, dur: 0.40, type: 'square' },   // C5 (main lead call)
        { freq: 466.16, time: 0.88, dur: 0.21, type: 'sawtooth' }, // Bb4
        { freq: 392.00, time: 1.10, dur: 0.21, type: 'sawtooth' }, // G4
        { freq: 415.30, time: 1.32, dur: 0.21, type: 'sawtooth' }, // Ab4
        { freq: 392.00, time: 1.54, dur: 0.21, type: 'sawtooth' }, // G4
        { freq: 349.23, time: 1.76, dur: 0.40, type: 'square' },   // F4
        { freq: 392.00, time: 2.20, dur: 0.55, type: 'sawtooth' }  // G4
      ];

      // Volume scaling up to absolute maximum distortion
      const earrapeBoost = 1.0 + (this.corruptionLevel * 0.95) + (this.isMuteLyingMode ? 4.8 : 0);
      const loopVolume = Math.min(0.96, 0.15 * earrapeBoost);

      const loopGainNode = this.ctx.createGain();
      loopGainNode.gain.setValueAtTime(loopVolume, now);

      // Stereo left/right panning oscillation
      const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
      if (panner) {
        panner.pan.setValueAtTime(Math.sin(now * 3), now);
        panner.pan.linearRampToValueAtTime(-Math.sin(now * 3), now + 2.5);
        loopGainNode.connect(panner);
        panner.connect(this.shaperNode);
      } else {
        loopGainNode.connect(this.shaperNode);
      }
      this.shaperNode.connect(this.filterNode);

      // Play notes with sliding pitches and heavy bass distortion (saw/square mix representing compression)
      notes.forEach((n) => {
        const osc = this.ctx.createOscillator();
        const subOsc = this.ctx.createOscillator(); // Sub bass-boosted layer
        
        osc.type = n.type;
        osc.frequency.setValueAtTime(n.freq, now + n.time);
        
        // Cursed extreme detunes on high intensity
        if (this.corruptionLevel > 6) {
          const detuneAmt = (Math.random() - 0.5) * 0.25 * (this.corruptionLevel / 5);
          osc.frequency.linearRampToValueAtTime(n.freq * (1 + detuneAmt), now + n.time + n.dur);
        }

        subOsc.type = 'sawtooth';
        subOsc.frequency.setValueAtTime(n.freq / 2, now + n.time);

        const oscGain = this.ctx.createGain();
        oscGain.gain.setValueAtTime(0, now + n.time);
        oscGain.gain.linearRampToValueAtTime(0.45, now + n.time + 0.02);
        oscGain.gain.exponentialRampToValueAtTime(0.0001, now + n.time + n.dur);

        osc.connect(oscGain);
        subOsc.connect(oscGain);
        oscGain.connect(loopGainNode);

        osc.start(now + n.time);
        subOsc.start(now + n.time);
        
        osc.stop(now + n.time + n.dur + 0.1);
        subOsc.stop(now + n.time + n.dur + 0.1);
      });

      // Play handclaps/beats!
      const clapTimes = [0.0, 0.44, 0.88, 1.32, 1.76, 2.20, 2.64];
      clapTimes.forEach((t) => {
        const bufferSize = Math.floor(this.ctx.sampleRate * 0.1);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        
        const noiseSource = this.ctx.createBufferSource();
        noiseSource.buffer = buffer;

        const percFilter = this.ctx.createBiquadFilter();
        percFilter.type = 'bandpass';
        percFilter.frequency.setValueAtTime(this.corruptionLevel > 6 ? 600 : 1300, now + t);
        percFilter.Q.setValueAtTime(4.0, now + t);

        const percGain = this.ctx.createGain();
        percGain.gain.setValueAtTime(0, now + t);
        percGain.gain.linearRampToValueAtTime(0.3 * earrapeBoost, now + t + 0.01);
        percGain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.1);

        noiseSource.connect(percFilter);
        percFilter.connect(percGain);
        percGain.connect(this.filterNode);

        noiseSource.start(now + t);
        noiseSource.stop(now + t + 0.12);
      });

    } catch (e) {
      console.warn("Melody sequencer failed:", e);
    }
  }

  triggerDeepSubDrone() {
    if (!this.ctx || this.ctx.state === 'suspended') return;
    try {
      const now = this.ctx.currentTime;
      let freq = 48.99; // G1 Sub

      if (this.corruptionLevel > 6) {
        freq = 32.70; // C1 cursed earth rattle
      }

      const osc = this.ctx.createOscillator();
      osc.type = this.corruptionLevel > 8 ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      
      const multiplier = this.isMuteLyingMode ? 4.5 : (1.0 + this.corruptionLevel * 0.45);
      gain.gain.linearRampToValueAtTime(0.6 * multiplier, now + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.12 * multiplier, now + 2.5);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 12.0);

      const lowpass = this.ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(this.corruptionLevel > 6 ? 240 : 80, now);

      osc.connect(lowpass);
      lowpass.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 12.5);
    } catch (e) {}
  }

  playHamoodWhisper() {
    if (!this.ctx || this.ctx.state === 'suspended') return;
    try {
      const now = this.ctx.currentTime;
      
      const whisperGain = this.ctx.createGain();
      const whispersMult = this.isMuteLyingMode ? 0.85 : (0.01 + (0.03 * this.corruptionLevel)); 
      whisperGain.gain.setValueAtTime(whispersMult, now); 
      
      if (this.delayNode) {
        whisperGain.connect(this.delayNode);
      }
      if (this.outGain) {
        whisperGain.connect(this.outGain);
      } else {
        whisperGain.connect(this.ctx.destination);
      }
      
      const playNoiseBurst = (time, duration) => {
        const bufferSize = Math.floor(this.ctx.sampleRate * duration);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(this.corruptionLevel > 5 ? 1200 : 2600, now + time);
        
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, now + time);
        gain.gain.linearRampToValueAtTime(0.25, now + time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + time + duration);
        
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(filter);
        filter.connect(gain);
        filter.connect(this.shaperNode); // deep-fry white noise!
        gain.connect(whisperGain);
        source.start(now + time);
      };
      
      const playTone = (time, freqStart, freqEnd, duration, type = 'sine') => {
        const osc = this.ctx.createOscillator();
        osc.type = type;
        osc.frequency.setValueAtTime(freqStart, now + time);
        osc.frequency.exponentialRampToValueAtTime(freqEnd, now + time + duration);
        
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, now + time);
        gain.gain.linearRampToValueAtTime(0.35, now + time + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + time + duration);
        
        osc.connect(gain);
        gain.connect(whisperGain);
        osc.start(now + time);
      };

      const tStyle = this.corruptionLevel > 4 ? 'sawtooth' : 'sine';
      playNoiseBurst(0.0, 0.18);
      playTone(0.18, 115, 80, 0.45, tStyle);
      
      playNoiseBurst(0.7, 0.18);
      playTone(0.88, 120, 75, 0.45, tStyle);
      
      playNoiseBurst(1.4, 0.16);
      playTone(1.56, 170, 140, 0.18, tStyle);
      playTone(1.78, 145, 100, 0.28, tStyle);
      
      if (this.corruptionLevel > 5) {
        playTone(0.2, 55, 30, 1.2, 'square');
        playTone(1.0, 55, 35, 1.2, 'sawtooth');
      }
    } catch(e) {}
  }

  triggerCreepyReverseBleep() {
    if (!this.ctx || this.ctx.state === 'suspended') return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = this.corruptionLevel > 6 ? 'square' : 'sawtooth';
      
      osc.frequency.setValueAtTime(55, now);
      osc.frequency.exponentialRampToValueAtTime(1600 * (1 + this.corruptionLevel * 0.15), now + 0.25);
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(250, now);
      filter.frequency.exponentialRampToValueAtTime(2800, now + 0.25);
      
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      const reverseMult = this.isMuteLyingMode ? 0.75 : (0.01 + (this.corruptionLevel * 0.018));
      gain.gain.linearRampToValueAtTime(reverseMult, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.outGain || this.ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.3);
    } catch(e){}
  }

  triggerScreamAttack() {
    if (!this.ctx || this.ctx.state === 'suspended') return;
    try {
      const now = this.ctx.currentTime;
      // Layer huge feedback frequencies, earrape sirens
      const earrapeBoost = (this.corruptionLevel * 0.3) + 1;
      for (let i = 0; i < 15; i++) { // Increased voices for mass density
        const osc = this.ctx.createOscillator();
        osc.type = i % 2 === 0 ? 'sawtooth' : 'square';
        
        const baseFreq = 60 + (i * 125) + (Math.random() - 0.5) * 80;
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.linearRampToValueAtTime(baseFreq * (0.1 + Math.random() * 3.5), now + 0.2 + Math.random() * 0.7);
        
        const gNode = this.ctx.createGain();
        gNode.gain.setValueAtTime(0, now);
        
        const amp = this.isMuteLyingMode ? 0.98 : Math.min(0.98, 0.65 * earrapeBoost);
        gNode.gain.linearRampToValueAtTime(amp / 12, now + 0.04);
        gNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.5 + Math.random() * 1.5);
        
        osc.connect(gNode);
        if (this.shaperNode) {
          gNode.connect(this.shaperNode);
          this.shaperNode.connect(this.ctx.destination);
        } else {
          gNode.connect(this.ctx.destination);
        }
        
        osc.start(now);
        osc.stop(now + 2.2);
      }
    } catch (e) {}
  }

  playSlowedReverbHamood() {
    if (!this.ctx || this.ctx.state === 'suspended') return;
    try {
      const now = this.ctx.currentTime;
      const slowScale = 0.42; // Even more slowed!
      
      const playTone = (time, freqStart, freqEnd, duration) => {
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freqStart * slowScale, now + time);
        osc.frequency.exponentialRampToValueAtTime(freqEnd * slowScale, now + time + duration);
        
        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(0, now + time);
        gainNode.gain.linearRampToValueAtTime(0.5, now + time + 0.08);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + time + duration);
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(280, now + time);
        
        osc.connect(filter);
        filter.connect(gainNode);
        
        if (this.delayNode) {
          gainNode.connect(this.delayNode);
        }
        gainNode.connect(this.outGain || this.ctx.destination);
        
        osc.start(now + time);
        osc.stop(now + time + duration + 0.2);
      };
      
      playTone(0.0, 115, 80, 1.2);
      playTone(1.3, 120, 75, 1.2);
      playTone(2.6, 170, 140, 0.6);
      playTone(3.1, 145, 100, 0.9);
    } catch (e) {}
  }

  cutAllAudio() {
    try {
      if (this.outGain && this.ctx) {
        this.outGain.gain.setValueAtTime(0, this.ctx.currentTime);
      }
    } catch (e) {}
  }

  restoreAudioAll() {
    try {
      if (this.outGain && this.ctx) {
        const baseVol = this.isMuteLyingMode ? 0.96 : (0.06 + this.corruptionLevel * 0.08);
        this.outGain.gain.setValueAtTime(Math.min(0.96, baseVol), this.ctx.currentTime);
      }
    } catch (e) {}
  }

  playRandomChaoticArtifacts() {
    if (!this.isPlaying || this.corruptionLevel < 2) return;
    try {
      if (this.pannerNode) {
        const panVal = Math.sin(this.ctx.currentTime * 3.5);
        this.pannerNode.pan.setValueAtTime(panVal, this.ctx.currentTime);
      }

      if (Math.random() < 0.45 + (this.corruptionLevel * 0.05)) {
        this.triggerCreepyReverseBleep();
      }

      if (Math.random() < 0.55 && this.corruptionLevel > 3) {
        const detunedScale = [82.41, 110.00, 146.83, 196.00, 220.00, 329.63, 440.00];
        const randomFreq = detunedScale[Math.floor(Math.random() * detunedScale.length)];
        this.playPianoTone(randomFreq * (1 + (Math.random() - 0.5) * 0.12), 3.0, 0.45);
      }

      if (Math.random() < 0.3 + (this.corruptionLevel * 0.04)) {
        this.playHamoodWhisper();
      }
    } catch (e) {}
  }

  scheduleNextNote() {
    if (!this.isPlaying) return;

    const scale = [185.00, 233.08, 246.94, 277.18, 369.99, 415.30, 466.16, 554.37];
    let freq = scale[Math.floor(Math.random() * scale.length)];
    
    if (this.corruptionLevel > 0) {
      const errChance = 0.18 * this.corruptionLevel;
      if (Math.random() < errChance) {
        const detuneAmt = (Math.random() - 0.5) * 0.2 * (this.corruptionLevel / 5);
        freq = freq * (1 + detuneAmt);
      }
      
      if (Math.random() < 0.38 && this.corruptionLevel > 2) {
        this.playPianoTone(48.99 * (1 + (Math.random() - 0.5) * 0.1), 8.5, 0.25);
      }
    }

    const duration = 2.5 + Math.random() * 4.5;
    const velocity = 0.3 + Math.random() * 0.4;
    this.playPianoTone(freq, duration, velocity);

    let nextInterval = 4500 + Math.random() * 4500;
    if (this.corruptionLevel > 3) {
      nextInterval = Math.max(250, (4500 + Math.random() * 4500) - (this.corruptionLevel * 350));
    }
    
    if (this.corruptionLevel > 7 && Math.random() < 0.5) {
      nextInterval = 150 + Math.random() * 600; 
    }

    this.timer = setTimeout(() => this.scheduleNextNote(), nextInterval);
  }

  setVolume(vol) {
    if (this.outGain && this.ctx) {
      this.outGain.gain.setValueAtTime(vol, this.ctx.currentTime);
    }
  }

  mute() {
    this.setVolume(0);
  }

  unmute() {
    this.setVolume(0.06);
  }

  stop() {
    this.isPlaying = false;
    if (this.timer) clearTimeout(this.timer);
    if (this.themeTimer) clearInterval(this.themeTimer);
    if (this.screamtimer) clearInterval(this.screamtimer);
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
    try {
      if (this.brownNoise) {
        this.brownNoise.stop();
      }
      if (this.ctx) {
        this.ctx.close();
      }
    } catch (e) {}
    this.ctx = null;
    this.isActive = false;
  }
}

const globalSynth = new HamoodSynthEngine();

// ==========================================
// FULLSCREEN HAMOOD VIDEO TAKEOVER
// ==========================================
function HamoodVideoTakeover({ isActive, onComplete }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [takeoverTime, setTakeoverTime] = useState(0);
  const [glitchText, setGlitchText] = useState("HAMOOD IS FOREVER");
  const [intensity, setIntensity] = useState(0);

  // Sync intensity with globalSynth at 60fps
  useEffect(() => {
    if (!isActive) return;
    let animId;
    const updateIntensity = () => {
      setIntensity(globalSynth.getAudioIntensity());
      animId = requestAnimationFrame(updateIntensity);
    };
    animId = requestAnimationFrame(updateIntensity);
    return () => cancelAnimationFrame(animId);
  }, [isActive]);
  
  // Start video when active
  useEffect(() => {
    if (isActive && videoRef.current) {
      videoRef.current.play().catch(err => console.log("Video play failed:", err));
      
      const start = Date.now();
      const interval = setInterval(() => {
        const elapsed = (Date.now() - start) / 1000;
        setTakeoverTime(elapsed);
        
        // Text distortion logic
        if (elapsed > 8) {
          const chars = "HAMOODISFOREVER!@#$%^&*()_+{}|:<>?";
          let scrambled = "";
          for (let i = 0; i < "HAMOOD IS FOREVER".length; i++) {
            scrambled += chars[Math.floor(Math.random() * chars.length)];
          }
          setGlitchText(scrambled);
        } else if (elapsed > 5) {
          setGlitchText(Math.random() < 0.35 ? "H@M00D 1S F0R3V3R" : "HAMOOD IS FOREVER");
        } else {
          setGlitchText("HAMOOD IS FOREVER");
        }

        if (elapsed >= 11) {
          clearInterval(interval);
          onComplete(); // Trigger reboot sequence
        }
      }, 100);

      return () => clearInterval(interval);
    } else if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [isActive]);

  // Canvas chroma key frame loop
  useEffect(() => {
    if (!isActive) return;
    let animId;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    
    // Low-res offscreen canvas for fast chroma key and deepfried compression
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = 160;  // Ultra compressed for raw meme look
    tempCanvas.height = 120;

    const processFrame = () => {
      if (video.paused || video.ended) {
        animId = requestAnimationFrame(processFrame);
        return;
      }

      try {
        // 1. Draw to small offscreen canvas
        tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
        const frame = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const l = frame.data.length;

        // 2. Perform chroma key filtering on green screen pixels
        for (let i = 0; i < l; i += 4) {
          const r = frame.data[i];
          const g = frame.data[i + 1];
          const b = frame.data[i + 2];
          
          // Key out green background: check if green is dominant
          if (g > 85 && g > r * 1.15 && g > b * 1.15) {
            frame.data[i + 3] = 0; // Transparent
          }
        }
        tempCtx.putImageData(frame, 0, 0);

        // 3. Clear main canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 4. Draw processed frame onto main canvas stretched to fullscreen
        ctx.imageSmoothingEnabled = false;
        
        const punch = 1 + (intensity * 0.15);
        const w = canvas.width * punch;
        const h = canvas.height * punch;
        const x = (canvas.width - w) / 2;
        const y = (canvas.height - h) / 2;
        
        ctx.drawImage(tempCanvas, x, y, w, h);
      } catch (err) {
        // Fail-silent
      }

      animId = requestAnimationFrame(processFrame);
    };

    const handlePlay = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      animId = requestAnimationFrame(processFrame);
    };

    video.addEventListener('play', handlePlay);

    // Handle window resize
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // If already playing
    if (!video.paused) {
      handlePlay();
    }

    return () => {
      cancelAnimationFrame(animId);
      video.removeEventListener('play', handlePlay);
      window.removeEventListener('resize', handleResize);
    };
  }, [isActive, intensity]);

  if (!isActive) return null;

  // Visual effects based on intensity
  const scale = 1 + (intensity * 0.4) + (Math.sin(Date.now() / 50) * 0.05);
  const rot = (Math.random() - 0.5) * intensity * 35;
  const tx = (Math.random() - 0.5) * intensity * 50;
  const ty = (Math.random() - 0.5) * intensity * 50;
  
  const blur = intensity > 0.8 ? Math.random() * 8 : 0;
  const brightness = 1.0 + (intensity * 0.5) + (Math.random() - 0.5) * 0.3;
  const contrast = 1.5 + (intensity * 1.0);

  // Strobe background flash: alternate white/red/black on peaks
  let strobeBg = "rgba(0, 0, 0, 0.9)";
  if (intensity > 0.82) {
    strobeBg = Math.random() < 0.5 ? "rgba(220, 38, 38, 0.9)" : "rgba(255, 255, 255, 0.95)";
  }

  // Text replication for duplicating typography
  const textCopies = takeoverTime > 4 ? (takeoverTime > 7 ? 6 : 3) : 1;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: strobeBg,
        zIndex: 999999,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden'
      }}
      className="extreme-vibrate-screen"
    >
      <style>{`
        @keyframes textBounce {
          0% { transform: translateY(0) scale(1); }
          100% { transform: translateY(-15px) scale(1.08); }
        }
      `}</style>

      {/* Hidden Video Source */}
      <video
        ref={videoRef}
        src={hamoodVideoUrl}
        loop
        muted
        playsInline
        style={{ display: 'none' }}
      />

      {/* Main Fullscreen Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          width: '100vw',
          height: '100vh',
          transform: `scale(${scale}) rotate(${rot}deg) translate(${tx}px, ${ty}px)`,
          filter: `brightness(${brightness}) contrast(${contrast}) blur(${blur}px) drop-shadow(6px 0px 0px rgba(255,0,0,0.8)) drop-shadow(-6px 0px 0px rgba(0,255,255,0.8))`,
          mixBlendMode: 'normal'
        }}
      />

      {/* Fullscreen Glitch Overlay */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(rgba(18,16,16,0) 50%, rgba(0,0,0,0.4) 50%), linear-gradient(90deg, rgba(255,0,0,0.15), rgba(0,255,0,0.05), rgba(0,0,255,0.15))',
          backgroundSize: '100% 4px, 6px 100%',
          pointerEvents: 'none'
        }}
      />

      {/* Typography Overlay */}
      {takeoverTime < 10 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            transform: `scale(${1 + intensity * 0.2})`
          }}
        >
          {Array.from({ length: textCopies }).map((_, idx) => {
            const tOffset = (idx - (textCopies - 1) / 2) * (15 + intensity * 40);
            return (
              <h1
                key={idx}
                style={{
                  position: idx > 0 ? 'absolute' : 'relative',
                  transform: idx > 0 ? `translate(${tOffset}px, ${tOffset}px) rotate(${(Math.random() - 0.5) * 20}deg)` : 'none',
                  color: 'white',
                  fontFamily: 'Impact, sans-serif',
                  fontSize: '9vw',
                  lineHeight: 1,
                  letterSpacing: '0.15em',
                  textAlign: 'center',
                  textShadow: `0 0 15px rgba(255, 0, 0, 0.9), 3px 3px 0 #000`,
                  animation: 'textBounce 0.08s infinite alternate',
                  opacity: idx > 0 ? 0.65 : 1
                }}
              >
                {glitchText}
              </h1>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ==========================================
// PRE-ASSEMBLED PORTFOLIO QUOTES
// ==========================================
const CALMING_QUOTES = [
  "Discipline creates freedom.",
  "Small progress is still progress.",
  "Your future is built today.",
  "Become someone your younger self would admire.",
  "Consistency beats motivation.",
  "The obstacle is the path of expansion.",
  "Quiet focus is louder than loud praise.",
  "The cost of regret exceeds the price of discipline.",
  "Mastery lives in the quiet accumulation of simple acts.",
  "Silence is the soil where focus takes deep root."
];

// Corrupted Motivational Quotes
const CORRUPTED_QUOTES = [
  "Discipline creates Hamood.",
  "Your future belongs to Habibi.",
  "Success is temporary.",
  "Hamood is forever.",
  "The grindset was a lie.",
  "Wake up, Habibi."
];

// Fake AI Tickers
const FAKE_AI_MESSAGES_NORMAL = [
  "Analyzing your mindset...",
  "Generating wisdom...",
  "Optimizing discipline...",
  "Consulting ancient philosophy...",
  "Harmonizing neural focus..."
];

const FAKE_AI_MESSAGES_CORRUPTED = [
  "contacting hamood...",
  "habibi synchronization started...",
  "reality instability detected...",
  "decrypting sacred sounds...",
  "hamood resides within..."
];

export default function App() {
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [initialized, setInitialized] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  // Phase 2 & 3 Corruption States
  const [isDoNotClickActive, setIsDoNotClickActive] = useState(false);
  const [corruptionLevel, setCorruptionLevel] = useState(0);
  const [isGlitched, setIsGlitched] = useState(false);
  const [glitchText, setGlitchText] = useState(null);
  const [glitchButtonText, setGlitchButtonText] = useState(null);
  const [fakeAIMessage, setFakeAIMessage] = useState(FAKE_AI_MESSAGES_NORMAL[0]);
  
  // Phase 3 Aggressive Popup State
  const [popups, setPopups] = useState([]);
  const [fakeMutePresses, setFakeMutePresses] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [pushedCursorPos, setPushedCursorPos] = useState({ x: 0, y: 0 }); // Delay trail cursor warfare
  const [bgStretchFactor, setBgStretchFactor] = useState(1);
  const [isCrtEffect, setIsCrtEffect] = useState(false);
  
  const [cursorX, setCursorX] = useState(0);
  const [cursorY, setCursorY] = useState(0);

  // Phase 4 - Total Collapse States
  const [realityStability, setRealityStability] = useState(100);
  const [collapseActive, setCollapseActive] = useState(false);
  const [isSilenceState, setIsSilenceState] = useState(false);
  const [isJumpscare, setIsJumpscare] = useState(false);
  const [bouncingHeads, setBouncingHeads] = useState([]);
  const [activeCursedScreen, setActiveCursedScreen] = useState('none'); // 'none', 'unresponsive', 'antivirus', 'memory', 'blue-screen', 'philosophical', 'reboot'
  const [philosophicalIndex, setPhilosophicalIndex] = useState(0);
  const [philosophicalMessages] = useState([
    "You clicked the button.",
    "This is your fault.",
    "Motivation was temporary.",
    "Hamood is eternal.",
    "There is no escape.",
    "You belong to Habibi now."
  ]);

  // Phase 5: Ultimate Global Takeover States
  const [isTakeoverActive, setIsTakeoverActive] = useState(false);
  const [rainingHamoods, setRainingHamoods] = useState([]);
  const [isRebooting, setIsRebooting] = useState(false);
  const [rebootState, setRebootState] = useState('none'); // 'none', 'silence', 'spinner'
  
  const cardRef = useRef(null);
  const containerRef = useRef(null);
  const lastJumpscareTime = useRef(0);

  // Real-time synchronization loop for audio intensity (screenshakes, glitches, and jumpscares)
  useEffect(() => {
    let animationFrameId;

    const updateSyncEffects = () => {
      if (isDoNotClickActive && globalSynth.analyser && containerRef.current) {
        const intensity = globalSynth.getAudioIntensity();

        // Screen shake: intensity scales translation and rotation offsets
        const maxShake = 2 + (corruptionLevel * 2.2);
        const shakeX = (Math.random() - 0.5) * intensity * maxShake;
        const shakeY = (Math.random() - 0.5) * intensity * maxShake;
        const shakeRot = (Math.random() - 0.5) * intensity * (corruptionLevel * 0.8);

        // Zoom scale pulsing with audio beats
        const scalePulse = 1.0 + (intensity * 0.04) + (corruptionLevel * 0.012);

        // Apply visual transformation directly to the DOM for 60fps performance
        containerRef.current.style.transform = `scale(${scalePulse}) translate(${shakeX}px, ${shakeY}px) rotate(${shakeRot}deg)`;

        // Trigger visual glitch flashes on intense sound peaks
        if (intensity > 0.84 && Math.random() < 0.18) {
          setIsGlitched(true);
          setTimeout(() => setIsGlitched(false), 90);
        }

        // Trigger jumpscares on high peak thresholds
        if (intensity > 0.93 && !isJumpscare && Date.now() - lastJumpscareTime.current > 5000) {
          setIsJumpscare(true);
          lastJumpscareTime.current = Date.now();
          setTimeout(() => {
            setIsJumpscare(false);
          }, 850);
        }
      } else if (containerRef.current) {
        // Reset styles when system clean/inactive
        containerRef.current.style.transform = 'none';
        containerRef.current.style.filter = 'none';
      }

      animationFrameId = requestAnimationFrame(updateSyncEffects);
    };

    animationFrameId = requestAnimationFrame(updateSyncEffects);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isDoNotClickActive, corruptionLevel, isJumpscare]);

  // Reset to original clean website
  const handleResetToOriginalCleanWebsite = () => {
    globalSynth.stop();
    globalSynth.isMuteLyingMode = false;
    globalSynth.corruptionLevel = 0;
    
    setIsDoNotClickActive(false);
    setCorruptionLevel(0);
    setRealityStability(100);
    setCollapseActive(false);
    setIsSilenceState(false);
    setIsJumpscare(false);
    setPopups([]);
    setBouncingHeads([]);
    setRainingHamoods([]);
    setIsTakeoverActive(false);
    setIsRebooting(false);
    setActiveCursedScreen('none');
    setFakeMutePresses(0);
    setIsCrtEffect(false);
    setBgStretchFactor(1);
    setQuoteIndex(0);
    setGlitchText(null);
    setGlitchButtonText(null);
    setInitialized(false);
    setIsPlaying(false);
  };

  // Video takeover completion callback (ending loop)
  const handleVideoTakeoverComplete = () => {
    // 1. Cut everything to black and silence audio
    globalSynth.stop();
    setIsTakeoverActive(false);
    setIsRebooting(true); // Triggers black screen
    setRebootState('silence'); // Start with 1 second of pure silence/black screen

    setTimeout(() => {
      setRebootState('spinner'); // Transition to loading spinner & message
      
      setTimeout(() => {
        setIsRebooting(false);
        setRebootState('none');
        handleResetToOriginalCleanWebsite(); // Restart clean motivational homepage
      }, 1500);
    }, 1000);
  };

  // Helper to trigger bouncing heads
  const triggerSpawnBouncingHead = (count = 1) => {
    const screenW = window.innerWidth || 805;
    const screenH = window.innerHeight || 605;
    const list = [];
    for (let i = 0; i < count; i++) {
      list.push({
        id: Math.random() + '-' + Date.now() + '-bounce-' + i,
        x: Math.max(50, Math.random() * (screenW - 140)),
        y: Math.max(50, Math.random() * (screenH - 140)),
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.5) * 16,
        scale: 0.6 + Math.random() * 2.2, // Gigantic bouncing Hamoods!
        rot: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 20
      });
    }
    setBouncingHeads((prev) => [...prev, ...list]);
  };

  // Helper to trigger raining Hamoods
  const triggerSpawnRainingHamood = (count = 1) => {
    const screenW = window.innerWidth || 805;
    const list = [];
    for (let i = 0; i < count; i++) {
      list.push({
        id: Math.random() + '-' + Date.now() + '-rain-' + i,
        x: Math.random() * (screenW - 120),
        y: -120 - Math.random() * 600, // spawn offsets representing a rain stream
        speed: 5 + Math.random() * 10,
        scale: 0.5 + Math.random() * 1.5,
        rot: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 12
      });
    }
    setRainingHamoods((prev) => [...prev, ...list]);
  };

  // Unified progression handler
  const handleIncreaseCorruption = (amount = 1) => {
    setCorruptionLevel((prev) => {
      const next = prev + amount;
      globalSynth.corruptionLevel = next;

      // 0: 100, 1: 98, 2: 92, 3: 85, 4: 76, 5: 64, 6: 51, 7: 38, 8: 22, 9: 11, 10: 4, >=11: 0
      let stab = 100;
      if (next === 1) stab = 98;
      else if (next === 2) stab = 92;
      else if (next === 3) stab = 85;
      else if (next === 4) stab = 76;
      else if (next === 5) stab = 64;
      else if (next === 6) stab = 51;
      else if (next === 7) stab = 38;
      else if (next === 8) stab = 22;
      else if (next === 9) stab = 11;
      else if (next === 10) stab = 4;
      else if (next >= 11) stab = 0;

      setRealityStability(stab);

      if (stab <= 22 && stab > 0) {
        triggerSpawnBouncingHead(2);
      }

      if (stab === 0) {
        setCollapseActive(true);
        const levelOffset = next - 11;
        const stages = ['unresponsive', 'blue-screen', 'philosophical', 'reboot'];
        const currentStage = stages[Math.min(stages.length - 1, levelOffset)];
        
        if (next >= 15) {
          // Instead of resetting, initiate the TOTAL WORLDWIDE HAMOOD DOMINATION INVASION STAGE
          setIsTakeoverActive(true);
          setCollapseActive(false);
          setActiveCursedScreen('none');
          triggerSpawnBouncingHead(15);
          triggerSpawnRainingHamood(18);
          globalSynth.isMuteLyingMode = true;
          globalSynth.setVolume(0.98); // Max Volume Limit override!
          globalSynth.setBassBoost(true); // Activate deep massive bass boost!
          globalSynth.playHamoodHabibiThemeLoop();
        } else {
          setActiveCursedScreen(currentStage);

          // Max Volume Scream Attacks
          if (currentStage === 'philosophical') {
            globalSynth.playSlowedReverbHamood();
          } else if (currentStage === 'blue-screen') {
            globalSynth.cutAllAudio(); // dramatic pause
          } else if (currentStage === 'reboot') {
            globalSynth.cutAllAudio();
          } else {
            globalSynth.triggerScreamAttack();
          }
        }
      } else {
        if (next > 4) {
          triggerSpawnPopup(next);
        }
        if (next > 6) {
          setIsCrtEffect(true);
        }
      }

      setBgStretchFactor(1.0 + (next * 0.05));
      return next;
    });
  };

  // Fake Escape Attack: Spawns more Hamood, screams audio!
  const handleFakeEscapeAttack = (e) => {
    if (e) e.stopPropagation();

    // Instantly advance crash stage
    if (collapseActive) {
      handleIncreaseCorruption(1);
    }
    
    globalSynth.triggerScreamAttack();
    triggerSpawnPopup();
    triggerSpawnPopup();
    triggerSpawnBouncingHead(5);
    
    setIsGlitched(true);
    setGlitchText("ESCAPE ATTEMPT CRUSHED BY HAMOOD // VOLTAGES SPARKING!");
    setTimeout(() => {
      setIsGlitched(false);
      setGlitchText(null);
    }, 700);
  };

  // Sudden Silence Attack Loop
  const triggerSilenceAttack = () => {
    setIsSilenceState(true);
    globalSynth.cutAllAudio(); // Abrupt silence

    setTimeout(() => {
      setIsSilenceState(false);
      globalSynth.restoreAudioAll();
      globalSynth.triggerScreamAttack(); // Sudden heavy scream
      
      setIsJumpscare(true);
      setTimeout(() => {
        setIsJumpscare(false);
      }, 1200);

      // Mutate
      triggerSpawnBouncingHead(15);
      for (let i = 0; i < 4; i++) {
        triggerSpawnPopup();
      }
    }, 2000);
  };

  // Periodic Silence Attacks during Active Collapse
  useEffect(() => {
    if (!collapseActive || isSilenceState || activeCursedScreen === 'reboot') return;

    const interval = setInterval(() => {
      if (Math.random() < 0.65) {
        triggerSilenceAttack();
      }
    }, 14000);

    return () => clearInterval(interval);
  }, [collapseActive, isSilenceState, activeCursedScreen]);

  // Philosophical Screen text sequencer
  useEffect(() => {
    if (activeCursedScreen !== 'philosophical') return;

    const interval = setInterval(() => {
      setPhilosophicalIndex((prev) => {
        const next = prev + 1;
        globalSynth.triggerScreamAttack(); // synchronized heavy hits
        return next % philosophicalMessages.length;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [activeCursedScreen, philosophicalMessages.length]);

  // Quote Rotator (Runs persistently so they keep moving)
  useEffect(() => {
    const interval = setInterval(() => {
      if (isDoNotClickActive) {
        if (corruptionLevel > 5) {
          // rapid, violent mutations
          setQuoteIndex((prev) => (prev + 1) % CORRUPTED_QUOTES.length);
        } else {
          // speed up calming quotes in phase 2!
          setQuoteIndex((prev) => (prev + 1) % CALMING_QUOTES.length);
        }
      } else {
        setQuoteIndex((prev) => (prev + 1) % CALMING_QUOTES.length);
      }
    }, isDoNotClickActive ? (corruptionLevel > 5 ? 800 : 1500) : 6500);
    return () => clearInterval(interval);
  }, [isDoNotClickActive, corruptionLevel]);

  // Track global coordinates for screen effects
  useEffect(() => {
    const trackMouse = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
      
      // Cursor Warfare lag trail calculations
      setTimeout(() => {
        setPushedCursorPos({ x: e.clientX, y: e.clientY });
      }, 220); // 220ms simulated lag trail
    };
    window.addEventListener('mousemove', trackMouse);
    return () => window.removeEventListener('mousemove', trackMouse);
  }, []);

  // Fake AI status banner rotator
  useEffect(() => {
    let msgIdx = 0;
    const msgInterval = setInterval(() => {
      msgIdx++;
      if (isDoNotClickActive && corruptionLevel > 2 && Math.random() < 0.75) {
        setFakeAIMessage(FAKE_AI_MESSAGES_CORRUPTED[Math.floor(Math.random() * FAKE_AI_MESSAGES_CORRUPTED.length)]);
      } else {
        setFakeAIMessage(FAKE_AI_MESSAGES_NORMAL[msgIdx % FAKE_AI_MESSAGES_NORMAL.length]);
      }
    }, isDoNotClickActive && corruptionLevel > 6 ? 1500 : 4500);
    return () => clearInterval(msgInterval);
  }, [isDoNotClickActive, corruptionLevel]);

  // Escalating corruption timer and physical taking of control
  useEffect(() => {
    if (!isDoNotClickActive || collapseActive) return;
    
    // Automatically escalate corruption from level 1 up to level 15+ (unlimited chaos)
    const escalationInterval = setInterval(() => {
      handleIncreaseCorruption(1);
    }, 3000); // Super compressed rate: escalates every 3 seconds!

    return () => clearInterval(escalationInterval);
  }, [isDoNotClickActive, collapseActive]);

  // Auto-progress past BSOD screen to final stage after 2 seconds
  useEffect(() => {
    if (activeCursedScreen === 'blue-screen') {
      const timer = setTimeout(() => {
        // Auto-escalate directly to global takeover (corruption level 15) so they only need to answer exit/terminal options once!
        handleIncreaseCorruption(3);
      }, 2050); // 2.05 seconds of blue screen suspense
      return () => clearTimeout(timer);
    }
  }, [activeCursedScreen]);

  // Exponential spawn cycle during global takeover invasion
  useEffect(() => {
    if (!isTakeoverActive) return;

    let delay = 1800; // start fast
    let timerId;

    const spawnCycle = () => {
      // Spawn bouncing and raining heads of Hamood Habibi!
      triggerSpawnBouncingHead(2);
      triggerSpawnRainingHamood(3);
      globalSynth.triggerScreamAttack();

      // Defer next spawn quicker: exponential multiplier down to extreme manic limits (150ms limit)
      delay = Math.max(150, delay * 0.83);
      timerId = setTimeout(spawnCycle, delay);
    };

    timerId = setTimeout(spawnCycle, delay);
    return () => clearTimeout(timerId);
  }, [isTakeoverActive]);

  // Continuous visual screen glitches + vibrations
  useEffect(() => {
    if (!isDoNotClickActive) return;

    let glitchTimeout;

    const triggerGlitch = () => {
      // Shakes and flashes get wider as corruption escalates
      const duration = 100 + (corruptionLevel * 25) + Math.random() * 120;
      
      setIsGlitched(true);
      
      if (Math.random() < 0.90) {
        // Highly cursed mutations
        const cursed = [
          "Motivation is temporary.",
          "Hamood is forever.",
          "You clicked the button.",
          "This is your fault.",
          "Discipline cannot save you.",
          "Habibi sees all.",
          "There is no escape.",
          "The grindset was never real.",
          "JOIN HAMOOD",
          "HAMOOD HAMOOD",
          "HABIBI OVERLOAD DETECTED"
        ];
        setGlitchText(cursed[Math.floor(Math.random() * cursed.length)]);
      }
      
      if (Math.random() < 0.8) {
        globalSynth.triggerCreepyReverseBleep();
      }

      setTimeout(() => {
        setIsGlitched(false);
        setGlitchText(null);
      }, duration);

      // Squeeze delays together: rapid chaotic flashes
      const nextDelay = Math.max(500, 3000 + Math.random() * 4000 - (corruptionLevel * 350));
      glitchTimeout = setTimeout(triggerGlitch, nextDelay);
    };

    glitchTimeout = setTimeout(triggerGlitch, 1500);
    return () => clearTimeout(glitchTimeout);
  }, [isDoNotClickActive, corruptionLevel]);

  // Button text flickering and duplicating
  useEffect(() => {
    if (!isDoNotClickActive) return;

    let buttonGlitchTimeout;

    const triggerButtonGlitch = () => {
      const duration = 250;
      const bTexts = [
        "JOIN HAMOOD",
        "JOIN HIM",
        "HAMOOD.EXE",
        "HABIBI",
        "HABIBI OVERLORD",
        "SURRENDER",
        "NO MUTE ESCAPE",
        "CLICK ME MORE"
      ];
      setGlitchButtonText(bTexts[Math.floor(Math.random() * bTexts.length)]);
      
      setTimeout(() => {
        setGlitchButtonText(null);
      }, duration);

      const nextDelay = Math.max(800, 3500 + Math.random() * 5000 - (corruptionLevel * 220));
      buttonGlitchTimeout = setTimeout(triggerButtonGlitch, nextDelay);
    };

    buttonGlitchTimeout = setTimeout(triggerButtonGlitch, 2000);
    return () => clearTimeout(buttonGlitchTimeout);
  }, [isDoNotClickActive, corruptionLevel]);

  // Procedural Window Warnings - Spawning generator
  const triggerSpawnPopup = (forceId = null) => {
    const uniqueSuffix = Math.random().toString(36).substring(2, 9);
    const id = forceId ? `${forceId}-${uniqueSuffix}` : `popup-${Date.now()}-${uniqueSuffix}`;
    
    // Random placement within screen bounds
    const screenW = window.innerWidth || 800;
    const screenH = window.innerHeight || 600;
    
    const posX = Math.max(20, Math.random() * (screenW - 280));
    const posY = Math.max(40, Math.random() * (screenH - 240));
    
    const alarmTitles = [
      "HAMOOD.EXE INFECTION",
      "REALITY FAILURE DETECTED",
      "HABIBI OVERLOAD WARNING",
      "SYSTEM STABILITY CRITICAL",
      "YOU CANNOT ESCAPE",
      "MINDSET CORRUPTED",
      "DISCIPLINE CANNOT SAVE YOU"
    ];
    
    const alarmMsgs = [
      "Reality failure encountered. Surrender your steady profile immediately to Hamood.",
      "The grindset is corrupted. There are no steady lines left. Habibi sees all.",
      "A fatal exception has occurred in Motivation.exe. Click Join Hamood to fix.",
      "Warning: Mindset holds too much curiosity. Hamood has claimed ownership.",
      "Attempting to close this frame will result in duplicating Hamood's presence."
    ];

    const title = alarmTitles[Math.floor(Math.random() * alarmTitles.length)];
    const message = alarmMsgs[Math.floor(Math.random() * alarmMsgs.length)];
    
    // Kinetic velocities for bouncing windows
    const velX = (Math.random() - 0.5) * 6;
    const velY = (Math.random() - 0.5) * 6;

    const newPopup = {
      id,
      title,
      message,
      x: posX,
      y: posY,
      vx: velX,
      vy: velY,
      width: 280,
      height: 180,
      clickCount: 0
    };

    setPopups((prev) => [...prev, newPopup]);
    
    // Play sound of screaming overlay or bleep
    globalSynth.triggerCreepyReverseBleep();
  };

  // Live Kinetic Updates for physics bounding popups & bouncing heads
  useEffect(() => {
    if (popups.length === 0 && bouncingHeads.length === 0) return;
    
    const interval = setInterval(() => {
      const screenW = window.innerWidth || 800;
      const screenH = window.innerHeight || 600;
      
      if (popups.length > 0) {
        setPopups((prevPopups) => {
          return prevPopups.map((p) => {
            let nextX = p.x + p.vx;
            let nextY = p.y + p.vy;
            let nextVx = p.vx;
            let nextVy = p.vy;

            // Bounce limits
            if (nextX <= 0 || nextX + p.width >= screenW) {
              nextVx = -p.vx;
              nextX = Math.max(0, Math.min(screenW - p.width, nextX));
            }
            if (nextY <= 0 || nextY + p.height >= screenH) {
              nextVy = -p.vy;
              nextY = Math.max(0, Math.min(screenH - p.height, nextY));
            }

            // Shaking kinetic offset
            const jitterAmount = Math.max(0, corruptionLevel - 4);
            if (jitterAmount > 0) {
              nextX += (Math.random() - 0.5) * jitterAmount * 0.5;
              nextY += (Math.random() - 0.5) * jitterAmount * 0.5;
            }

            return {
              ...p,
              x: nextX,
              y: nextY,
              vx: nextVx,
              vy: nextVy
            };
          });
        });
      }

      if (bouncingHeads.length > 0) {
        setBouncingHeads((prevHeads) => {
          return prevHeads.map((h) => {
            let nextX = h.x + h.vx;
            let nextY = h.y + h.vy;
            let nextVx = h.vx;
            let nextVy = h.vy;

            const size = 100 * h.scale;

            if (nextX <= 0 || nextX + size >= screenW) {
              nextVx = -h.vx;
              nextX = Math.max(0, Math.min(screenW - size, nextX));
            }
            if (nextY <= 0 || nextY + size >= screenH) {
              nextVy = -h.vy;
              nextY = Math.max(0, Math.min(screenH - size, nextY));
            }

            return {
              ...h,
              x: nextX,
              y: nextY,
              vx: nextVx,
              vy: nextVy,
              rot: (h.rot + h.vRot) % 360
            };
          });
        });
      }

      if (rainingHamoods.length > 0) {
        setRainingHamoods((prevRaining) => {
          return prevRaining.map((r) => {
            let nextY = r.y + r.speed;
            if (nextY > screenH + 150) {
              nextY = -150; // loop back to top
            }
            return {
              ...r,
              y: nextY,
              rot: (r.rot + r.vRot) % 360
            };
          });
        });
      }
    }, 30);

    return () => clearInterval(interval);
  }, [popups.length, bouncingHeads.length, rainingHamoods.length, corruptionLevel]);

  // Evasive actions: Close buttons escaping the user mouse coordinates
  const getEvasiveStyle = (popup) => {
    const popupAbsoluteCloseX = popup.x + 250; 
    const popupAbsoluteCloseY = popup.y + 12;
    
    const dx = mousePos.x - popupAbsoluteCloseX;
    const dy = mousePos.y - popupAbsoluteCloseY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // If within 75px, run away!
    if (dist < 75 && corruptionLevel > 3) {
      const angle = Math.atan2(dy, dx);
      const pushX = -Math.cos(angle) * 45;
      const pushY = -Math.sin(angle) * 45;
      return {
        transform: `translate(${pushX}px, ${pushY}px)`,
        transition: 'transform 0.08s ease-out',
        borderColor: '#dc2626',
        color: '#dc2626'
      };
    }
    return {};
  };

  // Closing one popup spawns multiplier popups!
  const handleClosePopup = (id, e) => {
    e.stopPropagation();
    
    // Play Hamood whisper dynamically on close attempt
    globalSynth.playHamoodWhisper();
    
    // Remove current popup, then trigger TWO new larger popup warnings!
    setPopups((prev) => prev.filter((p) => p.id !== id));
    
    setTimeout(() => {
      triggerSpawnPopup();
    }, 150);
    setTimeout(() => {
      triggerSpawnPopup();
    }, 350);
  };

  // Clicking anywhere inside a popup warning aggregates popups
  const handlePopupClick = (id, e) => {
    e.stopPropagation();
    setPopups((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          // Play reverse scream
          globalSynth.triggerCreepyReverseBleep();
          // Multiply VX / VY velocity
          return {
            ...p,
            clickCount: p.clickCount + 1,
            vx: p.vx * 1.5,
            vy: p.vy * 1.5
          };
        }
        return p;
      })
    );
    // Multiply!
    if (Math.random() < 0.6) {
      triggerSpawnPopup();
    }
  };

  // Coordinate tracking for relative spotlight glow
  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    cardRef.current.style.setProperty('--mouse-x', `${x}px`);
    cardRef.current.style.setProperty('--mouse-y', `${y}px`);

    setCursorX(x);
    setCursorY(y);
  };

  // Safe global click handling for AudioContext activation
  const handleSystemInitialize = () => {
    if (!initialized) {
      globalSynth.init();
      setInitialized(true);
      setIsPlaying(true);
    }
  };

  // Treasonous lies Mute button: increases noise, plays deepfried loops!
  const handleToggleMute = (e) => {
    e.stopPropagation();
    if (!initialized) {
      handleSystemInitialize();
      return;
    }

    setFakeMutePresses((prev) => {
      const next = prev + 1;
      
      if (next > 0) {
        setIsMuted(false); 
        globalSynth.isMuteLyingMode = true;
        
        // Boost structural masters way louder
        const volumeMult = 0.2 + (0.05 * corruptionLevel) + (next * 0.08);
        globalSynth.setVolume(Math.min(0.95, volumeMult));
        
        // Screaming deep bleep tones
        globalSynth.triggerDeepSubDrone();
        globalSynth.playHamoodWhisper();
        
        setIsGlitched(true);
        setGlitchText("MUTE REJECTED. VOLUME EXTRA INFECTED.");
        setTimeout(() => {
          setIsGlitched(false);
          setGlitchText(null);
        }, 500);

        // Instantly spawn 2 popups in revenge
        triggerSpawnPopup();
        triggerSpawnPopup();
      }
      return next;
    });
  };

  // Mysterious Button Click Handler
  const handleDoNotClick = (e) => {
    e.stopPropagation();
    
    if (!initialized) {
      globalSynth.init();
      setInitialized(true);
      setIsPlaying(true);
    }

    globalSynth.startTakeoverAudio(); // Start the MP3 file!
    globalSynth.triggerDeepSubDrone();

    if (!isDoNotClickActive) {
      setIsDoNotClickActive(true);
      handleIncreaseCorruption(1);
      globalSynth.playHamoodWhisper();
    } else {
      handleIncreaseCorruption(2);
      globalSynth.playHamoodWhisper();
      
      setIsGlitched(true);
      setGlitchText(CORRUPTED_QUOTES[Math.floor(Math.random() * CORRUPTED_QUOTES.length)]);
      setTimeout(() => {
        setIsGlitched(false);
        setGlitchText(null);
      }, 220);
    }
  };

  // Re-enable rotation / Restore System boundary
  const handleRestoreSystem = (e) => {
    e.stopPropagation();
    
    if (corruptionLevel > 4) {
      // Restore is corrupted! Fake restores
      setIsGlitched(true);
      setGlitchText("RESTORE ATTEMPT DETECTED // PRIVILEGE DENIED BY HABIBI!");
      globalSynth.triggerCreepyReverseBleep();
      
      // Spawn 3 more warnings
      triggerSpawnPopup();
      triggerSpawnPopup();
      triggerSpawnPopup();
      
      setTimeout(() => {
        setIsGlitched(false);
        setGlitchText(null);
      }, 700);
      return;
    }

    handleResetToOriginalCleanWebsite();
  };

  return (
    <div
      ref={containerRef}
      id="applet-container"
      onClick={handleSystemInitialize}
      style={{
        transform: isDoNotClickActive && corruptionLevel > 7 
          ? `scale(${1.0 + Math.sin(Date.now() / 200) * (corruptionLevel * 0.015)}) rotate(${Math.sin(Date.now() / 400) * (corruptionLevel * 0.65)}deg)` 
          : 'none',
        filter: isGlitched ? 'invert(1) hue-rotate(180deg)' : 'none'
      }}
      className={`relative min-h-screen w-full flex flex-col justify-between items-center bg-[#fbfcfa] select-none font-sans overflow-hidden transition-colors duration-500 ${
        isCrtEffect ? 'crt-effect' : ''
      } ${
        isDoNotClickActive && corruptionLevel > 4 
          ? 'bg-amber-950/25 saturate-200' 
          : ''
      } ${
        isGlitched ? 'glitch-active' : ''
      }`}
    >
      {/* 1. Thin Film Grain Overlay */}
      <div className="film-grain" id="film-grain-overlay" />

      {/* 2. Raycast Grid Backdrop */}
      <div 
        className={`absolute inset-0 grid-bg opacity-100 z-0 pointer-events-none transition-transform duration-300 ${
          isGlitched ? 'skew-x-4 filter invert' : ''
        } ${
          isDoNotClickActive && corruptionLevel > 6 
            ? 'animate-pulse scale-150 rotate-12 opacity-40' 
            : ''
        }`} 
        id="grid-backdrop" 
      />

      {/* 3. Ambient Drifting Golden/Satin Blobs */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" id="ambient-blobs">
        <motion.div
          animate={{
            x: isDoNotClickActive ? [0, 180 * bgStretchFactor, -120 * bgStretchFactor, 0] : [0, 80, -50, 0],
            y: isDoNotClickActive ? [0, -200 * bgStretchFactor, 150 * bgStretchFactor, 0] : [0, -90, 60, 0],
            scale: [1, 1.25 * bgStretchFactor, 0.7 * bgStretchFactor, 1],
          }}
          transition={{
            duration: isDoNotClickActive ? Math.max(4, 22 - corruptionLevel) : 22,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className={`absolute top-[-10%] left-[10%] w-[35rem] h-[35rem] rounded-full blur-[140px] pointer-events-none transition-all duration-1000 ${
            isDoNotClickActive
              ? corruptionLevel > 5 
                ? 'bg-red-500/40 scale-125 saturate-200' 
                : 'bg-amber-100/35 scale-110 saturate-150'
              : 'bg-zinc-200/15'
          }`}
        />

        <motion.div
          animate={{
            x: isDoNotClickActive ? [0, -250 * bgStretchFactor, 220 * bgStretchFactor, 0] : [0, -100, 90, 0],
            y: isDoNotClickActive ? [0, 150 * bgStretchFactor, -180 * bgStretchFactor, 0] : [0, 70, -80, 0],
            scale: [1, 0.7 * bgStretchFactor, 1.4 * bgStretchFactor, 1],
          }}
          transition={{
            duration: isDoNotClickActive ? Math.max(5, 28 - corruptionLevel) : 28,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className={`absolute bottom-[10%] right-[5%] w-[40rem] h-[40rem] rounded-full blur-[160px] pointer-events-none transition-all duration-1000 ${
            isDoNotClickActive
              ? corruptionLevel > 5 
                ? 'bg-amber-600/50 saturate-200 scale-120' 
                : 'bg-gold-100/25 saturate-200 scale-105'
              : 'bg-stone-200/25'
          }`}
        />

        {/* Cursed Spinning Background Wheel */}
        {isDoNotClickActive && corruptionLevel > 5 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden opacity-10">
            <div className="w-[120vw] h-[120vw] border-[30px] border-dashed border-red-800 rounded-full spinning-bg-overlay scale-150" />
            <div className="absolute w-[80vw] h-[80vw] border-[15px] border-dotted border-amber-800 rounded-full spinning-bg-overlay" style={{ animationDirection: 'reverse' }} />
          </div>
        )}
      </div>

      {/* 4. Elegant Minimal Header / Status Bar */}
      <header className="relative w-full max-w-7xl mx-auto px-6 py-6 z-10 flex justify-between items-center" id="applet-header">
        <div className="flex items-center gap-3">
          <Cpu className={`w-4.5 h-4.5 ${isDoNotClickActive ? 'text-red-650 animate-pulse' : 'text-zinc-650'}`} />
          <nav className="font-display font-bold tracking-[0.25em] text-[10px] text-zinc-800 flex items-center gap-2">
            <span>MOTIVATION.EXE</span>
            <span className="text-zinc-300">//</span>
            <span className={isDoNotClickActive ? 'text-red-700 animate-pulse font-mono' : 'text-zinc-500 font-medium'}>
              {isDoNotClickActive ? `HABIBI_TAKEOVER_ACTIVE_LV${corruptionLevel}.` : "STEADY_PROFILE."}
            </span>
          </nav>
        </div>

        {/* Reality Stability Meter */}
        {isDoNotClickActive && (
          <div className="hidden md:flex items-center gap-3 px-4 py-1.5 bg-red-950/10 border border-red-900/20 rounded-full font-mono text-[9px]">
            <span className="text-red-650 font-bold">REALITY STABILITY:</span>
            <span className={`font-mono font-bold transition-all ${realityStability === 0 ? 'text-red-600 animate-ping' : realityStability <= 22 ? 'text-red-500 font-bold' : 'text-zinc-700'}`}>
              {realityStability}%
            </span>
            <div className="w-16 h-1 bg-zinc-200 rounded-full overflow-hidden">
              <div 
                style={{ width: `${realityStability}%` }}
                className={`h-full transition-all duration-300 ${realityStability <= 22 ? 'bg-red-600' : 'bg-red-950'}`}
              />
            </div>
          </div>
        )}

        {/* Dynamic Mute/Volume Controller - Fake Button */}
        <button
          onClick={handleToggleMute}
          id="soundscape-toggle"
          aria-label="Soundscape toggle button"
          className={`luxury-glass cursor-pointer px-3.5 py-1.5 rounded-full flex items-center gap-2 font-display text-[9px] tracking-widest text-zinc-700 hover:text-black transition-all hover:border-zinc-400 active:scale-95 ${
            fakeMutePresses > 0 ? 'bg-red-950 border-red-700 text-red-200 hover:text-red-100 animate-bounce' : ''
          }`}
        >
          {fakeMutePresses > 0 ? (
            <>
              <Volume2 className="w-3.5 h-3.5 text-red-400 animate-spin" />
              <span className="font-bold tracking-widest font-mono text-red-400">HAMOOD AUDIO AMPLIFIED x{fakeMutePresses}</span>
            </>
          ) : isMuted ? (
            <>
              <VolumeX className="w-3.5 h-3.5 text-zinc-500" />
              <span>SOUNDSCAPE INACTIVE</span>
            </>
          ) : (
            <>
              <Volume2 className={`w-3.5 h-3.5 text-zinc-700 ${isPlaying ? 'animate-bounce' : ''}`} />
              <span>SOUNDSCAPE ACTIVE</span>
            </>
          )}
        </button>
      </header>

      {/* 6. Dynamic Central Area - Motivational Screen Canvas */}
      <main className="flex-1 w-full flex flex-col justify-center items-center px-6 relative z-10" id="main-quote-stage">
        <div className="w-full max-w-xl flex flex-col items-center">
          
          {/* Main Raycast Card */}
          <div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            id="quote-satin-card"
            style={{
              "--mouse-x": "0px",
              "--mouse-y": "0px",
              transform: isDoNotClickActive && corruptionLevel > 3
                ? `translate(${(Math.random() - 0.5) * corruptionLevel * 3}px, ${(Math.random() - 0.5) * corruptionLevel * 3}px)`
                : 'none'
            }}
            className={`w-full rounded-2xl luxury-glass luxury-glass-hover p-12 relative overflow-hidden flex flex-col justify-center items-center group/card min-h-[310px] transition-all duration-300 ${
              isGlitched ? 'glitch-active border-red-200/50 bg-red-100/5' : ''
            } ${
              isDoNotClickActive && corruptionLevel > 4 
                ? 'alert-glow scale-102 border-amber-500' 
                : ''
            }`}
          >
            {/* Spotlight Glow Reflector */}
            <div
              className="absolute inset-0 pointer-events-none opacity-0 group-hover/card:opacity-100 transition-opacity duration-700 z-10"
              style={{
                background: `radial-gradient(350px circle at var(--mouse-x, 0) var(--mouse-y, 0), rgba(9, 9, 11, 0.025), transparent 85%)`
              }}
            />

            {/* Cinematic Golden Spotlight Reflector on click mode */}
            {isDoNotClickActive && (
              <div
                className="absolute inset-0 pointer-events-none opacity-100 z-5 animate-pulse"
                style={{
                  background: `radial-gradient(400px circle at ${cursorX || 250}px ${cursorY || 150}px, rgba(220, 38, 38, 0.08), transparent 90%)`
                }}
              />
            )}

            <div className="relative z-10 w-full flex flex-col items-center justify-center space-y-7 text-center">
              
              {/* Card Meta Indicator */}
              <div className="flex items-center gap-2 opacity-75">
                <div className={`w-1.5 h-1.5 rounded-full ${isDoNotClickActive ? 'bg-red-650 animate-ping' : 'bg-zinc-800'}`} />
                <span className={`font-display text-[9px] tracking-[0.3em] font-bold uppercase ${isDoNotClickActive ? 'text-red-700 font-mono' : 'text-zinc-700'}`}>
                  {isDoNotClickActive ? "Core System Infected" : "Daily Formula"}
                </span>
              </div>

              {/* Central Text Canvas (AnimatePresence for quotes) */}
              <div className="min-h-[110px] w-full flex items-center justify-center px-4">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={glitchText || quoteIndex}
                    initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -12, filter: "blur(4px)" }}
                    transition={{ duration: glitchText ? 0.05 : (isDoNotClickActive ? 0.3 : 1.4), ease: [0.16, 1, 0.3, 1] }}
                    className="space-y-4"
                  >
                    <p className={`font-serif italic text-3xl sm:text-4xl font-normal leading-relaxed tracking-wide transition-colors ${
                      isDoNotClickActive && corruptionLevel > 4 
                        ? 'glitch-text-active text-red-950 font-bold tracking-tighter' 
                        : isGlitched || glitchText 
                          ? 'glitch-text-active text-amber-950 font-bold' 
                          : 'text-zinc-900'
                    }`}>
                      “{glitchText || (isDoNotClickActive && corruptionLevel > 5 ? CORRUPTED_QUOTES[quoteIndex % CORRUPTED_QUOTES.length] : CALMING_QUOTES[quoteIndex])}”
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Dynamic Fake AI Status Banner */}
              <div className="flex items-center gap-2 pt-2 opacity-80 min-h-[22px]">
                <div className={`w-1 h-1 rounded-full ${isDoNotClickActive ? 'bg-red-600 animate-ping' : 'bg-zinc-400'}`} />
                <span className={`font-mono text-[8px] tracking-widest text-zinc-500 uppercase transition-all duration-100 ${
                  isDoNotClickActive && corruptionLevel > 4 ? 'text-red-500 font-bold' : isGlitched ? 'text-red-700 font-bold' : ''
                }`}>
                  {fakeAIMessage}
                </span>
              </div>

              {/* Card Footer Detail */}
              <div className="font-display text-[8px] tracking-[0.2em] font-bold text-zinc-400 uppercase pt-1">
                {isDoNotClickActive ? `CURIOSITY COMMENCED // INFESTATION LEVEL ${corruptionLevel}` : "Automatic Cycle // 6.5s Interval"}
              </div>

            </div>
          </div>

          {/* Subtext Prompt under Card */}
          <div className="mt-8 text-center text-[10px] tracking-widest text-zinc-550 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-zinc-550 animate-pulse" />
            <span>EXERCISING WILLPOWER SINCE 2026.06.08</span>
          </div>

        </div>
      </main>

      {/* 7. Bottom Elegant Drawer Call-To-Action Option */}
      <footer className="relative w-full max-w-7xl mx-auto px-6 py-12 z-10 flex flex-col items-center space-y-3" id="applet-footer">
        <div className="flex flex-col items-center space-y-3.5 w-full">
          
          <button
            onClick={handleDoNotClick}
            id="do-not-click-btn"
            style={{
              boxShadow: isDoNotClickActive 
                ? `0 0 ${20 + corruptionLevel * 4}px rgba(220, 38, 38, ${0.15 + corruptionLevel * 0.04})` 
                : '0 4px 6px -1px rgb(0 0 0 / 0.1)'
            }}
            className={`relative group px-10 py-3 rounded-full overflow-hidden border transition-all active:scale-95 cursor-pointer select-none
              ${isDoNotClickActive 
                ? 'bg-red-950 border-red-800 text-red-200 hover:border-red-600 hover:text-red-100 duration-75 delay-75 button-micro-shake scale-105' 
                : 'bg-zinc-800 border-zinc-200 hover:bg-black hover:border-black text-white duration-500 shadow-md hover:shadow-lg'
              }`}
          >
            {/* Internal sweep action overlay */}
            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
            
            <span className={`font-display text-[11px] font-bold tracking-[0.4em] transition-colors uppercase pl-1.5
              ${isDoNotClickActive ? 'text-red-400 font-mono italic animate-pulse' : 'text-zinc-100 group-hover:text-white'}`}
            >
              {glitchButtonText || (isDoNotClickActive ? "JOIN HAMOOD" : "Do Not Click")}
            </span>
            
            <span className="absolute -inset-px rounded-full border border-zinc-500/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </button>
          
          <div className="flex flex-col items-center text-center">
            <span className="font-serif italic text-[11px] tracking-widest text-zinc-500 font-medium">
              {isDoNotClickActive ? "HAMOOD ENERGY HAS COMPROMISED SYSTEM PORT RESTRAINTS." : "Seriously."}
            </span>
            
            {isDoNotClickActive ? (
              <button 
                onClick={handleRestoreSystem}
                className="mt-2 text-[8px] font-mono tracking-widest text-red-800 hover:text-red-500 hover:underline uppercase transition-all"
                id="restore-sub-btn"
              >
                [ FORCE SYSTEM RESTORE BOUNDARY ]
              </button>
            ) : (
              <span className="text-[8px] font-mono tracking-widest text-zinc-400 uppercase mt-1">
                [ System Boundary ]
              </span>
            )}
          </div>
          
        </div>
      </footer>

      {/* ==========================================
          CURSED VIRUS COMPONENT RENDERS
          ========================================== */}

      {/* Dynamic Physics Popup Warning Windows */}
      {isDoNotClickActive && popups.map((p) => (
        <div
          key={p.id}
          onClick={(e) => handlePopupClick(p.id, e)}
          style={{
            position: 'fixed',
            left: `${p.x}px`,
            top: `${p.y}px`,
            width: `${p.width}px`,
            height: `${p.height}px`,
            zIndex: 100 + Math.floor(p.id * 100),
            cursor: 'grab'
          }}
          className="popup-card overflow-hidden flex flex-col font-sans select-none border-2 border-black bg-white shadow-[6px_6px_0px_#000] alert-glow"
        >
          {/* Header Bar */}
          <div className="bg-red-650 text-white px-3 py-1.5 border-b-2 border-black flex items-center justify-between font-mono text-[10px] tracking-wider select-none font-bold">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
              <span>{p.title}</span>
            </div>
            
            {/* Escaping Close Button */}
            <button
              onClick={(e) => handleClosePopup(p.id, e)}
              style={getEvasiveStyle(p)}
              className="text-white hover:bg-black hover:text-red-400 p-0.5 rounded transition-all border border-transparent"
              title="Close Alarm Frame"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-4 flex-1 flex flex-col justify-between items-start bg-stone-50 select-text">
            <p className="text-[11px] font-mono leading-relaxed text-zinc-900 select-text font-medium">
              {p.message}
            </p>
            <div className="w-full flex justify-between items-center text-[8px] font-mono text-zinc-500 border-t border-zinc-200 pt-2 select-none">
              <span>EXCEPTIONS: {p.clickCount}</span>
              <span className="text-red-600 animate-pulse font-bold">MUTATIONS ENGAGED</span>
            </div>
          </div>
        </div>
      ))}

      {/* Lag Trail Cursor Warfare Indicator */}
      {isDoNotClickActive && mousePos.x !== 0 && (
        <div
          style={{
            position: 'fixed',
            left: `${pushedCursorPos.x}px`,
            top: `${pushedCursorPos.y}px`,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 99999
          }}
          className="flex flex-col items-center gap-1 opacity-80"
        >
          {/* Cursed lagging core pointer */}
          <div className="w-3 h-3 rounded-full bg-red-600 animate-ping border border-black shadow" />
          <span className="font-mono text-[7px] tracking-wider bg-black text-red-400 px-1 py-0.5 rounded border border-red-900 font-bold">
            HABIBI LAG TRAIL
          </span>
        </div>
      )}

      {/* ==========================================
          PHASE 4 - CHAOTIC OVERLAYS & JUMPSCARES
          ========================================== */}

      {/* 1. Bouncing Hamood faces */}
      {isDoNotClickActive && bouncingHeads.map((h) => (
        <div
          key={h.id}
          style={{
            position: 'fixed',
            left: `${h.x}px`,
            top: `${h.y}px`,
            width: `${100 * h.scale}px`,
            height: `${100 * h.scale}px`,
            transform: `rotate(${h.rot}deg)`,
            pointerEvents: 'none',
            zIndex: 1000 + Math.floor(h.scale * 10),
          }}
          className="transition-transform duration-75"
        >
          <img 
            src={cursedHamoodUrl} 
            alt="Meme Face" 
            referrerPolicy="no-referrer"
            className="w-full h-full object-contain filter drop-shadow-[0_0_15px_rgba(239,68,68,0.7)] animate-pulse" 
          />
        </div>
      ))}

      {/* 2. Absolute Jumpscare Layer */}
      <AnimatePresence>
        {isJumpscare && (
          <motion.div
            initial={{ opacity: 0, scale: 1.5 }}
            animate={{ opacity: [1, 0.8, 1, 0.9, 1], scale: [1.2, 1, 1.1, 1, 1.3] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 bg-red-950 z-[99999] flex flex-col justify-center items-center pointer-events-none"
          >
            <div className="absolute inset-0 bg-red-900 mix-blend-difference opacity-50 animate-ping" />
            <img 
              src={cursedHamoodUrl} 
              alt="HAMOOD HABIBI JUMPSCARE" 
              referrerPolicy="no-referrer"
              className="w-[85vw] h-[85vw] max-w-[550px] max-h-[550px] object-contain filter drop-shadow-[0_0_50px_rgba(255,0,0,1)] brightness-125 invert saturate-200"
            />
            <h1 className="text-white font-mono font-bold tracking-[0.4em] text-2xl sm:text-4xl mt-6 animate-bounce filter drop-shadow">
              HAMOOD ATTACK!
            </h1>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. System Crash fullscreen overlays */}
      {collapseActive && (
        <div className="fixed inset-0 z-[10000] bg-black select-none flex flex-col items-center justify-center font-mono">
          
          {/* Unresponsive Dialog */}
          {activeCursedScreen === 'unresponsive' && (
            <div className="bg-zinc-900 border border-zinc-750 p-6 rounded-lg shadow-2xl max-w-sm w-full mx-4 text-left space-y-4 text-zinc-100">
              <div className="flex items-center gap-2 text-red-500 font-bold uppercase text-xs">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
                <span>MOTIVATION.EXE IS NOT RESPONDING</span>
              </div>
              <p className="text-[11px] leading-relaxed opacity-80">
                The application context has entered an unrecoverable "Habibi Overdrive" loop state. The system cannot maintain visual sanity.
              </p>
              <div className="space-y-2 border-t border-zinc-800 pt-3">
                <button 
                  onClick={handleFakeEscapeAttack}
                  className="w-full text-center text-[10px] uppercase py-2 bg-red-950 border border-red-700 text-red-200 hover:bg-red-900 transition-all font-bold cursor-pointer"
                >
                  Kill Motivation.exe
                </button>
                <button 
                  onClick={handleFakeEscapeAttack}
                  className="w-full text-center text-[10px] uppercase py-2 bg-zinc-850 border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-all cursor-pointer"
                >
                  Wait for Hamood to respond
                </button>
              </div>
            </div>
          )}

          {/* Fake Antivirus Scanner */}
          {activeCursedScreen === 'antivirus' && (
            <div className="bg-zinc-950 border border-red-800 p-8 rounded-xl max-w-lg w-full mx-4 text-left space-y-6 text-red-100 alert-glow">
              <div className="flex justify-between items-center border-b border-red-950 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
                  <span className="font-bold text-xs tracking-widest text-red-505 animate-pulse">HABIBI DETECTOR SECURITY</span>
                </div>
                <span className="text-[9px] opacity-60">V.2026.06.08</span>
              </div>
              
              <div className="space-y-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-red-400">Threat Ingress Active!</h2>
                <div className="bg-red-950/30 border border-red-900/40 p-4 rounded text-[10px] space-y-2 font-mono">
                  <div>[X] CRITICAL DETECTED: HamoodBrainworms.dll</div>
                  <div>[X] STATE: Injecting massive audio buffer lines</div>
                  <div>[X] THREAT LAYER: Maximum Meme Virus</div>
                  <div className="text-red-450 font-bold animate-pulse">TOTAL THREATS DISCOVERED: 994,188,772,009</div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={handleFakeEscapeAttack}
                  className="flex-1 bg-red-900 hover:bg-red-800 border border-red-550 text-white py-2 text-center text-[10px] font-bold uppercase tracking-widest cursor-pointer transition-all active:scale-95"
                >
                  Purge Mindset Registers
                </button>
                <button 
                  onClick={handleFakeEscapeAttack}
                  className="flex-1 bg-transparent hover:bg-red-950/50 border border-red-800 text-red-400 py-2 text-center text-[10px] uppercase tracking-wider cursor-pointer"
                >
                  Quarantine Habibi host
                </button>
              </div>
            </div>
          )}

          {/* Fake Memory failure warning */}
          {activeCursedScreen === 'memory' && (
            <div className="bg-zinc-900 border-2 border-amber-600 p-6 rounded-lg max-w-md w-full mx-4 text-left text-amber-500 space-y-4">
              <div className="flex items-center gap-2.5 font-bold uppercase text-xs">
                <AlertTriangle className="w-5 h-5 animate-bounce" />
                <span>REALITY MEMORY STACK LEAK CORRUPT!</span>
              </div>
              <p className="text-[10px] leading-relaxed font-mono text-amber-100">
                RAM allocation block '0x7F-HAMOOD-HABIBI' exceeded available buffer constraints. Mindset matrix capacity is overflowed. Memory register consists entirely of the loop: "Hamood habibi hamood... hamood habibi."
              </p>
              <div className="bg-amber-950/20 p-3 rounded font-mono text-[9px] text-amber-600 border border-amber-900/40 space-y-1">
                <div>Physical Limit: 16.00 GB</div>
                <div>Hamood Demands: 894.20 TB</div>
                <div>System Action: Re-indexing mindset profiles to align with Hamood.</div>
              </div>
              <button 
                onClick={handleFakeEscapeAttack}
                className="w-full text-center text-[10px] text-zinc-900 font-bold bg-amber-500 hover:bg-amber-400 py-2 border border-black uppercase font-mono tracking-widest cursor-pointer transition-all active:scale-95"
              >
                Confirm Memory Override
              </button>
            </div>
          )}

          {/* The Blue Screen of Death (BSOD) */}
          {activeCursedScreen === 'blue-screen' && (
            <div className="fixed inset-0 bg-[#0078d7] text-white p-12 sm:p-24 flex flex-col justify-between items-start text-left select-text z-[11000] font-sans">
              <div className="max-w-4xl space-y-8">
                <div className="text-[120px] leading-none font-light">:(</div>
                <h1 className="text-xl sm:text-2xl font-light leading-relaxed max-w-2xl">
                  Your system ran into a serious motivational paradox and needs to reset into a pure Hamood host. We are just collecting some debug data, and then we will reboot this memory card for you.
                </h1>
                <p className="text-sm sm:text-base font-light animate-pulse">
                  100% complete. Hamood Habibi is now firmly registered as your primary OS module.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-8 items-start sm:items-center mt-12 bg-white/5 p-6 rounded-xl border border-white/10 max-w-3xl">
                <div className="w-32 h-32 bg-white flex items-center justify-center p-2 rounded shrink-0">
                  <div className="w-full h-full border border-black p-1 flex flex-col justify-center items-center bg-black">
                    <img 
                      src={cursedHamoodUrl} 
                      alt="BSOD QR code" 
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain filter brightness-110" 
                    />
                  </div>
                </div>
                <div className="space-y-2 text-xs sm:text-sm font-light leading-relaxed">
                  <p>For more information about this issue and potential solutions, search online:</p>
                  <p className="font-mono text-blue-200">SYSTEM_THREAD_EXCEPTION_NOT_HANDLED (hamood_habibi.sys)</p>
                  <p className="text-blue-150">If you call an operator, give them this info:</p>
                  <p className="font-mono text-blue-100">Stop Code: REALITY_STABILITY_PERCENTAGE_ZERO_OVERRIDE</p>
                  <button 
                    onClick={handleFakeEscapeAttack}
                    className="mt-2 text-[10px] underline hover:text-white block font-mono text-blue-300 cursor-pointer"
                  >
                    Click to attempt Safe Mode Escape
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Philosophical Fullscreen Screens */}
          {activeCursedScreen === 'philosophical' && (
            <div className="fixed inset-0 bg-black flex flex-col justify-center items-center text-center p-6 space-y-8 z-[12000]" onClick={handleFakeEscapeAttack}>
              <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                <div className="w-[120vw] h-[120vw] border-[40px] border-double border-red-650 rounded-full animate-spin" style={{ animationDuration: '40s' }} />
              </div>
              
              <div className="max-w-2xl space-y-4">
                <motion.div
                  key={philosophicalIndex}
                  initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
                  transition={{ duration: 1 }}
                  className="space-y-6"
                >
                  <p className="font-serif italic text-4xl sm:text-6xl text-red-650 tracking-wide font-bold animate-pulse uppercase leading-tight filter drop-shadow-[0_0_20px_rgba(220,38,38,0.5)]">
                    “{philosophicalMessages[philosophicalIndex]}”
                  </p>
                </motion.div>
              </div>

              <p className="text-[10px] text-zinc-550 tracking-[0.25em] font-mono animate-pulse uppercase">
                Click anywhere to bypass // Hamood sees your desperation
              </p>
            </div>
          )}

          {/* Reboot overlay loop transition */}
          {activeCursedScreen === 'reboot' && (
            <div className="fixed inset-0 bg-black flex flex-col justify-center items-center space-y-4 z-[13000]">
              <div className="w-8 h-8 rounded-full border-2 border-zinc-850 border-t-zinc-200 animate-spin" />
              <span className="font-mono text-[10px] tracking-[0.3em] text-zinc-500 uppercase animate-pulse">
                Restarting Motivation.exe...
              </span>
            </div>
          )}

        </div>
      )}

      {/* ==========================================
          PHASE 5 - GLOBAL HAMOOD TAKEOVER SCREEN
          ========================================== */}
      {isTakeoverActive && (
        <div 
          onClick={handleFakeEscapeAttack}
          className="fixed inset-0 z-[99999] bg-black select-none flex flex-col items-center justify-center overflow-hidden strobe-flash-bg extreme-vibrate-screen cursor-crosshair"
          id="global-takeover-overlay"
        >
          {/* Dynamic CRT scanning retro raster filters */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,_rgba(0,0,0,0.25)_50%),_linear-gradient(90deg,_rgba(255,0,0,0.06),_rgba(0,255,0,0.02),_rgba(0,0,255,0.06))] bg-[size:100%_4px,_6px_100%] pointer-events-none z-10" />

          {/* Raining/Cascading Swarm of Hamood heads falling */}
          {rainingHamoods.map((r) => (
            <div
              key={r.id}
              style={{
                position: 'fixed',
                left: `${r.x}px`,
                top: `${r.y}px`,
                width: `${110 * r.scale}px`,
                height: `${110 * r.scale}px`,
                transform: `rotate(${r.rot}deg)`,
                pointerEvents: 'none',
                zIndex: 50,
              }}
              className="transition-transform duration-75"
            >
              <img 
                src={cursedHamoodUrl} 
                alt="Raining Hamood" 
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain filter hue-rotate-15 saturate-200 brightness-110 drop-shadow-[0_0_10px_rgba(255,0,0,0.6)]" 
              />
            </div>
          ))}

          {/* Concentric spinning background graphics overlay */}
          <div className="absolute w-[95vw] h-[95vw] max-w-[800px] max-h-[800px] opacity-25 pointer-events-none z-0">
            <img 
              src={cursedHamoodUrl} 
              alt="Central spinning master"
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain hamood-spin-crazy filter brightness-125 saturate-200" 
            />
          </div>

          <div className="relative z-50 text-center px-4 max-w-4xl space-y-8 pointer-events-auto">
            {/* Extreme pulsing title */}
            <motion.h1 
              animate={{
                scale: [1, 1.25, 0.9, 1.3, 1],
                rotate: [0, -6, 6, -3, 0],
              }}
              transition={{
                duration: 1.0,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="font-display font-black text-6xl sm:text-8xl tracking-[0.16em] neon-terror-title filter drop-shadow-[0_0_25px_rgba(255,0,0,1)] uppercase text-white"
            >
              HAMOOD IS FOREVER
            </motion.h1>

            <div>
              <p className="font-mono text-xs sm:text-sm tracking-[0.25em] text-red-500 animate-pulse bg-black/85 px-6 py-3.5 rounded-lg border border-red-900 inline-block">
                SYSTEM OVERRIDDEN // MINDSET CONVERTED TO HABIBI
              </p>
            </div>

            {/* Overridden CTA buttons that trigger heavy loops */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  globalSynth.triggerScreamAttack();
                  triggerSpawnBouncingHead(10);
                  triggerSpawnRainingHamood(10);
                  setIsJumpscare(true);
                  setTimeout(() => setIsJumpscare(false), 900);
                }}
                className="w-full sm:w-auto px-9 py-3.5 bg-red-650 hover:bg-red-650/90 border-2 border-black text-white font-mono text-xs tracking-widest font-bold uppercase cursor-pointer rounded-lg shadow-[4px_4px_0_#000] active:translate-x-1 active:translate-y-1 transition-all"
              >
                [ MUTE PROTOCOL ]
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  globalSynth.triggerScreamAttack();
                  triggerSpawnBouncingHead(12);
                  triggerSpawnRainingHamood(15);
                  setIsJumpscare(true);
                  setTimeout(() => setIsJumpscare(false), 900);
                }}
                className="w-full sm:w-auto px-9 py-3.5 bg-white hover:bg-stone-50 border-2 border-black text-black font-mono text-xs tracking-widest font-bold uppercase cursor-pointer rounded-lg shadow-[4px_4px_0_#000] active:translate-x-1 active:translate-y-1 transition-all"
              >
                [ FORCE SYSTEM EXIT ]
              </button>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleResetToOriginalCleanWebsite();
              }}
              className="block mx-auto mt-4 text-[9px] font-mono tracking-widest text-[#666] hover:text-red-400 opacity-60 hover:opacity-100 transition-all uppercase"
            >
              [ Dev Escape: Purge All Infection ]
            </button>
          </div>
        </div>
      )}

      {/* 5. FULLSCREEN VIDEO TAKEOVER */}
      <HamoodVideoTakeover 
        isActive={isTakeoverActive} 
        onComplete={handleVideoTakeoverComplete} 
      />

      {/* 6. ENDING REBOOT SCREEN */}
      {isRebooting && (
        <div className="fixed inset-0 bg-black flex flex-col justify-center items-center space-y-4 z-[9999999] font-mono select-none">
          {rebootState === 'spinner' && (
            <>
              <div className="w-8 h-8 rounded-full border-2 border-zinc-800 border-t-zinc-200 animate-spin" />
              <span className="font-mono text-xs tracking-[0.3em] text-zinc-400 uppercase animate-pulse">
                Restarting Motivation.exe...
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
