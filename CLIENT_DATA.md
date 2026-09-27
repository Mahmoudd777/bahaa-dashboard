# Client data — what the strategy decks contain, and what they do not

The dashboard is loaded from six PowerPoint decks the client supplied in
September 2026 (`Dashboard Data entry` on their SharePoint). This file records
what was taken from them, what was deliberately left, and — most importantly —
**what the decks do not contain**, so that an empty figure on the dashboard is
not mistaken for a bug.

Extraction covered every table (274 of 274 classified) and every slide (796:
364 carrying records, the rest prose or analysis).

## Loaded

| Records | Count | Source |
|---|---|---|
| Pillars | 5 | البيت الاستراتيجي |
| Objectives | 15 (4 top-level, 11 below) | الرؤية + البيت الاستراتيجي |
| Programmes | 5 | البرامج والمبادرات |
| Indicators | 24 | بطاقات المؤشرات |
| Indicator targets | 156 periods | بطاقات المؤشرات + جدول الطموحات |
| Target methodology | 23 indicators | الوثيقة التفصيلية |
| Initiatives | 19 | بطاقات المبادرات |
| Milestones | 165 (46 parents, 119 leaves) | جداول مشاريع ومعالم المبادرة |
| Projects | 156 (145 government, 11 strategy) | الوثيقة التفصيلية |
| Operational risks | 43 | مصفوفات المخاطر |
| Strategic risks | 12 | المخاطر الرئيسية بالركيزة |
| Committees | 6 | الترتيبات التنظيمية |
| Directives and alignment | 114 | توجيهات وملاحظات اللجنة + نتائج المواءمة |
| Sector indicators | 10 | الإنتاج الزراعي + مستهدفات السياحة |
| Investment portfolio | 5 stages, 14.83bn, 49 projects | المحفظة الاستثمارية القائمة |

## NOT in the client files

These are absent from the source, not lost in extraction. Each one explains a
blank or a zero on the dashboard.

- **No actual values for any indicator.** Every figure in the decks is a
  target or a baseline. Nothing reports what has actually been achieved, so
  all 24 indicators read "لم يتم القياس" and every achievement percentage is
  zero. This is the single biggest gap: the dashboard cannot show performance
  until the office reports actuals.
- **No progress percentages for the strategy's own projects.** The 11 projects
  named in the initiative tables have no reported progress, so the portfolio
  health score has nothing to score and reads "لم يتم القياس".
- **No spend against budget.** Budgets are approved amounts only. There are no
  period spend records (`albaha.budget` is empty), so budget cards, CPI and
  SPI have no actuals. Government projects are the exception: a completed one
  is taken as having spent its value.
- **No budget for 11 of the 19 initiatives.** Their cards carry "-" in the
  estimated-budget row. 02.04 has no budget line at all.
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
- **Milestone budgets do not add up to initiative budgets** for 01.02, 01.04
  and 02.01 — the tables cover part of the work only. Five other initiatives
  reconcile exactly, which is what shows the extraction is sound.
- **No project-level detail for the investment portfolio.** The 14.83bn across
  49 projects is given only as totals per stage; the projects are not named.
- **No owners as people.** Ownership is written as an entity ("المكتب
  الاستراتيجي لتطوير منطقة الباحة"), never a named person, so no `res.partner`
  links could be made.

## In the decks but deliberately not loaded

Analysis and narrative rather than records: regional benchmarks against عسير,
الرياض and جازان; the launch communications plan; guiding principles; the
escalation matrix; sector competitiveness scoring; committee remark counts;
and the historical resolutions establishing the office (ق1/ل ش 5/1444هـ).

## Rebuilding

The extraction scripts and the per-entity sheets live outside this repository,
in the working scratchpad. The sheets are the intermediate form: one CSV per
entity, with raw source values kept in `*_raw` columns next to the converted
ones so any conversion can be checked against what the deck actually said.
