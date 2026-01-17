'use client';

import { useEffect, useRef } from 'react';

// Define sound types
type SoundType = 'countdown' | 'start' | 'correct' | 'wrong' | 'bell' | 'coin' | 'bomb' | 'thantai';

export default function useGameSound() {
    const audioRefs = useRef<{ [key in SoundType]?: HTMLAudioElement }>({});

    useEffect(() => {
        // Initialize audio objects
        // Note: User needs to provide files for missing sounds
        const sounds: { [key in SoundType]: string } = {
            countdown: '/sounds/countdown.mp3',
            start: '/sounds/start.mp3',
            correct: '/sounds/correct.mp3',
            wrong: '/sounds/wrong.mp3',
            bell: '/sounds/bell.mp3',
            coin: '/sounds/coin-sound.mp3',
            bomb: '/sounds/bomb-sound.mp3',
            thantai: '/sounds/than-tai-music.mp3',
        };

        Object.entries(sounds).forEach(([key, src]) => {
            const audio = new Audio(src);
            audio.preload = 'auto'; // Preload sounds
            audioRefs.current[key as SoundType] = audio;
        });

        return () => {
            // Cleanup (stop sounds if component unmounts)
            Object.values(audioRefs.current).forEach(audio => {
                audio.pause();
                audio.currentTime = 0;
            });
        };
    }, []);

    const playSound = (type: SoundType) => {
        const audio = audioRefs.current[type];
        if (audio) {
            audio.currentTime = 0;
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.log('Audio playback failed:', error);
                    // Auto-resume audio context if suspended (common in browsers)
                    /* 
                       Note: We cannot resume context here directly if we don't have access to it,
                       but standard Audio elements usually just need a user interaction first.
                       We will notify user if sound fails.
                    */
                });
            }
        }
    };

    const stopSound = (type: SoundType) => {
        const audio = audioRefs.current[type];
        if (audio) {
            audio.pause();
            audio.currentTime = 0;
        }
    };

    return { playSound, stopSound };
}
