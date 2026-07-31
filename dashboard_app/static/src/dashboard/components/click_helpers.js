/** @odoo-module **/

import { useExternalListener, useRef, useState } from "@odoo/owl";

/** Dashboard-wide event: close header menus, date picker, etc. Set ev.detail.closed = true when something closes. */
export const BAHA_CLOSE_OVERLAYS = "baha:close-overlays";

export function dispatchCloseOverlays() {
    const detail = { closed: false };
    document.dispatchEvent(new CustomEvent(BAHA_CLOSE_OVERLAYS, { detail }));
    return detail.closed;
}

export function isClickable(item) {
    return Boolean(item && (item.record || item.aggregate));
}

export function clickableClass(item, extra = "") {
    if (!isClickable(item)) {
        return extra;
    }
    const base = "o_baha_clickable";
    return extra ? `${base} ${extra}` : base;
}

export function openItem(item, onOpenRecord, onOpenDrilldown) {
    if (!item) {
        return;
    }
    if (item.record && onOpenRecord) {
        onOpenRecord(item.record);
    } else if (item.aggregate && onOpenDrilldown) {
        onOpenDrilldown(item.aggregate);
    }
}

export function onItemKeydown(ev, item, onOpenRecord, onOpenDrilldown) {
    if (!isClickable(item)) {
        return;
    }
    if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        openItem(item, onOpenRecord, onOpenDrilldown);
    }
}

export function openDataTarget(data, onOpenRecord, onOpenDrilldown) {
    openItem(data, onOpenRecord, onOpenDrilldown);
}

export function onDataKeydown(ev, data, onOpenRecord, onOpenDrilldown) {
    onItemKeydown(ev, data, onOpenRecord, onOpenDrilldown);
}

/** Shared "⋮" drill-down picker for a widget's header: one drillable item
 *  opens straight away; several offer a short picker list. `component` is the
 *  calling widget's `this` (for props.onOpenRecord/onOpenDrilldown);
 *  `getItems` reads that widget's current drillable items (called on every
 *  access, not cached, so it always reflects live props).
 *
 *  CURRENTLY UNUSED — the ⋮ button was removed from the card headers on
 *  request, leaving only ⤢ expand (which opens the whole card at once via
 *  ComponentDetailModal). Kept here intact because the ⋮ is planned to come
 *  back; re-wiring it means calling this in a widget's setup() and adding the
 *  markup back to its header. */
export function useDrillMenu(component, getItems) {
    const state = useState({ menuOpen: false, menuPos: { top: 0, left: 0 } });
    const menuWrap = useRef("menuwrap");

    function closeMenu() {
        if (state.menuOpen) {
            state.menuOpen = false;
        }
    }
    function openDrillItem(item) {
        openItem(item, component.props.onOpenRecord, component.props.onOpenDrilldown);
    }
    useExternalListener(document, "click", (ev) => {
        if (!state.menuOpen) {
            return;
        }
        const wrap = menuWrap.el;
        if (wrap && wrap.contains(ev.target)) {
            return;
        }
        closeMenu();
    }, { capture: true });
    useExternalListener(document, "keydown", (ev) => {
        if (ev.key === "Escape") {
            closeMenu();
        }
    });
    useExternalListener(document, BAHA_CLOSE_OVERLAYS, () => closeMenu());
    useExternalListener(window, "resize", () => closeMenu());
    useExternalListener(window, "scroll", () => closeMenu(), { capture: true });

    function toggleMenu(ev) {
        const items = (getItems() || []).filter(isClickable);
        if (!items.length) {
            return;
        }
        if (items.length === 1) {
            openDrillItem(items[0]);
            return;
        }
        if (state.menuOpen) {
            closeMenu();
            return;
        }
        const icon = (ev && ev.currentTarget) || menuWrap.el;
        const r = icon.getBoundingClientRect();
        const WIDTH = 220;
        state.menuPos = {
            top: Math.round(r.bottom + 6),
            left: Math.round(Math.max(8, Math.min(r.left, window.innerWidth - WIDTH - 8))),
        };
        state.menuOpen = true;
    }
    function onMenuKeydown(ev) {
        if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            toggleMenu(ev);
        }
    }
    function pickDrill(item) {
        state.menuOpen = false;
        openDrillItem(item);
    }

    return {
        state,
        menuWrap,
        get drillItems() {
            return (getItems() || []).filter(isClickable);
        },
        toggleMenu,
        onMenuKeydown,
        pickDrill,
    };
}
