# Extraction working files

Everything the dashboard's client data was built from, kept so the load can be
checked or rerun without starting again from the decks.

## `sheets/`

47 CSVs, one per entity, in the order they were produced. They are the
intermediate form between the decks and the database: raw source values are
kept in `*_raw` columns beside the converted ones, so any conversion can be
read against what the deck actually said.

Numbered in the order they were extracted, which is also roughly the order the
gaps were found — 01 to 21 from the first pass over tables and slides, 22 from
the charts, 23 to 30 from the second pass, and 31 onward from the field audit
and the image sweep.

## `scripts/`

The parsers, the importers and the checks.

- `parse_*.mjs` read a deck and write a sheet
- `import_*.py` run inside `odoo shell` and load a sheet
- `check_*.py`, `audit_fields.py`, `compare_counts.py` verify what was loaded
  against the source, per entity rather than in total — which is what caught
  the attribution drift the totals hid
- `*.ps1` handle the OOXML: unzipping parts, reading tables, charts, embedded
  workbooks, shape positions, and the image layer

## The source decks

The six PowerPoint files are **not** in this repository — they are 545 MB.
They are kept at `D:/APPS/project/client_source_files/`, and the scripts
expect them at `client_data/pptx/` relative to wherever they are run.

## Rerunning

The scripts were written to be run one at a time against a scratch directory,
not as a pipeline. Each states at the top what it reads, what it writes and
why the reading it takes is the right one. Read that comment before rerunning
anything: several of them encode a judgement about which of two contradictory
sources to believe, and those judgements are the substance of the work.
