import { useState, useEffect, useRef, useCallback } from 'react';

export default function useSpeechRecognition({ onTranscriptChange }) {
  const [isSupported, setIsSupported] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);
  
  const recognitionRef = useRef(null);
  
  // Track intentional vs automatic stops to restart automatically
  const isIntentionalStopRef = useRef(true);
  
  // Keep the latest callback in a ref to prevent effect re-runs
  const changeCallbackRef = useRef(onTranscriptChange);
  useEffect(() => {
    changeCallbackRef.current = onTranscriptChange;
  }, [onTranscriptChange]);

  // To preserve transcript properly across long pauses / browser-imposed recognition restarts
  const accumulatedTranscriptRef = useRef(''); 
  const currentSessionTranscriptRef = useRef('');

  useEffect(() => {
    // Check for browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true; 
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event) => {
      let finalSegment = '';
      let interimSegment = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptChunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalSegment += transcriptChunk;
        } else {
          interimSegment += transcriptChunk;
        }
      }
      
      currentSessionTranscriptRef.current += finalSegment;
      
      // Combine previously accumulated text + this session's final chunks + this session's interim 
      const fullTranscript = (
        accumulatedTranscriptRef.current + 
        currentSessionTranscriptRef.current + 
        interimSegment
      ).trim();
      
      if (changeCallbackRef.current) {
        changeCallbackRef.current(fullTranscript);
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed') {
        setError('Microphone access denied.');
        isIntentionalStopRef.current = true;
      } else if (event.error === 'network') {
        // Network drops often cause abort, but we retry if not intentional
      } else if (event.error !== 'no-speech') {
        console.error("Speech recognition error:", event.error);
      }
    };

    recognition.onend = () => {
      // If the browser stopped it automatically (due to silence/timeout) but the user 
      // didn't manually press the Stop button, automatically restart the microphone!
      if (!isIntentionalStopRef.current) {
        // Save the current session's finalized transcript into the permanent accumulator
        accumulatedTranscriptRef.current += currentSessionTranscriptRef.current;
        currentSessionTranscriptRef.current = ''; 
        
        try {
          recognition.start();
        } catch (err) {
          console.error("Auto-restart failed", err);
          setIsListening(false);
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      isIntentionalStopRef.current = true;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch(e) {}
      }
    };
  }, []);

  const startListening = useCallback(() => {
    setError(null);
    if (!isSupported) {
      setError('Voice recognition is not supported in this browser.');
      return;
    }
    
    // Clear out accumulators for the new manual session
    accumulatedTranscriptRef.current = '';
    currentSessionTranscriptRef.current = '';
    
    isIntentionalStopRef.current = false;
    
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error("Failed to start listening:", err);
      }
    }
  }, [isSupported, isListening]);

  const stopListening = useCallback(() => {
    isIntentionalStopRef.current = true;
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  const toggleListening = useCallback(() => {
      if (isListening) {
          stopListening();
      } else {
          startListening();
      }
  }, [isListening, startListening, stopListening]);

  return {
    isSupported,
    isListening,
    error,
    startListening,
    stopListening,
    toggleListening
  };
}
