import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface CountdownTimerProps {
  eventDate: string | Date;
  compact?: boolean;
  showIcon?: boolean;
  style?: any;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isStarted: boolean;
  isEnded: boolean;
}

export default function CountdownTimer({
  eventDate,
  compact = false,
  showIcon = true,
  style
}: CountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isStarted: false,
    isEnded: false
  });

  useEffect(() => {
    const calculateTimeRemaining = (): TimeRemaining => {
      const now = new Date().getTime();
      const eventTime = new Date(eventDate).getTime();
      const difference = eventTime - now;

      if (difference > 0) {
        return {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000),
          isStarted: false,
          isEnded: false
        };
      } else if (difference > -24 * 60 * 60 * 1000) {
        return {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isStarted: true,
          isEnded: false
        };
      } else {
        return {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isStarted: false,
          isEnded: true
        };
      }
    };

    setTimeRemaining(calculateTimeRemaining());

    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining());
    }, 1000);

    return () => clearInterval(interval);
  }, [eventDate]);

  // Compact version for cards
  if (compact) {
    if (timeRemaining.isEnded) {
      return (
        <View style={[styles.compactContainer, styles.endedContainer, style]}>
          {showIcon && <Ionicons name="calendar-outline" size={14} color="#9E9E9E" />}
          <Text style={styles.endedText}>Finalizado</Text>
        </View>
      );
    }

    if (timeRemaining.isStarted) {
      return (
        <View style={[styles.compactContainer, styles.liveContainer, style]}>
          {showIcon && (
            <View style={styles.pulseDot}>
              <View style={styles.pulseInner} />
            </View>
          )}
          <Text style={styles.liveText}>¡En vivo ahora!</Text>
        </View>
      );
    }

    return (
      <View style={[styles.compactContainer, style]}>
        {showIcon && <Ionicons name="time-outline" size={14} color="#FF6B35" />}
        <Text style={styles.compactText}>
          En {timeRemaining.days > 0 && `${timeRemaining.days}d `}
          {timeRemaining.hours}h {timeRemaining.minutes}m
        </Text>
      </View>
    );
  }

  // Full version
  if (timeRemaining.isEnded) {
    return (
      <View style={[styles.fullContainer, style]}>
        <LinearGradient
          colors={['#E0E0E0', '#BDBDBD']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statusGradient}
        >
          <Ionicons name="calendar-outline" size={24} color="#757575" />
          <Text style={styles.statusTitle}>Evento Finalizado</Text>
        </LinearGradient>
      </View>
    );
  }

  if (timeRemaining.isStarted) {
    return (
      <View style={[styles.fullContainer, style]}>
        <LinearGradient
          colors={['#4CAF50', '#66BB6A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statusGradient}
        >
          <View style={styles.pulseWrapper}>
            <View style={[styles.pulseDot, styles.pulseLarge]}>
              <View style={[styles.pulseInner, styles.pulseLargeInner]} />
            </View>
          </View>
          <Text style={styles.statusTitle}>¡Evento en Vivo!</Text>
          <Text style={styles.statusSubtitle}>Únete ahora</Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={[styles.fullContainer, style]}>
      <Text style={styles.fullTitle}>Comienza en:</Text>

      <View style={styles.timeGrid}>
        {/* Days */}
        <LinearGradient
          colors={['#667EEA', '#764BA2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.timeBox}
        >
          <Text style={styles.timeValue}>
            {String(timeRemaining.days).padStart(2, '0')}
          </Text>
          <Text style={styles.timeLabel}>Días</Text>
        </LinearGradient>

        {/* Hours */}
        <LinearGradient
          colors={['#F093FB', '#F5576C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.timeBox}
        >
          <Text style={styles.timeValue}>
            {String(timeRemaining.hours).padStart(2, '0')}
          </Text>
          <Text style={styles.timeLabel}>Horas</Text>
        </LinearGradient>

        {/* Minutes */}
        <LinearGradient
          colors={['#4FACFE', '#00F2FE']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.timeBox}
        >
          <Text style={styles.timeValue}>
            {String(timeRemaining.minutes).padStart(2, '0')}
          </Text>
          <Text style={styles.timeLabel}>Min</Text>
        </LinearGradient>

        {/* Seconds */}
        <LinearGradient
          colors={['#43E97B', '#38F9D7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.timeBox}
        >
          <Text style={styles.timeValue}>
            {String(timeRemaining.seconds).padStart(2, '0')}
          </Text>
          <Text style={styles.timeLabel}>Seg</Text>
        </LinearGradient>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  compactText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF6B35',
  },
  endedContainer: {
    backgroundColor: '#F5F5F5',
  },
  endedText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9E9E9E',
  },
  liveContainer: {
    backgroundColor: '#E8F5E9',
  },
  liveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4CAF50',
  },

  // Pulse animation
  pulseDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFF',
  },
  pulseLarge: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  pulseLargeInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  pulseWrapper: {
    marginBottom: 12,
  },

  // Full styles
  fullContainer: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  fullTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#424242',
    marginBottom: 16,
    textAlign: 'center',
  },
  timeGrid: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  timeBox: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  timeLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFF',
    opacity: 0.9,
    textTransform: 'uppercase',
  },
  statusGradient: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 12,
  },
  statusSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFF',
    opacity: 0.9,
    marginTop: 4,
  },
});
