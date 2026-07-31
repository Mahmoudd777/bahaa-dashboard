# Parked UI

Controls removed from the dashboard on purpose, kept here so they can be put
back without re-deriving them. Each entry records what it looked like, where
it lived, and what it still needs before it earns its place back.

The common thread: a control that *looks* interactive but does nothing is
worse than no control at all — users click it, nothing happens, and they stop
trusting the rest of the interface.

---

## 1. Kebab menu (⋮) on card headers

**Removed:** 2026-07-31, at the user's request ("remove it now but we will
return it later").
**Was in:** the header of every widget in `components/widgets.js`, plus the
grouped-panel header in `components/unit_content.js`.

Opened a picker listing each drillable item in the card; a card with one
drillable item opened it directly instead.

**Why it went:** it duplicated ⤢. Both led to the same place, so the header
had two controls doing one job. ⤢ now opens the whole card at once via
`ComponentDetailModal`.

**Restoring it:** the machinery is intact — `useDrillMenu()` in
`components/click_helpers.js`, with its own note. Call it in a widget's
`setup()` (`this.menu = useDrillMenu(this, () => …items)`) and add the markup
back to that widget's header:

```xml
<span class="o_baha_panel__menuwrap" t-ref="menuwrap">
    <i class="fa fa-ellipsis-v o_baha_panel__menu"
       t-att-class="{ 'o_baha_panel__menu--active': menu.drillItems.length,
                      'o_baha_panel__menu--on': menu.state.menuOpen }"
       t-att-role="menu.drillItems.length ? 'button' : undefined"
       t-att-tabindex="menu.drillItems.length ? 0 : undefined"
       t-on-click="menu.toggleMenu"
       t-on-keydown="menu.onMenuKeydown"/>
    <div t-if="menu.state.menuOpen" class="o_baha_panel__dropdown"
         t-attf-style="top:{{menu.state.menuPos.top}}px;left:{{menu.state.menuPos.left}}px;">
        <t t-foreach="menu.drillItems" t-as="d" t-key="d_index">
            <button class="o_baha_panel__dropitem" t-on-click="() => this.menu.pickDrill(d)">
                <i class="fa fa-table"/><span t-esc="d.label"/>
            </button>
        </t>
    </div>
</span>
```

Give it a job distinct from ⤢ first, or it will be redundant again.

---

## 2. Filter chip on `list_cards` headers (e.g. «الركيزة ▾»)

**Removed:** 2026-07-31.
**Was in:** `ListCards` header in `components/widgets.js`.

```xml
<span t-if="props.comp.data.filter_label" class="o_baha_chip">
    <span t-esc="props.comp.data.filter_label"/><i class="fa fa-angle-down"/>
</span>
```

**Why it went:** pure decoration. A `<span>` with a caret, styled as a
dropdown, with no click handler and no menu behind it. It was rendering on
**6 visible cards** ("الإجراءات المطلوبة", "سجل المخاطر الحرجة" across
several dashboards), so people were being invited to filter and getting
nothing.

**Note:** the `filter_label` value is still in each component's `config`, so
nothing needs re-seeding — only the control was removed.

**Restoring it:** needs a real filter first — a menu of the values to filter
by, and a handler that narrows `props.comp.data.items`. The label alone is
not enough; decide what it filters on (pillar? owner? severity?) before
putting the caret back.

---

## 3. Period pill on the `toolbar` widget

**Removed:** not yet — flagged 2026-07-31.
**Lives in:** `Toolbar` in `components/widgets.js`.

```xml
<div class="o_baha_toolbar__period" t-if="props.comp.data.period">
    <i class="fa fa-calendar"/>
    <span t-esc="props.comp.data.period"/>
    <i class="fa fa-angle-down"/>
</div>
```

Same defect as #2 — calendar icon and caret, no handler. **Left in place
because the `toolbar` component type is not used by any visible component
in the database**, so it renders for nobody today. If `toolbar` is ever
brought into a dashboard, either wire this to the real date filter (the
`banner` widget already has one — `o_baha_filterpill`, with a working mode
menu) or delete it at that point.
