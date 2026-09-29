# Objective progress and RAG are computed from albaha.objective.kpi_ids, and
# the dashboard's objective widgets read the same relation. It held no rows:
# the load set each indicator's objective_id and never the many2many, so every
# objective read 0% and grey whatever its indicators said. The link is not
# invented here — it is each indicator's own objective_id, mirrored.
Kpi = env['albaha.kpi']
before = env.cr.execute("select count(*) from albaha_kpi_albaha_objective_rel") or env.cr.fetchone()[0]
added = 0
for kpi in Kpi.search([('objective_id', '!=', False)]):
    obj = kpi.objective_id
    if kpi not in obj.kpi_ids:
        obj.kpi_ids = [(4, kpi.id)]
        added += 1
env.cr.commit()
env.cr.execute("select count(*) from albaha_kpi_albaha_objective_rel")
print('rows before', before, 'added', added, 'rows now', env.cr.fetchone()[0])
Obj = env['albaha.objective']
with_kpis = Obj.search([]).filtered(lambda o: o.kpi_ids)
print('objectives with indicators:', len(with_kpis), 'of', Obj.search_count([]))
for o in with_kpis.sorted(lambda o: o.id)[:15]:
    print('  ', len(o.kpi_ids), 'kpi(s)  progress', o.progress_pct, o.rag, '|', (o.name or '')[:40])
