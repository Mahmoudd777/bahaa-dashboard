# -*- coding: utf-8 -*-
"""Every field on every strategy model, with how full it is.

A field-by-field census rather than spot checks: the only way to know nothing
is missed is to enumerate what exists and account for each gap. Abstract
models have no table and reading one aborts the transaction, so each read
takes its own savepoint and the sweep carries on.
"""
SKIP = {"id", "display_name", "create_uid", "create_date", "write_uid",
        "write_date", "__last_update", "message_ids", "message_follower_ids",
        "message_main_attachment_id", "activity_ids", "rating_ids",
        "website_message_ids", "message_has_error", "message_needaction",
        "message_attachment_count", "message_is_follower", "message_unread",
        "message_has_sms_error", "message_partner_ids", "message_has_error_counter",
        "message_needaction_counter", "message_unread_counter", "activity_state",
        "activity_user_id", "activity_type_id", "activity_type_icon",
        "activity_date_deadline", "my_activity_date_deadline", "activity_summary",
        "activity_exception_decoration", "activity_exception_icon", "has_message",
        "access_token", "access_url", "access_warning"}

for name in sorted(n for n in env.registry.keys() if n.startswith("albaha.")):
    Model = env[name].sudo()
    try:
        with env.cr.savepoint():
            records = Model.search([])
    except Exception as error:
        print("AUD %-34s unreadable (%s)" % (name, str(error).splitlines()[0][:44]))
        continue
    if not records:
        print("AUD %-34s EMPTY" % name)
        continue
    print("AUD %-34s %d records" % (name, len(records)))
    for field in sorted(Model._fields):
        if field in SKIP:
            continue
        descriptor = Model._fields[field]
        if descriptor.compute and not descriptor.store:
            continue
        try:
            with env.cr.savepoint():
                filled = len(records.filtered(field))
        except Exception:
            continue
        if filled == len(records):
            continue
        print("AUD     %-28s %-9s %s" % (
            field, "%d/%d" % (filled, len(records)), descriptor.type))
