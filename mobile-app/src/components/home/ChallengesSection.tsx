import React, { useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import {
  Trophy,
  Clock,
  Target,
  Users,
  Calendar,
  Zap,
} from 'lucide-react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { homeStyles } from '@/styles/homeStyles';

// Types
interface Challenge {
  _id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'social' | 'event' | 'special';
  xpReward: number;
  progress: number;
  goal: number;
  expiresAt: string;
}

interface ChallengesSectionProps {
  challenges: Challenge[];
  onChallengePress: (challengeId: string) => void;
  onSeeAll: () => void;
}

// Get challenge gradient colors based on type
const getChallengeGradient = (type: Challenge['type']): [string, string] => {
  switch (type) {
    case 'daily':
      return ['#F59E0B', '#D97706'];
    case 'weekly':
      return ['#8B5CF6', '#7C3AED'];
    case 'social':
      return ['#10B981', '#059669'];
    case 'event':
      return ['#06B6D4', '#0891B2'];
    case 'special':
      return ['#EF4444', '#DC2626'];
    default:
      return ['#6B7280', '#4B5563'];
  }
};

// Get challenge icon based on type
const getChallengeIcon = (type: Challenge['type'], size: number = 24) => {
  switch (type) {
    case 'daily':
      return <Calendar size={size} color="white" />;
    case 'weekly':
      return <Target size={size} color="white" />;
    case 'social':
      return <Users size={size} color="white" />;
    case 'event':
      return <Trophy size={size} color="white" />;
    case 'special':
      return <Zap size={size} color="white" />;
    default:
      return <Trophy size={size} color="white" />;
  }
};

// Calculate time remaining
const getTimeRemaining = (expiresAt: string): string => {
  const now = new Date().getTime();
  const expiry = new Date(expiresAt).getTime();
  const diff = expiry - now;

  if (diff <= 0) return 'Expirado';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

// Challenge Card Component
const ChallengeCard: React.FC<{
  challenge: Challenge;
  index: number;
  onPress: () => void;
}> = ({ challenge, index, onPress }) => {
  const progress = useMemo(
    () => Math.min((challenge.progress / challenge.goal) * 100, 100),
    [challenge.progress, challenge.goal]
  );

  const circumference = 2 * Math.PI * 25;
  const progressStroke = (progress / 100) * circumference;

  return (
    <Animated.View entering={FadeInDown.delay(index * 100)}>
      <TouchableOpacity
        style={homeStyles.challengeCard}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={getChallengeGradient(challenge.type)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={homeStyles.challengeGradient}
        >
          {/* Challenge Content */}
          <View style={homeStyles.challengeContent}>
            {/* Left Side - Icon & Info */}
            <View style={homeStyles.challengeLeft}>
              <View style={homeStyles.challengeIcon}>
                {getChallengeIcon(challenge.type, 24)}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={homeStyles.challengeTitle} numberOfLines={1}>
                  {challenge.title}
                </Text>
                <Text style={homeStyles.challengeReward}>
                  +{challenge.xpReward} XP
                </Text>
              </View>
            </View>

            {/* Right Side - Progress Circle */}
            <View style={homeStyles.challengeRight}>
              <Svg width={60} height={60}>
                {/* Background circle */}
                <Circle
                  cx={30}
                  cy={30}
                  r={25}
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth={4}
                  fill="none"
                />
                {/* Progress circle */}
                <Circle
                  cx={30}
                  cy={30}
                  r={25}
                  stroke="white"
                  strokeWidth={4}
                  fill="none"
                  strokeDasharray={`${progressStroke} ${circumference}`}
                  strokeLinecap="round"
                  rotation="-90"
                  origin="30, 30"
                />
              </Svg>
              <Text
                style={[
                  homeStyles.progressText,
                  {
                    position: 'absolute',
                    fontSize: 13,
                    fontWeight: '700',
                  },
                ]}
              >
                {challenge.progress}/{challenge.goal}
              </Text>
            </View>
          </View>

          {/* Challenge Footer - Time Remaining */}
          <View style={homeStyles.challengeFooter}>
            <Clock size={14} color="rgba(255,255,255,0.8)" />
            <Text style={homeStyles.timeRemaining}>
              {getTimeRemaining(challenge.expiresAt)}
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Main Component
export const ChallengesSection: React.FC<ChallengesSectionProps> = ({
  challenges,
  onChallengePress,
  onSeeAll,
}) => {
  // Handle challenge press
  const handleChallengePress = useCallback(
    (challengeId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChallengePress(challengeId);
    },
    [onChallengePress]
  );

  // Handle see all
  const handleSeeAll = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSeeAll();
  }, [onSeeAll]);

  if (challenges.length === 0) {
    return null;
  }

  return (
    <View style={homeStyles.section}>
      {/* Section Header */}
      <View style={homeStyles.sectionHeader}>
        <View style={homeStyles.challengeHeaderLeft}>
          <Trophy size={24} color="#F59E0B" />
          <Text style={homeStyles.sectionTitle}>Desafíos Activos</Text>
        </View>

        <TouchableOpacity onPress={handleSeeAll} activeOpacity={0.7}>
          <Text style={homeStyles.seeAllText}>Ver todos →</Text>
        </TouchableOpacity>
      </View>

      {/* Challenges List */}
      {challenges.slice(0, 3).map((challenge, index) => (
        <ChallengeCard
          key={challenge._id}
          challenge={challenge}
          index={index}
          onPress={() => handleChallengePress(challenge._id)}
        />
      ))}
    </View>
  );
};

export default ChallengesSection;
