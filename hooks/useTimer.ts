
import { useState, useEffect, useRef } from 'react';

export const useTimer = (startTime?: Date) => {
  const [isActive, setIsActive] = useState(!!startTime);
  const [time, setTime] = useState(0);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (startTime) {
      const alreadyElapsed = Math.floor((new Date().getTime() - new Date(startTime).getTime()) / 1000);
      setTime(alreadyElapsed);
      setIsActive(true);
    } else {
      setIsActive(false);
      setTime(0);
    }
  }, [startTime]);
  
  useEffect(() => {
    if (isActive) {
      intervalRef.current = window.setInterval(() => {
        setTime((time) => time + 1);
      }, 1000);
    } else {
      if(intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if(intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive]);

  const handleStart = () => {
    setIsActive(true);
  };

  const handleStop = () => {
    setIsActive(false);
  };

  const handleReset = () => {
    setIsActive(false);
    setTime(0);
  }

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [hours, minutes, seconds]
      .map(v => v < 10 ? "0" + v : v)
      .join(":");
  };

  return { time, isActive, formattedTime: formatTime(time), handleStart, handleStop, handleReset };
};