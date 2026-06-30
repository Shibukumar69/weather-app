/**
 * Aura Weather Dashboard - Voice Assistant Module
 * Uses Web Speech Recognition and Synthesis API
 */

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export class VoiceAssistant {
  constructor(onResultCallback, onStateChangeCallback) {
    this.recognition = SpeechRecognition ? new SpeechRecognition() : null;
    this.onResult = onResultCallback;
    this.onStateChange = onStateChangeCallback; // Callback for UI feedback (listening, thinking, inactive)
    this.isListening = false;
    this.synthesis = window.speechSynthesis;
    
    if (this.recognition) {
      this.recognition.continuous = false;
      this.recognition.lang = 'en-US';
      this.recognition.interimResults = false;
      this.recognition.maxAlternatives = 1;

      // Event Bindings
      this.recognition.onstart = () => {
        this.isListening = true;
        this.onStateChange('listening');
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.onStateChange('inactive');
      };

      this.recognition.onerror = (event) => {
        console.error('[Voice Assistant] Error:', event.error);
        this.isListening = false;
        this.onStateChange('error', event.error);
      };

      this.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        console.log('[Voice Assistant] Transcript:', transcript);
        this.onStateChange('processing', transcript);
        const city = this.parseQuery(transcript);
        if (city) {
          this.onResult(city);
        } else {
          this.onStateChange('no-match', transcript);
        }
      };
    }
  }

  isSupported() {
    return this.recognition !== null;
  }

  start() {
    if (!this.recognition || this.isListening) return;
    try {
      this.recognition.start();
    } catch (e) {
      console.error(e);
    }
  }

  stop() {
    if (!this.recognition || !this.isListening) return;
    this.recognition.stop();
  }

  toggle() {
    if (this.isListening) {
      this.stop();
    } else {
      this.start();
    }
  }

  // Parse queries like "Show weather in London", "Weather in Paris", "Patna weather"
  parseQuery(transcript) {
    const text = transcript.toLowerCase().trim();
    
    // Patterns:
    // "show weather in/of london" or "weather in/of london"
    const patternInOf = /(?:show\s+)?weather\s+(?:in|of)\s+([a-zA-Z\s.-]+)/i;
    const matchInOf = text.match(patternInOf);
    if (matchInOf && matchInOf[1]) {
      return matchInOf[1].trim();
    }

    // "london weather"
    const patternSuffix = /([a-zA-Z\s.-]+)\s+weather/i;
    const matchSuffix = text.match(patternSuffix);
    if (matchSuffix && matchSuffix[1]) {
      return matchSuffix[1].trim();
    }

    // "search london" or "find london" or "go to london"
    const patternSearch = /(?:search|find|go\s+to)\s+([a-zA-Z\s.-]+)/i;
    const matchSearch = text.match(patternSearch);
    if (matchSearch && matchSearch[1]) {
      return matchSearch[1].trim();
    }

    // Fallback: just return the whole text if it looks like a single/double word city
    if (text.split(' ').length <= 3) {
      return text;
    }

    return null;
  }

  // Speak out weather info to user
  speak(text) {
    if (!this.synthesis) return;
    
    // Stop any ongoing speech
    this.synthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    // Select a pleasant English voice if available
    const voices = this.synthesis.getVoices();
    const preferredVoice = voices.find(voice => voice.lang.includes('en') && voice.name.includes('Google')) ||
                          voices.find(voice => voice.lang.includes('en'));
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    this.synthesis.speak(utterance);
  }
}
