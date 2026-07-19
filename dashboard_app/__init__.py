import base64
import os

from . import models
from . import controllers


def _set_company_website_logo(env):
    """Seed every company's `website_logo` with the white Al-Baha SVG.

    Targets the custom `website_logo` field (login/dashboard, dark backgrounds),
    NOT the standard `logo` (back-office + PDF reports). Done in Python on
    purpose: the XML `type="base64" file=` loader rasterises SVG to a flat
    bitmap, which turns a white-on-transparent wordmark into an invisible box.
    A plain ORM write to a Binary field keeps the SVG verbatim.
    """
    path = os.path.join(os.path.dirname(__file__), "static", "img", "logo_white.svg")
    with open(path, "rb") as fh:
        data = base64.b64encode(fh.read())
    for company in env["res.company"].sudo().search([]):
        if not company.website_logo:
            company.website_logo = data
