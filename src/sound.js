// A simple sound player using the Web Audio API
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

export function playSound(type) {
  if (!audioContext) return;

  // Create an oscillator (generates a sound wave)
  const oscillator = audioContext.createOscillator();
  // Create a gain node (controls the volume)
  const gainNode = audioContext.createGain();

  // Connect the oscillator to the gain node, and the gain node to the speakers
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  // Set the volume
  gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);

  // Set sound properties based on the type of event
  switch (type) {
    case 'move':
      oscillator.type = 'sine'; // A smooth, clean sound
      oscillator.frequency.setValueAtTime(440.0, audioContext.currentTime); // A standard A4 note
      break;
    case 'capture':
      oscillator.type = 'triangle'; // A slightly harsher sound
      oscillator.frequency.setValueAtTime(220.0, audioContext.currentTime); // An A3 note (lower pitch)
      break;
    case 'check':
      oscillator.type = 'sawtooth'; // A sharp, buzzing sound
      oscillator.frequency.setValueAtTime(880.0, audioContext.currentTime); // An A5 note (higher pitch)
      break;
    default:
      return; // Do nothing if the type is unknown
  }

  // Start the sound now
  oscillator.start(audioContext.currentTime);
  // Stop the sound after a very short duration (50ms)
  oscillator.stop(audioContext.currentTime + 0.05);
}
