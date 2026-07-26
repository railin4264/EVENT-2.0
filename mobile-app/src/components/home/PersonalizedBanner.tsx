import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowRight,
  Zap,
  Sparkles,
  Trophy,
  Clock,
} from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { homeStyles } from '@/styles/homeStyles';

// Types
interface User {
  _id: string;
  firstName: string;
  daysActive: number;
  streak: number;
  xp: number;
  profileProgress: number;
}

interface Challenge {
  _id: string;
  title: string;
  description: string;
  xpReward: number;
  progress: number;
  goal: number;
  expiresAt: string;
}

interface PersonalizedBannerProps {
  user: User;
  activeChallenge?: Challenge;
}

// Variant A - Welcome Banner (New Users < 7 days)
const WelcomeBanner: React.FC<{ user: User }> = ({ user }) => {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/profile/edit');
  };

  return (
    <Animated.View
      entering={FadeIn}
      exiting={FadeOut}
      style={homeStyles.bannerContainer}
    >
      <LinearGradient
        colors={['#8B5CF6', '#7C3AED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 16 }}
      >
        <View style={homeStyles.bannerContent}>
          <View style={homeStyles.bannerLeft}>
            <Text style={homeStyles.bannerEmoji}>👋</Text>
            <View>
              <Text style={homeStyles.bannerTitle}>
                ¡Bienvenido, {user.firstName}!
              </Text>
              <Text style={homeStyles.bannerSubtitle}>
                Completa tu perfil y gana 100 XP
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={homeStyles.bannerCTA}
            onPress={handlePress}
            activeOpacity={0.7}
          >
            <ArrowRight size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* Progress bar */}
        <View style={homeStyles.progressContainer}>
          <Animated.View
            style={[
              homeStyles.progressBar,
              { width: `${user.profileProgress}%` },
            ]}
          />
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

// Variant B - Streak Banner (Active Users with Streak)
const StreakBanner: React.FC<{ user: User }> = ({ user }) => {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/profile');
  };

  return (
    <Animated.View
      entering={FadeIn}
      exiting={FadeOut}
      style={homeStyles.bannerContainer}
    >
      <TouchableOpacity activeOpacity={0.9} onPress={handlePress}>
        <LinearGradient
          colors={['#10B981', '#059669']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 16 }}
        >
          <View style={homeStyles.bannerContent}>
            <View style={homeStyles.streakInfo}>
              <Zap size={28} color="#FCD34D" fill="#FCD34D" />
              <View>
                <Text style={homeStyles.streakNumber}>{user.streak} días</Text>
                <Text style={homeStyles.streakLabel}>¡Racha activa!</Text>
              </View>
            </View>

            <View style={homeStyles.xpBadge}>
              <Sparkles size={16} color="#FCD34D" />
              <Text style={homeStyles.xpText}>{user.xp} XP</Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Variant C - Challenge Banner (Active Challenge)
const ChallengeBanner: React.FC<{ challenge: Challenge }> = ({ challenge }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const expiry = new Date(challenge.expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft('Expirado');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${minutes}m`);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [challenge.expiresAt]);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/challenges/${challenge._id}`);
  };

  return (
    <Animated.View
      entering={FadeIn}
      exiting={FadeOut}
      style={homeStyles.bannerContainer}
    >
      <TouchableOpacity activeOpacity={0.9} onPress={handlePress}>
        <LinearGradient
          colors={['#F59E0B', '#D97706']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 16 }}
        >
          <View style={homeStyles.bannerContent}>
            <View style={homeStyles.challengeInfo}>
              <Trophy size={24} color="white" />
              <View style={homeStyles.challengeText}>
                <Text style={homeStyles.challengeTitle}>
                  {challenge.title}
                </Text>
                <Text style={homeStyles.challengeDescription}>
                  {challenge.description} +{challenge.xpReward} XP
                </Text>
              </View>
            </View>

            <View style={homeStyles.challengeProgress}>
              <Text style={homeStyles.progressText}>
                {challenge.progress}/{challenge.goal}
              </Text>
            </View>
          </View>

          {/* Timer countdown */}
          <View style={homeStyles.timerContainer}>
            <Clock size={12} color="rgba(255,255,255,0.7)" />
            <Text style={homeStyles.timerText}>Expira en {timeLeft}</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Default Banner (Fallback)
const DefaultBanner: React.FC<{ user: User }> = ({ user }) => {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(tabs)');
  };

  return (
    <Animated.View
      entering={FadeIn}
      exiting={FadeOut}
      style={homeStyles.bannerContainer}
    >
      <TouchableOpacity activeOpacity={0.9} onPress={handlePress}>
        <LinearGradient
          colors={['#06B6D4', '#0891B2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 16 }}
        >
          <View style={homeStyles.bannerContent}>
            <View style={homeStyles.bannerLeft}>
              <Text style={homeStyles.bannerEmoji}>🎉</Text>
              <View>
                <Text style={homeStyles.bannerTitle}>
                  ¡Hola, {user.firstName}!
                </Text>
                <Text style={homeStyles.bannerSubtitle}>
                  Descubre eventos increíbles hoy
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={homeStyles.bannerCTA}
              activeOpacity={0.7}
            >
              <ArrowRight size={20} color="white" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Main PersonalizedBanner Component with Logic
export const PersonalizedBanner: React.FC<PersonalizedBannerProps> = ({
  user,
  activeChallenge,
}) => {
  // Priority logic:
  // 1. New users (< 7 days) → Welcome Banner
  // 2. Active challenge → Challenge Banner
  // 3. Active streak → Streak Banner
  // 4. Default → Default Banner

  if (user.daysActive < 7) {
    return <WelcomeBanner user={user} />;
  }

  if (activeChallenge) {
    return <ChallengeBanner challenge={activeChallenge} />;
  }

  if (user.streak > 0) {
    return <StreakBanner user={user} />;
  }

  return <DefaultBanner user={user} />;
};

export default PersonalizedBanner;
