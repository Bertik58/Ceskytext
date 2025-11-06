
import React, { useState, useRef } from 'react';
import { generateSpeechFromText } from './services/geminiService';
import { decode, decodeAudioData, pcmToWavBlob } from './utils/audioUtils';
import { SpeakerIcon, DownloadIcon } from './components/icons';
import { Spinner } from './components/Spinner';

// Semantic voice types
type Voice = 'male' | 'female';

const App: React.FC = () => {
  const [isMultiSpeaker, setIsMultiSpeaker] = useState<boolean>(false);
  const [selectedVoice, setSelectedVoice] = useState<Voice>('male');
  const [pitch, setPitch] = useState<number>(0);
  
  const singleSpeakerPlaceholder = 'Dobrý den, jak se máte? Toto je ukázka převodu textu na řeč pomocí Gemini API.';
  const multiSpeakerPlaceholder = 'Joe: Ahoj Jane, jak se máš?\nJane: Mám se skvěle, díky! A ty?';

  const [text, setText] = useState<string>(singleSpeakerPlaceholder);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (audioBlob) {
        setAudioBlob(null);
    }
  };

  const handleSpeak = async () => {
    if (!text.trim()) {
      setError('Zadejte prosím nějaký text.');
      return;
    }
    if (isLoading) return;

    setIsLoading(true);
    setError(null);
    setAudioBlob(null);

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const audioContext = audioContextRef.current;
      
      // Map semantic voice type to API voice name
      // Based on user feedback: Puck is male, Kore is female
      const apiVoiceName = selectedVoice === 'male' ? 'Puck' : 'Kore';
      
      const base64Audio = await generateSpeechFromText(text, isMultiSpeaker, apiVoiceName, pitch);

      if (base64Audio) {
        const audioBytes = decode(base64Audio);

        // Create Blob for download
        const wavBlob = pcmToWavBlob(audioBytes, 24000, 1, 16);
        setAudioBlob(wavBlob);
        
        // Decode for playback
        const audioBuffer = await decodeAudioData(audioBytes, audioContext, 24000, 1);
        
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContext.destination);
        source.start();
      } else {
        throw new Error('Nepodařilo se vygenerovat zvuk.');
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Došlo k neznámé chybě.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!audioBlob) return;
    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'speech.wav';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const handleToggleMultiSpeaker = () => {
    const newMode = !isMultiSpeaker;
    setIsMultiSpeaker(newMode);
    setText(newMode ? multiSpeakerPlaceholder : singleSpeakerPlaceholder);
    setAudioBlob(null);
    setError(null);
  };

  const handleVoiceChange = (voice: Voice) => {
    setSelectedVoice(voice);
    setAudioBlob(null);
  };

  const handlePitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPitch(Number(e.target.value));
    if (audioBlob) {
        setAudioBlob(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center font-sans p-4">
      <div className="w-full max-w-2xl mx-auto">
        <div className="bg-gray-800 border border-purple-500/30 shadow-2xl shadow-purple-500/10 rounded-2xl p-6 sm:p-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
              Český Text-to-Speech
            </h1>
            <p className="text-gray-400 mt-2">Vytvořeno s pomocí Gemini API</p>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-center">
              <label htmlFor="multi-speaker-toggle" className="flex items-center cursor-pointer">
                <span className={`mr-3 text-sm font-medium ${!isMultiSpeaker ? 'text-white' : 'text-gray-400'}`}>Jeden hlas</span>
                <div className="relative">
                  <input type="checkbox" id="multi-speaker-toggle" className="sr-only" checked={isMultiSpeaker} onChange={handleToggleMultiSpeaker} />
                  <div className="block bg-gray-600 w-14 h-8 rounded-full"></div>
                  <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${isMultiSpeaker ? 'transform translate-x-6 bg-purple-400' : ''}`}></div>
                </div>
                <span className={`ml-3 text-sm font-medium ${isMultiSpeaker ? 'text-white' : 'text-gray-400'}`}>Dialog (2 hlasy)</span>
              </label>
            </div>

            {!isMultiSpeaker && (
              <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                <div className="flex justify-center gap-4">
                    <button
                        onClick={() => handleVoiceChange('male')}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${selectedVoice === 'male' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'}`}
                    >
                        Mužský hlas
                    </button>
                    <button
                        onClick={() => handleVoiceChange('female')}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${selectedVoice === 'female' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'}`}
                    >
                        Ženský hlas
                    </button>
                </div>

                <div className="mt-4 space-y-2">
                  <label htmlFor="pitch" className="flex justify-between text-sm font-medium text-gray-400">
                    <span>Výška hlasu</span>
                    <span className="font-bold text-white bg-gray-700 px-2 py-0.5 rounded">{pitch.toFixed(1)}</span>
                  </label>
                  <input
                    id="pitch"
                    type="range"
                    min="-20"
                    max="20"
                    step="0.5"
                    value={pitch}
                    onChange={handlePitchChange}
                    disabled={isLoading}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer range-lg accent-purple-500"
                    aria-label="Nastavení výšky hlasu"
                  />
                </div>
              </div>
            )}

            <textarea
              value={text}
              onChange={handleTextChange}
              placeholder={isMultiSpeaker ? "Zadejte dialog..." : "Vložte text v českém jazyce..."}
              className="w-full h-48 p-4 bg-gray-900/50 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors duration-300 resize-none placeholder-gray-500"
              disabled={isLoading}
              aria-label="Textové pole pro zadání textu"
            />
            
            {isMultiSpeaker && (
              <p className="text-center text-xs text-gray-400 -mt-4">
                Použijte jména <strong>Joe:</strong> (mužský hlas) a <strong>Jane:</strong> (ženský hlas) pro rozlišení mluvčích.
              </p>
            )}

            {error && (
              <div className="bg-red-900/50 text-red-300 border border-red-700 p-3 rounded-lg text-sm" role="alert">
                <strong>Chyba:</strong> {error}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleSpeak}
                disabled={isLoading || !text.trim()}
                className="w-full flex-grow flex items-center justify-center gap-3 px-6 py-4 text-lg font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-4 focus:ring-purple-500/50 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:scale-100"
              >
                {isLoading ? (
                  <>
                    <Spinner />
                    <span>Generování...</span>
                  </>
                ) : (
                  <>
                    <SpeakerIcon />
                    <span>Přečíst nahlas</span>
                  </>
                )}
              </button>
              <button
                onClick={handleDownload}
                disabled={!audioBlob || isLoading}
                className="w-full sm:w-auto flex items-center justify-center gap-3 px-6 py-4 text-lg font-semibold bg-gray-900/50 border-2 border-purple-500 rounded-lg text-purple-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none hover:bg-purple-500/20 focus:outline-none focus:ring-4 focus:ring-purple-500/50 transition-all duration-300 transform hover:scale-105"
                aria-label="Stáhnout zvukový soubor"
              >
                <DownloadIcon />
                <span>Stáhnout</span>
              </button>
            </div>
          </div>
        </div>
        <footer className="text-center mt-8 text-gray-500 text-sm">
          <p>Powered by Google Gemini</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
