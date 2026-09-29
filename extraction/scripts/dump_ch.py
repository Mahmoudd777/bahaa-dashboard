import csv
Challenge = env["albaha.challenge"].sudo()
with open("/tmp/challenges_now.csv", "w", encoding="utf-8-sig", newline="") as fh:
    w = csv.writer(fh)
    w.writerow(["id", "dimension", "name"])
    for r in Challenge.search([], order="id"):
        w.writerow([r.id, r.dimension or "", r.name])
print("DCH wrote %d" % Challenge.search_count([]))
