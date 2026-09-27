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
| GDP actuals | 4 years (2021–2024) | chart «النتائج الفعلية» |
| Programme spend and return by year | 25 rows (5 programmes × 5 years) | charts «توزيع الميزانية» and «العائد المتوقع» |
| Investment opportunities | 30, with feasibility studies | دراسات الجدوى الاقتصادية للفرص الاستثمارية |
| Challenges and their mitigation | 41, across 8 dimensions | آليات معالجة التحديات |
| Initiative budgets | 19 (9 funded, 10 zero-budget) | البرامج والمبادرات + بطاقات المبادرات |

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
- **Milestone budgets do not add up to initiative budgets** for 01.02, 01.04
  and 02.01 — the tables cover part of the work only. Five other initiatives
  reconcile exactly, which is what shows the extraction is sound.
- **No project-level detail for the *existing* investment portfolio.** The
  14.83bn across 49 projects is given only as totals per stage; those projects
  are not named. This is not true of the *pipeline*: the thirty opportunities
  the office markets to the private sector are each named and costed (see
  below).
- **No owners as people.** Ownership is written as an entity ("المكتب
  الاستراتيجي لتطوير منطقة الباحة"), never a named person, so no `res.partner`
  links could be made.

## Reading the decks against their own contents page

The detailed document has a table of contents — ten sections and fifteen
appendices. Checking each one in turn, rather than searching for tables, is
what turned up the two largest omissions: appendix 15, the thirty investment
opportunities, and appendix 7, the challenges. Both hold their figures as
slide text, so a sweep that looked only at tables could never have found them.

Every appendix is now accounted for. Sections 8 to 10 — governance, launch and
activation — are the national strategy lifecycle framework and carry no
Al-Baha records.

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

The note pages of all six decks carry page numbers only. The embedded
workbooks behind the charts hold the same numbers as the charts themselves.
The image layer — 1,324 images in the detailed document alone — is photography
of the region, maps and illustration; a sample of the largest found no
screenshot of a table, so nothing readable is believed to be hiding there.

## Rebuilding

The extraction scripts and the per-entity sheets live outside this repository,
in the working scratchpad. The sheets are the intermediate form: one CSV per
entity, with raw source values kept in `*_raw` columns next to the converted
ones so any conversion can be checked against what the deck actually said.
