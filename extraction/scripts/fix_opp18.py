# Opportunity 18 cites initiative 03.05, which the strategy does not contain.
# It is linked by name instead, not by guess: the page names "تطوير وتفعيل
# تجارب سياحية زراعية وغذائية..." which is initiative 02.05 word for word,
# and the programme printed on the same page (خيرات الباحة) is 02, which is
# where 02.05 sits. The written code is the only thing out of step.
opp = env['albaha.investment.opportunity'].search([('number','=',18)])
init = env['albaha.initiative'].search([('code','=','02.05')])
assert len(opp) == 1 and len(init) == 1, (len(opp), len(init))
assert not opp.initiative_id, 'already linked; leaving alone'
assert opp.program_id.code == '02', opp.program_id.code
opp.initiative_id = init.id
opp.source_reference = (opp.source_reference or '') + \
    ' | deck 04 slide 591 writes the code as 03.05, which does not exist; ' \
    'linked to 02.05 on the initiative name printed beside it'
env.cr.commit()
print('opp 18 ->', opp.initiative_id.code)
print('linked:', env['albaha.investment.opportunity'].search_count([('initiative_id','!=',False)]), 'of 30')
