import {readFileSync, writeFileSync} from 'node:fs';
const p = 'D:/APPS/project/custom_addons/CLIENT_DATA.md';
let s = readFileSync(p, 'utf8');
const nl = s.includes('\r\n') ? '\r\n' : '\n';
const L = (a) => a.join(nl);

s = s.replace('## Rebuilding', L([
  '## The field-by-field audit',
  '',
  'Spot checks find what you think to look for. To be sure nothing was missed,',
  'every field on every model was enumerated against how many records carry it,',
  'and each gap had to be given a reason. That census found the following, none',
  'of which any earlier pass had noticed:',
  '',
  '- **Eleven objectives had no description and none of the fifteen had a',
  '  pillar** — the strategic house had a floor and a roof with nothing between.',
  '  Both are stated, a page per pillar.',
  '- **23 of the 24 indicator formulas were missing**, and the cumulation rules',
  "  for all 24: whether an indicator's periods accumulate within a year and",
  '  across years. Without them the dashboard cannot tell a running total from a',
  '  snapshot, which yields plausible wrong figures rather than obvious blanks.',
  '- **All six committees carried a frequency of "monthly"** — the field default,',
  '  not anything read. One meets quarterly and two state no cadence at all. The',
  '  default was removed so that empty now means the source does not say.',
  '- **Three initiatives had the wrong capital/operational split.** 01.02 read 25',
  '  capital and 4.6 operational against a total of 25, which reconciles with',
  '  nothing.',
  '- **The pillars had names and nothing else** — no description, no link from',
  "  the twelve strategic risks to the pillar each threatens, and none of the",
  '  mitigation steps the strategy sets against them.',
  '- **`kpi.target_value` was empty on all 24.** The dashboard falls back to it',
  '  when a period carries no target of its own, so the fallback had nothing to',
  '  fall back to.',
  '- **Six milestones carried dates derived from the wrong initiative** — a side',
  '  effect of moving them to the initiative whose card they appear on. Milestone',
  "  dates are computed from the initiative's start, and 02.04 has none, so the",
  '  dates were cleared: one derived from the wrong anchor is worse than none.',
  '',
  'Everything still empty is empty for a stated reason. In summary:',
  '',
  '| Kind of gap | Why |',
  '|---|---|',
  '| Actuals, progress, spend, variance, slippage | Nothing has been reported yet; these fill as the office uses the system |',
  '| Owners, chairs, sponsors, managers | Ownership is written as an entity, never as a named person |',
  '| English names | The decks are Arabic only |',
  '| Record codes | The source numbers milestones, projects and operational risks not at all |',
  '| Baselines for 9 indicators, targets for 5 | Written as "-", "NA", or marked pending activation |',
  '| Dates for initiative 02.04 and its milestones | The card gives none |',
  '| Budgets on 10 initiatives | Zero by design — مبادرة صفرية |',
  '| Programme and portfolio dates | Never stated |',
  '| Government project dates, codes, locations | The register gives name, owner, cost and progress only |',
  '| `albaha.project.program_id` | Points at the PMO programme model, which this strategy does not use |',
  '| `albaha.sector.kpi.sector_id` | The `domain` field already records tourism or agriculture; a sector record would duplicate a pillar |',
  '| 26 models with no records | Contracts, deliverables, lessons, issues, change requests and the rest of the delivery machinery — none of it exists yet |',
  '',
  '## Rebuilding']));

writeFileSync(p, s);
console.log('patched');
