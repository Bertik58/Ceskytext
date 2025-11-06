
import { GoogleGenAI, Modality } from "@google/genai";

// Fix: Per Gemini API guidelines, the API key must be obtained from process.env.API_KEY
// and the GoogleGenAI instance should be initialized with it directly. This resolves the
// 'Property 'env' does not exist on type 'ImportMeta'' error.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Escapes special XML characters in a string.
 * @param unsafe The string to escape.
 * @returns The escaped string.
 */
function escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
}

export async function generateSpeechFromText(
    text: string, 
    isMultiSpeaker: boolean = false, 
    voiceName: string = 'Puck', // Default to male voice
    pitch: number = 0
): Promise<string | null> {
    try {
        let processedText = text;
        // Use SSML for pitch control in single-speaker mode.
        // This is more robust than using a direct config parameter which caused errors.
        if (!isMultiSpeaker && pitch !== 0) {
            const safeText = escapeXml(text);
            // Use "st" for semitones, which aligns with the slider's -20 to +20 range.
            processedText = `<speak><prosody pitch="${pitch}st">${safeText}</prosody></speak>`;
        }

        const speechConfig = isMultiSpeaker
            ? {
                multiSpeakerVoiceConfig: {
                    speakerVoiceConfigs: [
                        {
                            speaker: 'Joe',
                            voiceConfig: {
                                // Based on user feedback: Puck is male
                                prebuiltVoiceConfig: { voiceName: 'Puck' } 
                            }
                        },
                        {
                            speaker: 'Jane',
                            voiceConfig: {
                                // Based on user feedback: Kore is female
                                prebuiltVoiceConfig: { voiceName: 'Kore' } 
                            }
                        }
                    ]
                }
            }
            : {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: voiceName },
                    // The 'pitch' parameter here was causing API errors, so it's removed.
                    // Pitch is now handled via SSML.
                },
            };

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: processedText }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: speechConfig,
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

        if (typeof base64Audio === 'string') {
            return base64Audio;
        }

        throw new Error("Audio data not found in API response.");

    } catch (error) {
        console.error("Error generating speech with Gemini API:", error);
        // Fix: Updated error message to be more generic and not reference a specific env var implementation.
        throw new Error("Failed to generate speech. Please check your API key and network connection.");
    }
}
