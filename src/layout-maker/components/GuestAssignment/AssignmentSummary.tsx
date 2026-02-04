/**
 * Assignment Summary Component
 *
 * Persistent summary bar showing guest assignment progress:
 * - Assigned/total seats count
 * - Progress bar visualization
 * - Remaining seats count
 */

import React from 'react';
import type { DietaryType } from '../../types/elements';
import { DIETARY_ICONS, type NonNullDietaryType } from '../../types/guests';

interface AssignmentSummaryProps {
  totalSeats: number;
  assignedCount: number;
  occupancyRate: number;
  className?: string;
}

export const AssignmentSummary: React.FC<AssignmentSummaryProps> = ({
  totalSeats,
  assignedCount,
  occupancyRate,
  className = '',
}) => {
  const unassignedCount = totalSeats - assignedCount;
  const progressPercent = Math.min(100, Math.max(0, occupancyRate));

  const getProgressColor = () => {
    if (progressPercent < 30) return '#EF4444';
    if (progressPercent < 60) return '#F59E0B';
    if (progressPercent < 90) return '#3B82F6';
    return '#10B981';
  };

  const getStatusText = () => {
    if (totalSeats === 0) return 'No seats';
    if (progressPercent === 0) return 'Not started';
    if (progressPercent < 30) return 'Just started';
    if (progressPercent < 60) return 'In progress';
    if (progressPercent < 90) return 'Almost done';
    return 'Complete';
  };

  return (
    <div
      className={`flex items-center gap-4 px-4 py-2 bg-white border-b ${className}`}
      style={{
        borderColor: '#E5E7EB',
        minHeight: '48px',
      }}
    >
      {/* Seating count */}
      <div className="flex items-center gap-2">
        <span className="text-sm" style={{ color: '#6B7280' }}>
          Seating:
        </span>
        <span className="font-medium text-sm" style={{ color: '#1F2937' }}>
          {assignedCount}/{totalSeats} assigned
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="flex-1 max-w-xs h-2 rounded-full overflow-hidden"
        style={{ backgroundColor: '#E5E7EB' }}
      >
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${progressPercent}%`,
            backgroundColor: getProgressColor(),
          }}
        />
      </div>

      {/* Remaining count */}
      <div className="flex items-center gap-3">
        <span className="text-sm" style={{ color: '#9CA3AF' }}>
          {unassignedCount} remaining
        </span>
        <span
          className="text-xs px-2 py-1 rounded-full font-medium"
          style={{
            backgroundColor: `${getProgressColor()}20`,
            color: getProgressColor(),
          }}
        >
          {getStatusText()}
        </span>
      </div>
    </div>
  );
};

interface MealSummaryProps {
  mealCounts: Record<NonNullDietaryType, number>;
  className?: string;
}

export const MealSummary: React.FC<MealSummaryProps> = ({
  mealCounts,
  className = '',
}) => {
  const totalMeals = Object.values(mealCounts).reduce((sum, count) => sum + count, 0);

  if (totalMeals === 0) {
    return null;
  }

  return (
    <div
      className={`flex items-center gap-2 text-xs ${className}`}
      style={{ color: '#6B7280' }}
    >
      <span>Meals:</span>
      {Object.entries(mealCounts).map(([type, count]) => {
        if (count === 0) return null;
        const dietaryType = type as NonNullDietaryType;
        const emoji = DIETARY_ICONS[dietaryType] || '🍽️';
        return (
          <span key={type}>
            {count}{emoji}
          </span>
        );
      })}
    </div>
  );
};

export default AssignmentSummary;
