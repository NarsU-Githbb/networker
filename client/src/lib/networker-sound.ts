let audioContext: AudioContext | null = null;

// Keep one shared context for the whole game instead of creating a new audio
// context every time a player collects an item.
function getAudioContext() {
	if (!audioContext) {
		audioContext = new AudioContext();
	}

	return audioContext;
}

// Browsers require an interaction before audio can play. The game route calls
// this from the first keyboard or pointer event to unlock the sound system.
export function unlockNetworkerAudio() {
	const context = getAudioContext();
	if (context.state === 'suspended') void context.resume();
}

function playTone(
	frequencies: number[],
	{
		duration = 0.16,
		volume = 0.06,
		type = 'sine',
	}: { duration?: number; volume?: number; type?: OscillatorType } = {},
) {
	// The game uses short synthesized tones so sound feedback stays lightweight
	// and does not require additional audio asset files.
	const context = getAudioContext();
	if (context.state === 'suspended') return;

	const gain = context.createGain();
	const oscillator = context.createOscillator();
	const now = context.currentTime;

	oscillator.type = type;
	oscillator.frequency.setValueAtTime(frequencies[0] ?? 440, now);
	frequencies.slice(1).forEach((frequency, index) => {
		oscillator.frequency.setValueAtTime(
			frequency,
			now + ((index + 1) * duration) / frequencies.length,
		);
	});

	gain.gain.setValueAtTime(0.0001, now);
	gain.gain.exponentialRampToValueAtTime(volume, now + 0.015);
	gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

	oscillator.connect(gain);
	gain.connect(context.destination);
	oscillator.start(now);
	oscillator.stop(now + duration);
}

export function playConnectionSound() {
	// Regular connections use a short, quiet notification tone.
	playTone([520, 700], { duration: 0.12, volume: 0.045 });
}

export function playPremiumSound() {
	// Premium connections get a brighter three-note reward sound.
	playTone([520, 740, 980], { duration: 0.28, volume: 0.06 });
}

export function playGameStartSound() {
	playTone([330, 494, 659], { duration: 0.36, volume: 0.05 });
}

export function playPauseSound() {
	playTone([360], { duration: 0.12, volume: 0.04, type: 'triangle' });
}

export function playResumeSound() {
	playTone([360, 540], { duration: 0.16, volume: 0.04, type: 'triangle' });
}

export function playWinSound() {
	playTone([523, 659, 784, 1047], { duration: 0.55, volume: 0.07 });
}

export function playLoseSound() {
	playTone([392, 330, 262], { duration: 0.42, volume: 0.05, type: 'triangle' });
}
