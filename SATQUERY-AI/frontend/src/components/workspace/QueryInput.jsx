/*
  QueryInput.jsx
  ==============
  Where the user types a natural-language question. Includes a few example
  queries as clickable chips -- tapping one fills the field, which lowers the
  barrier for a first-time user and shows the kinds of questions that route to
  different specialists (VQA vs CAPTION).
*/
import useSpeechRecognition from "../../hooks/useSpeechRecognition.js";

const EXAMPLES = [
  "Is there a water body?",
  "Describe this image.",
  "What type of land cover is visible?",
  "Are there major built-up areas?",
];

export default function QueryInput({ value, onChange, onExample, disabled }) {
  const {
    isSupported,
    isListening,
    error,
    toggleListening
  } = useSpeechRecognition({
    onTranscriptChange: (transcript) => {
      // Append or replace depending on preference, replacing is safer here 
      // since interim results will just overwrite the current utterance block natively
      onChange(transcript);
    }
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label
          htmlFor="query"
          className="block font-mono text-[0.64rem] uppercase tracking-[0.2em] text-cyanDim"
        >
          Ask SatQuery
        </label>
        {error && (
            <span className="text-[0.65rem] text-red-400 font-medium" role="alert">
                {error}
            </span>
        )}
      </div>

      <div className="relative">
        <textarea
          id="query"
          rows={3}
          value={value}
          disabled={disabled || isListening}
          onChange={(e) => onChange(e.target.value)}
          placeholder={isListening ? "Listening..." : "Ask a question about this image…"}
          className={`w-full resize-none rounded-xl border bg-panel/60 pl-4 py-3.5 pr-12 text-sm text-ink placeholder:text-faint focus:outline-none disabled:opacity-60 transition-colors ${isListening ? 'border-red-400 focus:border-red-400' : 'border-line focus:border-cyan'}`}
        />
        
        {isSupported && (
          <button
            type="button"
            onClick={toggleListening}
            disabled={disabled}
            title={isListening ? "Stop recording" : "Voice query"}
            aria-label={isListening ? "Stop voice recording" : "Start voice query"}
            className={`absolute bottom-3 right-3 p-2 rounded-full flex items-center justify-center transition-all ${
                isListening 
                  ? "bg-red-500/20 text-red-500 animate-pulse pointer-events-auto" 
                  : "text-muted hover:text-cyan hover:bg-cyan/10 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted"
            }`}
          >
            {isListening ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
                    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
                    <line x1="12" y1="19" x2="12" y2="23"></line>
                    <line x1="8" y1="23" x2="16" y2="23"></line>
                </svg>
            ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                    <line x1="12" y1="19" x2="12" y2="23"></line>
                    <line x1="8" y1="23" x2="16" y2="23"></line>
                </svg>
            )}
          </button>
        )}
      </div>

      {!isSupported && (
          <p className="mt-2 text-[0.65rem] text-faint">
              Voice input is not supported in this browser. You can type your query instead.
          </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            disabled={disabled}
            onClick={() => onExample(ex)}
            className="rounded-full border border-line px-3 py-1.5 text-xs text-muted transition-colors hover:border-cyan/60 hover:text-cyan disabled:opacity-50"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
