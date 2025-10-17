import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from 'src/theme/ThemeProvider';
import { timerStyles } from '../styles/Timer.styles';

interface TimerProps {
  seconds: number;
}

const Timer: React.FC<TimerProps> = ({ seconds }) => {
  const { colors } = useTheme();
  const styles = timerStyles(colors);
  const [timeLeft, setTimeLeft] = useState(seconds);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    setTimeLeft(seconds);
    setRunning(false);
  }, [seconds]);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (running && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [running, timeLeft]);

  const formatTime = () => {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.time}>{formatTime()}</Text>
      <TouchableOpacity style={styles.button} onPress={() => setRunning((r) => !r)}>
        <Text style={styles.buttonText}>{running ? 'Pause' : 'Start'}</Text>
      </TouchableOpacity>
    </View>
  );
};

export default Timer;
