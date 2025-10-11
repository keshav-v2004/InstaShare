"use client"

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

// The sequence of messages to display during the animation
const bootSequence = [
  'Booting kernel...',
  'Initializing WebRTC peer discovery...',
  'Establishing signaling channel...',
  'Secure P2P link ready.',
  'Welcome.',
];

/**
 * A component that displays a boot-up terminal animation.
 * It calls the onFinished prop when the animation is complete.
 */
export function BootAnimation({ onFinished }: { onFinished: () => void }) {
  const [currentLine, setCurrentLine] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // If we are not at the end of the sequence, move to the next line
    if (currentLine < bootSequence.length - 1) {
      const timeout = setTimeout(() => {
        setCurrentLine(currentLine + 1);
      }, 700); // Adjust time per line (in ms)
      return () => clearTimeout(timeout);
    } else {
      // We're on the last line, so prepare to fade out
      const fadeOutTimer = setTimeout(() => {
        setIsFadingOut(true);
      }, 800);

      // Call the onFinished callback after the fade-out animation ends
      const finishedTimer = setTimeout(() => {
        onFinished();
      }, 1300); // This is 800ms wait + 500ms fade-out duration

      return () => {
        clearTimeout(fadeOutTimer);
        clearTimeout(finishedTimer);
      };
    }
  }, [currentLine, onFinished]);

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-black text-green-400 font-mono transition-opacity duration-500',
        isFadingOut ? 'opacity-0' : 'opacity-100'
      )}
    >
      <div className="w-full max-w-md p-4">
        {bootSequence.map((text, index) => (
          <p
            key={index}
            className={cn(
              'overflow-hidden whitespace-nowrap animate-typing-boot',
              // Only show and animate the current line
              index === currentLine ? 'block' : 'hidden'
            )}
            style={{ animationDuration: '0.7s' }}
          >
            {`> ${text}`}
          </p>
        ))}
      </div>
    </div>
  );
}