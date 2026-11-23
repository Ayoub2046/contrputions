// Synthesizes a crisp, pleasant WhatsApp-style two-tone incoming message chime
// Uses Web Audio API without needing any external audio assets or network downloads

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass()
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume()
    }
    return audioCtx
  } catch {
    return null
  }
}

export function playWhatsAppChime() {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime

    // First note (bright chime tone: 880Hz - A5)
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(880, now)
    gain1.gain.setValueAtTime(0.28, now)
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.12)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.12)

    // Second note (harmonic resolve tone: 1175Hz - D6)
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(1175, now + 0.09)
    gain2.gain.setValueAtTime(0.32, now + 0.09)
    gain2.gain.exponentialRampToValueAtTime(0.005, now + 0.38)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(now + 0.09)
    osc2.stop(now + 0.38)
  } catch {
    // Audio playback blocked or not supported
  }
}
