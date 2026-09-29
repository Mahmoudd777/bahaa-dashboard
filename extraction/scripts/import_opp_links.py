# The deck names the initiative on all thirty opportunity pages. Seventeen
# were linked; thirteen were not. The parser that read all thirty agrees with
# all seventeen already in place, which is why the other thirteen are trusted.
# Only blanks are filled — an existing link is never overwritten.
import csv, io
codes = {}
with io.open('/tmp/49_opportunity_links.csv', encoding='utf-8-sig') as fh:
    for row in csv.DictReader(fh):
        c = (row['initiative_codes'] or '').split()
        if len(c) == 1:
            codes[int(row['number'])] = c[0]

by_code = {i.code: i for i in env['albaha.initiative'].search([])}
filled, skipped, disagree = 0, 0, []
for opp in env['albaha.investment.opportunity'].search([]):
    want = codes.get(opp.number)
    if not want or want not in by_code:
        continue
    if opp.initiative_id:
        if opp.initiative_id.code != want:
            disagree.append((opp.number, opp.initiative_id.code, want))
        skipped += 1
        continue
    opp.initiative_id = by_code[want].id
    filled += 1
env.cr.commit()
print('filled', filled, 'left alone', skipped, 'disagreements', disagree)
print('now linked:', env['albaha.investment.opportunity'].search_count([('initiative_id','!=',False)]), 'of 30')
