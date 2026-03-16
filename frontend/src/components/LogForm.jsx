import { useMemo, useState } from "react";

function createSpeechRecognition() {
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export default function LogForm({ onSubmit, loading }) {
  const [siteName, setSiteName] = useState("");
  const [foreman, setForeman] = useState("");
  const [updateText, setUpdateText] = useState("");
  const [photos, setPhotos] = useState([]);
  const [listening, setListening] = useState(false);

  const speechSupported = useMemo(
    () => Boolean(window.SpeechRecognition || window.webkitSpeechRecognition),
    []
  );

  function startVoiceCapture() {
    const recognition = createSpeechRecognition();
    if (!recognition) {
      return;
    }

    recognition.lang = "en-GB";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    setListening(true);

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? "";
      setUpdateText((prev) => `${prev} ${transcript}`.trim());
    };

    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognition.start();
  }

  async function submit(event) {
    event.preventDefault();
    if (!siteName || !foreman || !updateText) {
      return;
    }

    await onSubmit({ siteName, foreman, updateText, photos });
    setUpdateText("");
    setPhotos([]);
  }

  return (
    <form className="panel" onSubmit={submit}>
      <div className="panel__head">
        <h2>Daily Log Input</h2>
        <p>Capture updates through text, voice, and photos.</p>
      </div>

      <div className="grid">
        <label>
          Site Name
          <input value={siteName} onChange={(e) => setSiteName(e.target.value)} required />
        </label>
        <label>
          Foreman Name
          <input value={foreman} onChange={(e) => setForeman(e.target.value)} required />
        </label>
      </div>

      <label>
        Update Notes
        <textarea
          value={updateText}
          onChange={(e) => setUpdateText(e.target.value)}
          placeholder="Describe progress, delays, incidents, labor, materials..."
          required
        />
      </label>

      <div className="actions">
        <label className="file-upload btn btn--secondary">
          Attach Photos
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => setPhotos(Array.from(e.target.files ?? []))}
          />
        </label>
        {speechSupported ? (
          <button
            type="button"
            onClick={startVoiceCapture}
            className="btn btn--ghost"
            aria-live="polite"
          >
            {listening ? "Listening..." : "Use Voice Input"}
          </button>
        ) : (
          <span className="hint">Voice input is not supported in this browser.</span>
        )}
      </div>

      {photos.length > 0 ? <p className="hint">{photos.length} photo(s) attached.</p> : null}

      <button className="btn btn--primary" type="submit" disabled={loading}>
        {loading ? "Generating log..." : "Generate Structured Log"}
      </button>
    </form>
  );
}
