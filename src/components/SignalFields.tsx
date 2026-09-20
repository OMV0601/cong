import { Field, Input, Textarea } from '@/components/ui/field'
import type { SignalFieldValues } from '@/lib/signal-fields'
import {
  BODY_REGIONS,
  BODY_REGION_LABELS,
  FLACC_CATEGORIES,
  FLACC_LABELS,
  type FlaccCategory,
} from '@/lib/types'
import { cn } from '@/lib/utils'

/**
 * Everything that describes a signal, minus the clip.
 *
 * Shared by the recording screen and by promoting an answered Ask, because
 * those produce the same kind of dictionary entry and the labelling has to be
 * identical — a signal that arrived via a question should be indistinguishable
 * from one filmed at the kitchen table, or the grid starts telling a stranger
 * something about provenance that it has no business telling them.
 */
export function SignalFields({
  value,
  onChange,
  showFlacc = false,
  nameHint,
}: {
  value: SignalFieldValues
  onChange: (next: SignalFieldValues) => void
  showFlacc?: boolean
  nameHint?: string
}) {
  const set = <K extends keyof SignalFieldValues>(
    key: K,
    next: SignalFieldValues[K]
  ) => onChange({ ...value, [key]: next })

  return (
    <div className="space-y-5">
      <Field
        label="What do you call this?"
        hint={nameHint ?? "A short name you'd recognise. 'Pain hum', 'Hand flick'."}
      >
        {(p) => (
          <Input
            {...p}
            required
            maxLength={60}
            value={value.label}
            onChange={(e) => set('label', e.target.value)}
          />
        )}
      </Field>

      <Field
        label="What does it mean?"
        hint="Write it for someone who has never met them. What should they do?"
      >
        {(p) => (
          <Textarea
            {...p}
            rows={3}
            value={value.meaning}
            onChange={(e) => set('meaning', e.target.value)}
            placeholder="Not the same as his anxious hum. Check stomach and ears first."
          />
        )}
      </Field>

      <fieldset>
        <legend className="text-sm font-medium">Where does it happen?</legend>
        <p className="mt-0.5 text-xs text-fg-muted">
          This is how a stranger narrows things down when they can&rsquo;t
          describe what they&rsquo;re seeing.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {BODY_REGIONS.map((region) => (
            <button
              key={region}
              type="button"
              onClick={() => set('bodyRegion', region)}
              aria-pressed={value.bodyRegion === region}
              className={cn(
                'rounded-full border px-4 py-2.5 text-sm',
                value.bodyRegion === region
                  ? 'border-accent bg-accent-soft text-fg'
                  : 'border-border bg-surface hover:bg-surface-2'
              )}
            >
              {BODY_REGION_LABELS[region]}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="flex items-start gap-2.5">
        <input
          type="checkbox"
          checked={value.isSound}
          onChange={(e) => set('isSound', e.target.checked)}
          className="mt-1 size-4"
        />
        <span>
          <span className="block text-sm font-medium">This is a sound</span>
          <span className="block text-xs text-fg-muted">
            Tick this as well as a body region — someone can hum while rocking.
          </span>
        </span>
      </label>

      <fieldset>
        <legend className="text-sm font-medium">How urgent is it?</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {(['routine', 'attention', 'urgent'] as const).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => set('urgency', level)}
              aria-pressed={value.urgency === level}
              className={cn(
                'rounded-full border px-4 py-2.5 text-sm capitalize',
                value.urgency === level
                  ? level === 'urgent'
                    ? 'border-urgent bg-urgent-soft text-urgent'
                    : 'border-accent bg-accent-soft text-fg'
                  : 'border-border bg-surface hover:bg-surface-2'
              )}
            >
              {level}
            </button>
          ))}
        </div>
      </fieldset>

      {showFlacc && (
        <Field
          label="Pain scale category (optional)"
          hint="FLACC is the scale clinicians already use for people who can't self-report. Tagging here means a nurse sees it in words they know."
        >
          {(p) => (
            <select
              {...p}
              value={value.flaccCategory ?? ''}
              onChange={(e) =>
                set(
                  'flaccCategory',
                  (e.target.value || null) as FlaccCategory | null
                )
              }
              className="h-11 w-full rounded-[var(--radius)] border border-border bg-surface px-3 text-fg"
            >
              <option value="">Not a pain signal</option>
              {FLACC_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {FLACC_LABELS[c]}
                </option>
              ))}
            </select>
          )}
        </Field>
      )}
    </div>
  )
}
