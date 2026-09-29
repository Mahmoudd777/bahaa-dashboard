# -*- coding: utf-8 -*-
"""Compare what the cards contain against what was loaded, per initiative."""
import csv

Initiative = env["albaha.initiative"].sudo()
Milestone = env["albaha.milestone"].sudo()
Risk = env["albaha.risk"].sudo()

with open("/tmp/36_deck06_counts.csv", encoding="utf-8-sig") as fh:
    deck = {r["code"]: r for r in csv.DictReader(fh)}

total_m = total_r = 0
for record in Initiative.search([], order="code"):
    source = deck.get(record.code or "")
    if not source:
        print("CNT %s no table on any card" % record.code)
        continue
    loaded_m = Milestone.search_count([("initiative_id", "=", record.id)])
    loaded_r = Risk.search_count([("initiative_id", "=", record.id)])
    want_m, want_r = int(source["milestones"]), int(source["risks"])
    total_m += loaded_m
    total_r += loaded_r
    flag = ""
    if loaded_m != want_m:
        flag += " MILESTONES %+d" % (loaded_m - want_m)
    if loaded_r != want_r:
        flag += " RISKS %+d" % (loaded_r - want_r)
    print("CNT %-6s milestones %3d/%-3d  risks %2d/%-2d %s" % (
        record.code, loaded_m, want_m, loaded_r, want_r, flag))
print("CNT loaded totals: milestones %d, risks %d" % (total_m, total_r))
print("CNT all milestones in the database: %d" % Milestone.search_count([]))
print("CNT all operational risks: %d, of which tied to an initiative: %d" % (
    Risk.search_count([]), Risk.search_count([("initiative_id", "!=", False)])))
print("CNT milestones carrying a description: %d" % Milestone.search_count(
    [("description", "!=", False)]))
