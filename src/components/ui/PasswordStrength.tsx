"use client";

/**
 * PasswordStrength — visual + textual hints under a password field.
 *
 * Runs on every keystroke (cheap regex checks — no heavyweight zxcvbn).
 * Hidden when the field is empty so it doesn't shout at the user before
 * they've typed anything.
 *
 * Score buckets:
 *   0 — none / very weak       → red
 *   1 — weak                   → orange
 *   2 — fair                   → yellow
 *   3 — good                   → blue
 *   4 — strong                 → green
 *
 * Rules contributing to the score:
 *   • length ≥ 8
 *   • length ≥ 12
 *   • mix of upper + lower
 *   • at least one digit
 *   • at least one symbol
 */

export interface PasswordStrengthProps {
  value: string;
  className?: string;
}

interface RuleCheck {
  label: string;
  ok: boolean;
}

export function evaluatePassword(pwd: string): {
  score: 0 | 1 | 2 | 3 | 4;
  rules: RuleCheck[];
} {
  const rules: RuleCheck[] = [
    { label: "8+ characters", ok: pwd.length >= 8 },
    { label: "Upper & lower case", ok: /[a-z]/.test(pwd) && /[A-Z]/.test(pwd) },
    { label: "A number", ok: /\d/.test(pwd) },
    { label: "A symbol", ok: /[^A-Za-z0-9]/.test(pwd) },
  ];
  let score = rules.reduce((acc, r) => acc + (r.ok ? 1 : 0), 0);
  if (pwd.length >= 12 && score >= 3) score = Math.min(4, score + 1);
  // Squash the score into the union type
  return { score: Math.min(4, score) as 0 | 1 | 2 | 3 | 4, rules };
}

const SCORE_LABEL = ["Too short", "Weak", "Fair", "Good", "Strong"];
// "Fair" uses --amber-warn (not --orange-500) — orange-500 is the brand CTA
// color used on every "Book"/"Pay"/"Sign up" button; reusing it here would
// have this hint read as an action prompt instead of a caution signal.
const SCORE_COLOR = [
  "bg-[var(--red-err)]",
  "bg-[var(--red-err)]",
  "bg-[var(--amber-warn)]",
  "bg-[var(--green-ok)]",
  "bg-[var(--green-ok)]",
];
const TEXT_COLOR = [
  "text-[var(--red-err)]",
  "text-[var(--red-err)]",
  "text-[var(--amber-warn)]",
  "text-[var(--green-ok)]",
  "text-[var(--green-ok)]",
];

export default function PasswordStrength({ value, className = "" }: PasswordStrengthProps) {
  if (!value) return null;
  const { score, rules } = evaluatePassword(value);
  const filledBars = score === 0 ? 0 : score; // 0–4 visible segments

  return (
    <div className={`mt-2 ${className}`}>
      {/* 4 strength bars */}
      <div className="flex gap-1.5 mb-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i < filledBars ? SCORE_COLOR[score] : "bg-[var(--cream-300)]"
            }`}
          />
        ))}
      </div>
      <div className={`text-[0.75rem] font-semibold ${TEXT_COLOR[score]}`}>
        {SCORE_LABEL[score]}
      </div>
      {score < 4 && (
        <ul className="mt-1 space-y-0.5">
          {rules
            .filter((r) => !r.ok)
            .map((r) => (
              <li
                key={r.label}
                className="text-[0.72rem] text-[var(--text-muted)]"
              >
                · {r.label}
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
