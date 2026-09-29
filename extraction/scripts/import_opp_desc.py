# -*- coding: utf-8 -*-
"""Fill the three opportunity overviews that were split across text boxes.

Two of them run over several runs after their heading and one is printed
before it, so a reader that took only the run after the label found nothing.
"""
Opportunity = env["albaha.investment.opportunity"].sudo()

TEXT = {
    6: "منتجع فريد للفروسية في الباحة، يقدم مسابقات مثيرة وبرامج ركوب خيول غامرة وأماكن إقامة.",
    11: ("يتميز الفندق بطراز معماري فريد يجمع بين الأقواس والجص الأحمر، "
         "بالإضافة إلى عدة نقوش تعود إلى أوائل القرن الثالث الهجري"),
    24: ("مشروع متكامل يستخدم تقنيات متقدمة في مجال معالجة الثروة الحيوانية "
         "واللحوم لبناء سلسلة الإمداد عالية القيمة ومعالجة التحديات الرئيسية "
         "في صناعة اللحوم."),
}

written = 0
for number, text in TEXT.items():
    record = Opportunity.search([("number", "=", number)], limit=1)
    if record and not record.description:
        record.description = text
        written += 1

env.cr.commit()
records = Opportunity.search([])
print("OPD written: %d, now %d/%d have an overview" % (
    written, len(records.filtered("description")), len(records)))
