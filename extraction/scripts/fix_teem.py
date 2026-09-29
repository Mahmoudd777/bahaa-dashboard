# One character in one field: "tصميم" for "تصميم", a Latin t keyed for a taa.
# It is the only mixed Latin-Arabic token in all 49 sheets that is not a real
# acronym, so this is a one-off, not a class of error.
init = env['albaha.initiative'].search([('code','=','01.02')])
assert len(init) == 1
before = init.regional_importance
assert 'tصميم' in before, 'already fixed'
init.regional_importance = before.replace('tصميم', 'تصميم')
env.cr.commit()
print('fixed 01.02; remaining anywhere:',
      env['albaha.initiative'].search_count([('regional_importance','like','tصميم')]))
