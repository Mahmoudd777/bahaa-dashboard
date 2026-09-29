# Client data — what the strategy decks contain, and what they do not

The dashboard is loaded from six PowerPoint decks the client supplied in
September 2026 (`Dashboard Data entry` on their SharePoint). This file records
what was taken from them, what was deliberately left, and — most importantly —
**what the decks do not contain**, so that an empty figure on the dashboard is
not mistaken for a bug.

Extraction covered every table (274 of 274 classified), every slide (796:
364 carrying records, the rest prose or analysis), all 584 note pages, all 88
charts with their embedded workbooks, and a sample of the image layer. No part
of the file format was left unread.

Two things were found only inside charts, never in a table: the first actual
values for any indicator, and each programme's spend and return by year. Both
are listed below.

## Loaded

| Records | Count | Source |
|---|---|---|
| Pillars | 5 | البيت الاستراتيجي |
| Objectives | 15 (4 vision-level, 11 under pillars) | الرؤية + البيت الاستراتيجي |
| Programmes | 5 | البرامج والمبادرات |
| Indicators | 24 | بطاقات المؤشرات |
| Indicator targets | 156 periods | بطاقات المؤشرات + جدول الطموحات |
| Target methodology | 23 indicators | الوثيقة التفصيلية |
| Initiatives | 19 | بطاقات المبادرات |
| Milestones | 165 (46 parents, 119 leaves) | جداول مشاريع ومعالم المبادرة |
| Milestone descriptions | 144 of 165 | جداول وصف المبادرة |
| Projects | 156 (145 government, 11 strategy) | الوثيقة التفصيلية |
| Operational risks | 43 | مصفوفات المخاطر |
| Strategic risks | 12 | المخاطر الرئيسية بالركيزة |
| Committees | 6 | الترتيبات التنظيمية |
| Directives and alignment | 114 | توجيهات وملاحظات اللجنة + نتائج المواءمة |
| Sector indicators | 10 | الإنتاج الزراعي + مستهدفات السياحة |
| Investment portfolio | 5 stages, 14.83bn, 49 projects | المحفظة الاستثمارية القائمة |
| GDP actuals | 4 years (2021–2024) | chart «النتائج الفعلية» |
| Programme spend and return by year | 25 rows (5 programmes × 5 years) | charts «توزيع الميزانية» and «العائد المتوقع» |
| Investment opportunities | 30, with feasibility studies | دراسات الجدوى الاقتصادية للفرص الاستثمارية |
| Challenges and their mitigation | 41, across 8 dimensions | آليات معالجة التحديات |
| Named investment projects | 20 (10 supported, 10 third-sector) | خرائط المشاريع الاستثمارية (صور) |
| Infrastructure project progress | 10 named, real percentages | خريطة أبرز مشاريع البنية التحتية (صورة) |
| Strategy record, vision and mission | 1 | البيت الاستراتيجي + بطاقة أداء (صور) |
| Pillar focus areas | 7 | البيت الاستراتيجي (صورة) |
| Initiative budgets | 19 (9 funded, 10 zero-budget) | البرامج والمبادرات + بطاقات المبادرات |
| Objective descriptions and pillars | 11 | البيت الاستراتيجي |
| Indicator formulas and cumulation rules | 24 | بطاقات المؤشرات |
| Official indicator codes (K1.1–K11.1) | 15 | البيت الاستراتيجي |

## NOT in the client files

These are absent from the source, not lost in extraction. Each one explains a
blank or a zero on the dashboard.

- **No actual values for 23 of the 24 indicators.** Every figure on the cards
  is a target or a baseline. The one exception is GDP, whose actuals for
  2021–2024 are plotted in a chart of the detailed document and nowhere else;
  its 2024 figure of 26,283 matches the baseline printed on its card, which is
  what confirms the series was read correctly. Everything after 2024 is a
  projection, including the 2025 figure, which the deck marks with an asterisk
  and which is therefore not loaded. The other 23 indicators read
  "لم يتم القياس" and their achievement percentages are zero. This remains the
  biggest gap: the dashboard cannot show performance until the office reports
  actuals.
- **No progress percentages for the strategy's own projects.** The 11 projects
  named in the initiative tables have no reported progress, so the portfolio
  health score has nothing to score and reads "لم يتم القياس".
- **The government register gives a status, not a percentage.** Each of its
  145 projects is marked منجز or جاري and nothing more. An earlier import
  turned منجز into 100% — which is what completed means — and جاري into
  **50%**, which nobody reported. That invented figure sat on 68 projects and
  pulled every aggregate toward the middle; it has been cleared, and the
  status is now kept in words instead. Fourteen projects do have a real
  percentage: ten named on a map slide, between 4.23% and 92.5%, and four
  cooperative projects.
- **No spend against budget.** Budgets are approved amounts only. There are no
  period spend records (`albaha.budget` is empty), so budget cards, CPI and
  SPI have no actuals. Government projects are the exception: a completed one
  is taken as having spent its value.
- **Ten initiatives carry no budget on purpose.** Their cards show "-" in the
  estimated-budget row, which reads like missing data. It is not: the
  programmes deck marks each of them مبادرة صفرية — delivered from the
  office's own operating budget rather than from the strategy's hundred
  million. They are flagged `zero_budget` so the dashboard does not present a
  deliberate decision as a gap. The other nine add to exactly a hundred
  million, split 12 capital against 88 operational.
- **No dates for initiative 02.04**, and no milestone table for it beyond six
  rows recovered from the detailed document.
- **Four indicators have no targets at all**: ترتيب الباحة في مؤشر جودة
  الحياة, نسبة المواقع التراثية المعاد تأهيلها (both entries), عدد خريجي
  برامج التدريب, عدد الكيانات المجتمعية المرخصة. The decks mark them as
  pending ("تمت الموائمة مع مركز أداء على استكمال بيانات المؤشر عند تفعيله").
- **Nine indicators have no baseline value**, written as "-", "NA" or a phrase
  such as "نهاية الربع الأول من 2028".
- **Milestone dates are positions, not dates.** They read "Q2 السنة الثانية",
  so calendar dates are derived from each initiative's start date. The
  original wording is kept beside them in `planned_start_label` /
  `planned_end_label`.
- **Milestone budgets cover only part of six initiatives.** 01.01, 02.05 and
  03.01 reconcile to the riyal. The other six funded initiatives — 01.02,
  01.04, 02.01, 02.02, 02.03 and 02.04 — list milestones worth less than the
  initiative holds, because their tables name some of the work and not all of
  it. The gap is the deck’s, not the extraction’s: two independent pages
  state each initiative total and they agree with each other.
- **Every zero-budget initiative has milestones worth zero**, all ten of them,
  which is a check nobody designed: the flag comes from one page and the
  milestone figures from another, and they agree without exception.
- **Only partial project-level detail for the existing investment portfolio.**
  The 14.83bn across 49 projects is given as totals per stage. Twenty of those
  projects are named on two map slides — ten the office supports and ten run
  by the region’s cooperatives — and those are loaded. The source says
  outright that its list is not exhaustive, and its named projects come to
  9.9bn against the 14bn it states in the same breath, so the rest stay
  unnamed.
- **No owners as people.** Ownership is written as an entity ("المكتب
  الاستراتيجي لتطوير منطقة الباحة"), never a named person, so no `res.partner`
  links could be made.
- **The decks contradict themselves once.** The risk "عدم توفر الخدمات
  اللوجستية" under 02.04 is printed on two pages of the same card, scored 3×2
  on one and 3×3 on the other. The first is kept. Every other one of the 43
  risks scores exactly probability × impact, on both printings.

## Reading the decks against their own contents page

The detailed document has a table of contents — ten sections and fifteen
appendices. Checking each one in turn, rather than searching for tables, is
what turned up the two largest omissions: appendix 15, the thirty investment
opportunities, and appendix 7, the challenges. Both hold their figures as
slide text, so a sweep that looked only at tables could never have found them.

Every appendix is now accounted for. Sections 8 to 10 — governance, launch and
activation — are the national strategy lifecycle framework and carry no
Al-Baha records.

## Counting the initiative cards table by table

The 19 initiative cards hold three tables each: the milestones, the
operational risks, and a second table describing every milestone in a
sentence or two. Counting them per initiative rather than in total is what
exposed a fault the totals had been hiding.

The totals were right — 165 milestones and 43 risks, matching the cards
exactly. But nine milestones and five risks sat under the wrong initiative:
02.04's rows had been filed under 02.03, and 02.03's under 02.02. Reading
each table against the slide it appears on fixed the attribution, and all 19
initiatives now agree with their cards row for row. Nothing was deleted; the
records were moved.

Two pairs of milestones in 02.03 share a name. They are not duplicates: they
are steps of two different projects, and each project’s budget equals the
sum of the steps beneath it — 600,000 and 400,000 respectively — which is
what settles it.

The descriptions are a separate table that rewords some titles, so they are
matched by position within the initiative. That is only safe if the stored
order matches the card, so every write was guarded by the name at that
position; across the fifteen initiatives joined this way, not one position
disagreed. The remaining four cards list a different number of descriptions
than milestones — a step named in one table and not the other — so those are
matched by name alone and 21 milestones are left without a description
rather than given one that might belong to their neighbour.

## The indicator cards

Each of the 24 cards states its indicator's formula and two separate
cumulation rules: whether values accumulate within a year, and whether they
accumulate across years. Only one formula had been read in and neither rule
for any indicator, which left the dashboard unable to tell a running total
from a snapshot — an error that produces figures looking perfectly plausible
and wrong. All 24 now carry all three: 14 accumulate within the year, 11
across years.

The measurement frequency and direction already on record were checked
against the cards rather than overwritten. They agreed everywhere.

The strategy refers to a pillar-level indicator as K<objective>.<n>. Those
codes were rebuilt from the objectives and their indicators and then checked
against the fifteen printed in the deck — the two sets matched exactly, and
every objective link implied by a code agreed with the one already stored.
The nine vision-level impact indicators have no such code; the decks give
them none.

## Where the budget figures come from, and how they check out

No single page gives an initiative its budget. The programmes deck states
each total and marks the ten zero-budget initiatives; the cards give the
split between capital and operational. Read together they close three ways,
and all three had to hold before the figures were written:

- the nine funded initiatives add to 100 million, the stated strategy budget;
- grouped by programme they give 57 / 38 / 5 / 0 / 0, matching each
  programme's own budget;
- the split comes to 12 capital against 88 operational, and every individual
  initiative’s split equals its own total.

Checking this way found three initiatives whose capital and operational
figures were wrong — 01.02 had been recorded as 25 capital and 4.6
operational against a total of 25, which reconciles with nothing. The totals
themselves were already right.

## The challenges

Appendix 7 works through the region's challenges across eight dimensions —
natural assets, real estate, the economic engine, urban planning,
infrastructure, culture and heritage, demographics, and institutions. For each
of its 41 challenges it states the mechanism chosen to address it, the planned
initiatives that carry the work, and the existing government projects that
already touch it.

It is the link between the diagnosis and the portfolio — the reason each
initiative exists. 125 initiative links were recovered, covering 18 of the 19
initiatives; only 05.01, a coordination initiative, answers no specific
challenge. The initiatives are named in prose, so the raw wording is kept
beside the links.

## The investment opportunities

The appendix of the detailed document sets out thirty opportunities offered
to the private sector, two slides each — an overview and a feasibility study.
Nothing indexes them and no table holds their figures, which is why a first
pass over the tables missed them entirely.

Each carries visitors, direct and indirect jobs, GDP contribution, NPV, IRR
and payback period, and most carry a revenue line for 2028 to 2032. Together
they account for 23,181 direct and 26,395 indirect jobs and 1,548 million in
net present value. Every one names the programme it serves, and seventeen name
an initiative; the pairings are consistent throughout (01.xx opportunities
under الباحة 365, 02.xx under خيرات الباحة, and so on), which is the check
that they were read off the right pages.

They are deliberately **not** `albaha.project` records. The office does not
deliver them and none of its 100 million pays for them, so counting them as
its own work would distort every delivery figure on the dashboard.

Thirteen have no initiative code on their page, and five give no visitor
figure. Where a page plots revenue as a single label rather than a series,
the revenue fields are left empty rather than guessed.

## What the charts hold

The charts of the detailed document are the only place some figures appear.
Each one that was loaded reconciles against a total the decks state in words,
which is what shows it was read correctly:

- **Spend by year.** 29.9, 35.4, 19.5 and 15.2 million over the strategy's
  first four years, nothing in the fifth. Adds to the stated 100 million, and
  each programme's four years add to the budget on its own card.
- **Expected return by year.** Reported cumulatively, reaching 1,979.6 million
  by 2030 — the figure the deck states — split 804 / 777 / 374 / 25 across the
  four programmes that earn one.
- **Phasing is by strategy year, not calendar year.** The source writes
  "السنة الأولى", and the calendar year beside it assumes year one is 2026,
  which is when the return chart starts counting. Both are stored.
- **Jobs and GDP contribution by year** are breakdowns of targets already
  loaded: 69 / 627 / 1,673 / 984 direct jobs adds to the stated 3,355, and the
  GDP contribution of 838 / 1,283 / 729 / 190 million adds to the stated 3.0
  billion. They are not loaded separately because the indicator targets they
  decompose are already in place.
- **The remaining 79 charts belong to the feasibility studies** — the revenue
  and EBITDA curves behind the thirty opportunities, modelled to 2050 with no
  categories and no series names. The figures that matter are stated as text
  on the same pages and are loaded from there.

## In the decks but deliberately not loaded

Analysis and narrative rather than records: regional benchmarks against عسير,
الرياض and جازان; the launch communications plan; guiding principles; the
escalation matrix; sector competitiveness scoring; committee remark counts; the
national strategy lifecycle roles and responsibilities; and the historical
resolutions establishing the office (ق1/ل ش 5/1444هـ).

Also left: the **citizen workshop findings** (appendix 13). Five workshops were
held with women, young people, and people working in investment, tourism and
agriculture, producing 13 findings across three sectors, each sector linked to
objectives and initiatives. The findings are quoted verbatim and the layout
does not tie an individual quote to an individual objective, so loading them
would mean inventing an attribution the source does not make. The same ground
is covered, with proper per-row attribution, by the challenges above. They are
kept in the sheets.

Also left: the **two cinema projects** (appendix 14) — one open in Baljurashi
Mall, one planned in Baha Mall for 2027. They are private ventures with no
budget, dates or progress reported, so a project record would hold nothing but
a name.

The note pages were read on the eighth sweep, and an earlier draft of this
document was wrong to say they carry page numbers only. Thirty-three of them
do not. Slides 213 to 245 of the detailed document — the whole launch media
plan — each carry the *same* speaker note, a derivation of an employment
figure from visitor numbers:

> 200,000 extra visitors × SAR 1,000 average spend = SAR 200m. At SAR 200,000
> per direct job, 200,000,000 ÷ 200,000 = 1,000 direct jobs. Indirect jobs are
> 1.6 of direct: 1,000 × 0.6 = 600 indirect. Total ≈ 2,880 jobs.

Nothing is loaded from it, for two reasons. It does not belong to the slides
it sits on — a jobs calculation has no bearing on a media plan, and its being
identical on all thirty-three pages says it rode along when a slide was
duplicated. And it does not agree with itself: it names the indirect factor
as 1.6, applies 0.6, and arrives at a total that neither factor yields from
1,000 direct jobs. It is also not the source of anything already loaded — the
thirty investment opportunities carry their own indirect-to-direct ratios,
ranging from 0.35 to 7.5, so no single multiplier was ever applied to them.

The remaining note pages, across all six decks, do carry page numbers only,
and no slide in any deck contains an external hyperlink. The embedded
workbooks behind the charts hold the same numbers as the charts themselves.
The image layer — 1,324 images in the detailed document alone — is photography
of the region, maps and illustration; a sample of the largest found no
screenshot of a table, so nothing readable is believed to be hiding there.

## Looking at the pictures

Six sweeps read the decks as text. The seventh looked at them. The six decks
hold 1,601 images, 868 of them distinct and large enough to carry anything;
laid out on contact sheets they were examined one by one.

Most are what you would expect: photographs of the region, renders, ministry
logos, icons and patterns. Around sixty are something else — **screenshots of
slides**, whose text is not in the presentation’s XML at all and which every
text-based sweep was therefore blind to.

Two of them carry records:

- **Ten investment projects the office supports**, named, with budgets from
  55 million to 7.5 billion, their sector and their stage in the pipeline —
  approved, out to market, contracted with land allocated, or under
  construction.
- **Ten third-sector projects** run by the region’s agricultural, beekeeping
  and housing cooperatives, each with its owner, its budget and how far along
  it is. These are the first per-project completion figures in the whole body
  of material.

Both sets are other people’s delivery, so they sit in categories that do not
count toward the office’s performance. One budget is printed malformed in the
source itself — "18,000,00" — and is recorded with that noted rather than
quietly corrected.

A third slide mattered for a different reason: it names ten government
infrastructure projects with their actual completion, and nine of the ten
were already loaded carrying a flat 50%. That is what exposed the invented
percentage described above.

The rest of the screenshots are the current-state assessment, the
competitiveness and benchmarking analysis, the vision options and their
scoring, official letters, an organisation chart, and reference slides lifted
from other national strategies — analysis, not records. One of them, a
summary of the five programmes, shows a different split of initiatives (4 and
3 where the text says 5 and 2); three text sources and the initiative codes
themselves agree against it, so it is an older iteration and the database
follows the text.

## The field-by-field audit

Spot checks find what you think to look for. To be sure nothing was missed,
every field on every model was enumerated against how many records carry it,
and each gap had to be given a reason. That census found the following, none
of which any earlier pass had noticed:

- **Eleven objectives had no description and none of the fifteen had a
  pillar** — the strategic house had a floor and a roof with nothing between.
  Both are stated, a page per pillar.
- **23 of the 24 indicator formulas were missing**, and the cumulation rules
  for all 24: whether an indicator's periods accumulate within a year and
  across years. Without them the dashboard cannot tell a running total from a
  snapshot, which yields plausible wrong figures rather than obvious blanks.
- **All six committees carried a frequency of "monthly"** — the field default,
  not anything read. One meets quarterly and two state no cadence at all. The
  default was removed so that empty now means the source does not say.
- **Three initiatives had the wrong capital/operational split.** 01.02 read 25
  capital and 4.6 operational against a total of 25, which reconciles with
  nothing.
- **The pillars had names and nothing else** — no description, no link from
  the twelve strategic risks to the pillar each threatens, and none of the
  mitigation steps the strategy sets against them.
- **`kpi.target_value` was empty on all 24.** The dashboard falls back to it
  when a period carries no target of its own, so the fallback had nothing to
  fall back to.
- **Six milestones carried dates derived from the wrong initiative** — a side
  effect of moving them to the initiative whose card they appear on. Milestone
  dates are computed from the initiative's start, and 02.04 has none, so the
  dates were cleared: one derived from the wrong anchor is worse than none.

Everything still empty is empty for a stated reason. In summary:

| Kind of gap | Why |
|---|---|
| Actuals, progress, spend, variance, slippage | Nothing has been reported yet; these fill as the office uses the system |
| Owners, chairs, sponsors, managers | Ownership is written as an entity, never as a named person |
| English names | The decks are Arabic only |
| Record codes | The source numbers milestones, projects and operational risks not at all |
| Baselines for 9 indicators, targets for 5 | Written as "-", "NA", or marked pending activation |
| Dates for initiative 02.04 and its milestones | The card gives none |
| Budgets on 10 initiatives | Zero by design — مبادرة صفرية |
| Programme and portfolio dates | Never stated |
| Government project dates, codes, locations | The register gives name, owner, cost and progress only |
| `albaha.project.program_id` | Points at the PMO programme model, which this strategy does not use |
| `albaha.sector.kpi.sector_id` | The `domain` field already records tourism or agriculture; a sector record would duplicate a pillar |
| 26 models with no records | Contracts, deliverables, lessons, issues, change requests and the rest of the delivery machinery — none of it exists yet |

## Rebuilding

The extraction scripts and the per-entity sheets are in `extraction/`. The
sheets are the intermediate form: one CSV per entity, with raw source values
kept in `*_raw` columns next to the converted ones so any conversion can be
checked against what the deck actually said. The six decks themselves are too
large for this repository and are kept at `D:/APPS/project/client_source_files/`.
