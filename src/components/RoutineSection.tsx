import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Surface } from './Surface';
import { RoutineCard } from './RoutineCard';
import { useRoutines } from '@/hooks/useRoutines';
import { useRoutineCompletionStates } from '@/hooks/useRoutineCompletionStates';
import { useRoutineDayProgress } from '@/hooks/useRoutineDayProgress';
import {
  groupRoutinesForDashboard,
  formatRoutineProgress,
  disclosureLabel,
} from '@/lib/utils/routine-dashboard';
import { getTimeBlock, todayLocalDate, type TimeBlock } from '@/lib/utils/timestamp';
import { colors, typeScale, spacing, lineHeight } from '@/constants/theme';
import type { Routine } from '@/lib/db/query-types';

/**
 * The Routines section of the Tend dashboard.
 *
 * Three states: an add row on its own when there are no Routines; full cards
 * for whatever is due now; and a single collapsed disclosure row holding
 * everything completed or still ahead. Nothing here is a to-do list — a
 * Routine is never labelled overdue, and anything in the disclosure can still
 * be completed early.
 *
 * No completion state is persisted by this component. Everything is derived
 * from routine_completion rows plus the current time block and today's date.
 */
export function RoutineSection() {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  // Recomputed on focus so a block or date rollover that happened while the
  // app was backgrounded is picked up. The completion reads refresh themselves
  // on focus — see useRoutineKeyedRead.
  const [nowBlock, setNowBlock] = useState<TimeBlock>(() => getTimeBlock());
  const [today, setToday] = useState(() => todayLocalDate());

  useFocusEffect(
    useCallback(() => {
      setNowBlock(getTimeBlock());
      setToday(todayLocalDate());
    }, [])
  );

  // The block is deliberately not live-ticking — it updates on focus only. A
  // dashboard that reshuffles itself under the user's thumb is worse than one
  // that is briefly stale, and this screen is re-focused constantly in use.

  // errors are intentionally ignored: if any read fails the section degrades to
  // just "+ Add Routine" so the user can still navigate. No error UI here.
  const { routines: allRoutines, loading } = useRoutines();

  // Defensive: useRoutines already excludes archived Routines by default, but
  // an archived Routine must never surface on the dashboard even if that
  // default changes.
  const routines = useMemo(() => allRoutines.filter((r) => !r.archived), [allRoutines]);

  // getRoutineCompletionState needs a scheduleable block, and Night is not one.
  // Evening is the nearest preceding window.
  //
  // Known edge case, accepted: a Routine with zero configured blocks completed
  // between 22:00 and 04:59 falls outside the Evening window (18:00–21:59) and
  // reads as due again. Block-scheduled Routines are unaffected because the
  // fully_done check counts all of today's completions regardless of block.
  // Fixing it properly means teaching getRoutineCompletionState about Night.
  const stateBlock = nowBlock === 'Night' ? 'Evening' : nowBlock;

  const { states, loading: statesLoading } = useRoutineCompletionStates(
    routines,
    stateBlock,
    today
  );
  const { progress } = useRoutineDayProgress(routines, today);

  const { dueNow, later, completed } = useMemo(
    () => groupRoutinesForDashboard(routines, states, nowBlock),
    [routines, states, nowBlock]
  );

  function progressTextFor(routine: Routine): string | null {
    return formatRoutineProgress(progress[routine.id], routine.timeBlocks);
  }

  function openComplete(routine: Routine) {
    router.push(`/routine/${routine.id}/complete`);
  }

  const label = disclosureLabel(completed.length, later.length);
  const collapsedRoutines = [...completed, ...later];

  return (
    <View style={styles.section}>
      {!loading &&
        dueNow.map((routine) => (
          <RoutineCard
            key={routine.id}
            routine={routine}
            progressText={progressTextFor(routine)}
            onPress={() => openComplete(routine)}
            testID={`routine-card-${routine.id}`}
          />
        ))}

      {/* Gated on the state read too: without a state every Routine parks in
          "later", so an unstated section would flash a Later row that is
          simply wrong. Costs the cards nothing — dueNow is empty until this
          read resolves either way. */}
      {!loading && !statesLoading && label !== null && (
        <>
          <Pressable
            onPress={() => setExpanded((e) => !e)}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ expanded }}
            testID="routine-section-disclosure"
            style={styles.disclosureRow}
          >
            <Text style={styles.disclosureLabel}>{label}</Text>
            <Text style={styles.disclosureIcon}>{expanded ? '▲' : '▼'}</Text>
          </Pressable>

          {expanded &&
            collapsedRoutines.map((routine) => (
              <RoutineCard
                key={routine.id}
                routine={routine}
                progressText={progressTextFor(routine)}
                onPress={() => openComplete(routine)}
                variant="compact"
                testID={`routine-collapsed-row-${routine.id}`}
              />
            ))}
        </>
      )}

      {/* Always available, even while loading — the create path should never
          depend on a read succeeding. */}
      {/* Pressable outside Surface so the whole card is the tap target, not
          just the text inside its padding. Matches RoutineCard. */}
      <Pressable
        onPress={() => router.push('/routine/create')}
        accessibilityRole="button"
        accessibilityLabel="Add Routine"
        testID="routine-section-add-button"
      >
        <Surface style={styles.addRow} testID="routine-section-add-row">
          <Text style={styles.interactiveLabel}>+ Add Routine</Text>
        </Surface>
      </Pressable>
    </View>
  );
}

const labelMediumText = {
  fontFamily: typeScale.labelMedium.family,
  fontSize: typeScale.labelMedium.size,
  lineHeight: lineHeight(typeScale.labelMedium),
};

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.sectionGap,
  },
  disclosureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.elementGap,
  },
  disclosureLabel: {
    ...labelMediumText,
    color: colors.chrome,
  },
  disclosureIcon: {
    fontSize: 12,
    color: colors.chrome,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  interactiveLabel: {
    ...labelMediumText,
    color: colors.interactive,
  },
});
