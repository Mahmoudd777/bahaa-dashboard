/** @odoo-module **/

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
