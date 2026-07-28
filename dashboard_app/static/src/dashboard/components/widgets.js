/** @odoo-module **/

import { Component, markup, onMounted, onPatched, onWillUnmount, useExternalListener, useRef, useState, xml } from "@odoo/owl";
import { user } from "@web/core/user";
import {
    BAHA_CLOSE_OVERLAYS,
    clickableClass, isClickable, onDataKeydown, onItemKeydown,
    openDataTarget, openItem as dispatchItemClick, useDrillMenu,
} from "./click_helpers";

// Figma calendar icon for the date pill (stroke=currentColor).
const CAL_ICON = markup(`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 2V5" stroke="currentColor" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 2V5" stroke="currentColor" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.5 9.08984H20.5" stroke="currentColor" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 8.5V17C21 20 19.5 22 16 22H8C4.5 22 3 20 3 17V8.5C3 5.5 4.5 3.5 8 3.5H16C19.5 3.5 21 5.5 21 8.5Z" stroke="currentColor" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/><path d="M15.6947 13.7002H15.7037" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M15.6947 16.7002H15.7037" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M11.9955 13.7002H12.0045" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M11.9955 16.7002H12.0045" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8.29431 13.7002H8.30329" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8.29431 16.7002H8.30329" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`);

const MONTH_NAMES = ["يناير", "فبراير", "مارس", "ابريل", "مايو", "يونيو", "يوليو", "اغسطس", "سبتمبر", "اكتوبر", "نوفمبر", "ديسمبر"];

// Exact Figma SVG icons (brown #5C4B43) for the "مؤشرات قياس المسار" stat cards.
const STAT_ICONS = {
    chart: markup(`<svg viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.5 0.75C1.5 0.335786 1.16421 1.81058e-08 0.750001 0C0.335788 -1.81058e-08 7.39344e-07 0.335786 7.21238e-07 0.75L0 17.25C-1.026e-07 19.5972 1.90279 21.5 4.25 21.5H20.75C21.1642 21.5 21.5 21.1642 21.5 20.75C21.5 20.3358 21.1642 20 20.75 20H4.25C2.73122 20 1.5 18.7688 1.5 17.25L1.5 0.75Z" fill="#5C4B43"/><path d="M10.75 4L4.75 4.00001C4.33579 4.00001 4 4.33579 4 4.75001C4 5.16422 4.33579 5.50001 4.75 5.50001L10.75 5.5C11.1642 5.5 11.5 5.16421 11.5 4.75C11.5 4.33579 11.1642 4 10.75 4Z" fill="#5C4B43"/><path d="M8.75 9L16.75 9C17.1642 9 17.5 9.33579 17.5 9.75C17.5 10.1642 17.1642 10.5 16.75 10.5L8.75 10.5C8.33579 10.5 8 10.1642 8 9.75C8 9.33579 8.33578 9 8.75 9Z" fill="#5C4B43"/><path d="M18.75 14L14.75 14C14.3358 14 14 14.3358 14 14.75C14 15.1642 14.3358 15.5 14.75 15.5L18.75 15.5C19.1642 15.5 19.5 15.1642 19.5 14.75C19.5 14.3358 19.1642 14 18.75 14Z" fill="#5C4B43"/></svg>`),
    target: markup(`<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 1.25C12.4142 1.25 12.75 1.58579 12.75 2C12.75 2.41421 12.4142 2.75 12 2.75C6.89137 2.75 2.75 6.89137 2.75 12C2.75 17.1086 6.89137 21.25 12 21.25C17.1086 21.25 21.25 17.1086 21.25 12C21.25 11.5858 21.5858 11.25 22 11.25C22.4142 11.25 22.75 11.5858 22.75 12C22.75 17.9371 17.9371 22.75 12 22.75C6.06294 22.75 1.25 17.9371 1.25 12C1.25 6.06294 6.06294 1.25 12 1.25Z" fill="#5C4B43"/><path d="M10.8507 6.36462C11.2567 6.28222 11.6525 6.5445 11.7349 6.95044C11.8173 7.35637 11.5551 7.75224 11.1491 7.83464C9.20954 8.22836 7.74993 9.94437 7.74993 11.9996C7.74993 14.3468 9.65272 16.2496 11.9999 16.2496C14.0552 16.2496 15.7712 14.79 16.1649 12.8504C16.2473 12.4445 16.6432 12.1822 17.0491 12.2646C17.455 12.347 17.7173 12.7429 17.6349 13.1488C17.1021 15.7737 14.7826 17.7496 11.9999 17.7496C8.82429 17.7496 6.24993 15.1753 6.24993 11.9996C6.24993 9.21694 8.22583 6.89745 10.8507 6.36462Z" fill="#5C4B43"/><path fill-rule="evenodd" clip-rule="evenodd" d="M15.3106 9.75001H18.3787C18.9754 9.75001 19.5477 9.51296 19.9697 9.091L22.1036 6.95712C22.7335 6.32716 22.2874 5.25001 21.3964 5.25001H18.75V2.60357C18.75 1.71266 17.6729 1.2665 17.0429 1.89646L14.909 4.03034C14.4871 4.4523 14.25 5.0246 14.25 5.62133V8.68934L11.4697 11.4697C11.1768 11.7626 11.1768 12.2374 11.4697 12.5303C11.7626 12.8232 12.2374 12.8232 12.5303 12.5303L15.3106 9.75001ZM17.25 5.68934V3.81067L15.9697 5.091C15.829 5.23166 15.75 5.42242 15.75 5.62133V7.18934L17.25 5.68934ZM16.8106 8.25001L18.3106 6.75001H20.1893L18.909 8.03034C18.7684 8.171 18.5776 8.25001 18.3787 8.25001H16.8106Z" fill="#5C4B43"/></svg>`),
    goals: markup(`<svg viewBox="0 0 20 22" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14.4 4.3501C14.4 3.65974 14.9596 3.1001 15.65 3.1001C16.3403 3.1001 16.9001 3.65974 16.9001 4.3501C16.9001 5.04045 16.3404 5.6001 15.6501 5.6001C14.9597 5.6001 14.4 5.04045 14.4 4.3501Z" fill="#5C4B43"/><path fill-rule="evenodd" clip-rule="evenodd" d="M11.2999 4.35183C11.2999 1.94984 13.247 0 15.65 0C18.0525 0 19.9999 1.94754 19.9999 4.35C19.9999 7 17.8999 9 16.0999 10.35C15.8333 10.55 15.4666 10.55 15.1999 10.35C13.4001 9.00011 11.2999 7.00009 11.2999 4.35183ZM15.65 1.5C14.0764 1.5 12.7999 2.7773 12.7999 4.35183C12.7999 6.04346 14.0566 7.52721 15.6499 8.80174C17.2432 7.52729 18.4999 6.04337 18.4999 4.35C18.4999 2.77594 17.224 1.5 15.65 1.5Z" fill="#5C4B43"/><path d="M11.75 9C12.1642 9 12.5 9.33579 12.5 9.75C12.5 10.1642 12.1642 10.5 11.75 10.5H7C5.89543 10.5 5 11.3954 5 12.5C5 13.6046 5.89543 14.5 7 14.5H8.25C8.66421 14.5 9 14.8358 9 15.25C9 15.6642 8.66421 16 8.25 16H7C5.067 16 3.5 14.433 3.5 12.5C3.5 10.567 5.067 9 7 9H11.75Z" fill="#5C4B43"/><path d="M18.5 18C18.5 16.8954 17.6046 16 16.5 16H15.25C14.8358 16 14.5 15.6642 14.5 15.25C14.5 14.8358 14.8358 14.5 15.25 14.5H16.5C18.433 14.5 20 16.067 20 18C20 19.933 18.433 21.5 16.5 21.5H4.75C4.33579 21.5 4 21.1642 4 20.75C4 20.3358 4.33579 20 4.75 20H16.5C17.6046 20 18.5 19.1046 18.5 18Z" fill="#5C4B43"/><path d="M10.5 15.25C10.5 14.5596 11.0596 14 11.75 14C12.4404 14 13.0001 14.5596 13.0001 15.25C13.0001 15.9404 12.4405 16.5 11.7501 16.5C11.0597 16.5 10.5 15.9404 10.5 15.25Z" fill="#5C4B43"/><path d="M1.25 19.5C0.559644 19.5 0 20.0596 0 20.75C0 21.4404 0.559644 22 1.25 22C1.94036 22 2.5001 21.4404 2.5001 20.75C2.5001 20.0596 1.94036 19.5 1.25 19.5Z" fill="#5C4B43"/></svg>`),
    initiatives: markup(`<svg viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17.1499 3.1001C16.4596 3.1001 15.8999 3.65974 15.8999 4.3501C15.8999 5.04045 16.4596 5.6001 17.1499 5.6001C17.8403 5.6001 18.4 5.04045 18.4 4.3501C18.4 3.65974 17.8403 3.1001 17.1499 3.1001Z" fill="#5C4B43"/><path fill-rule="evenodd" clip-rule="evenodd" d="M12.8 4.35183C12.8 1.94984 14.7471 0 17.15 0C19.5525 0 21.5 1.94754 21.5 4.35C21.5 7 19.4 9 17.6 10.35C17.3333 10.55 16.9666 10.55 16.7 10.35C14.9001 9.00011 12.8 7.00009 12.8 4.35183ZM17.15 1.5C15.5765 1.5 14.3 2.7773 14.3 4.35183C14.3 6.04346 15.5566 7.52721 17.15 8.80174C18.7432 7.52729 20 6.04337 20 4.35C20 2.77594 18.724 1.5 17.15 1.5Z" fill="#5C4B43"/><path d="M14.001 9.75C14.001 9.33579 13.6652 9 13.251 9H13.001C11.068 9 9.50101 10.567 9.50101 12.5C9.50101 14.433 11.068 16 13.001 16H18.001C19.1056 16 20.001 16.8954 20.001 18C20.001 19.1046 19.1056 20 18.001 20H8.25101C7.83679 20 7.50101 20.3358 7.50101 20.75C7.50101 21.1642 7.83679 21.5 8.25101 21.5H18.001C19.934 21.5 21.501 19.933 21.501 18C21.501 16.067 19.934 14.5 18.001 14.5H13.001C11.8964 14.5 11.001 13.6046 11.001 12.5C11.001 11.3954 11.8964 10.5 13.001 10.5H13.251C13.6652 10.5 14.001 10.1642 14.001 9.75Z" fill="#5C4B43"/><path d="M4.34998 14.1001C3.65962 14.1001 3.09998 14.6597 3.09998 15.3501C3.09998 16.0405 3.65962 16.6001 4.34998 16.6001C5.04033 16.6001 5.60008 16.0405 5.60008 15.3501C5.60008 14.6597 5.04033 14.1001 4.34998 14.1001Z" fill="#5C4B43"/><path fill-rule="evenodd" clip-rule="evenodd" d="M0 15.3518C0 12.9498 1.94711 11 4.35006 11C6.75254 11 8.7 12.9475 8.7 15.35C8.7 18 6.6 20 4.8 21.35C4.53333 21.55 4.16667 21.55 3.9 21.35C2.10015 20.0001 0 18.0001 0 15.3518ZM4.35006 12.5C2.77649 12.5 1.5 13.7773 1.5 15.3518C1.5 17.0435 2.75666 18.5272 4.35 19.8017C5.94324 18.5273 7.2 17.0434 7.2 15.35C7.2 13.7759 5.92409 12.5 4.35006 12.5Z" fill="#5C4B43"/></svg>`),
};

const QUARTER_NAMES = ["الأول", "الثاني", "الثالث", "الرابع"];

function todayISO() {
    return new Date().toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function trendClass(dir) {
    if (dir === "up") return "o_baha_trend--up";
    if (dir === "down") return "o_baha_trend--down";
    return "";
}

// ---------------------------------------------------------------------------
// Banner — two-tier app header matching the design:
//   tier 1: avatar (left) | downward-triangle pattern | company logo (right)
//   ---- orange sawtooth divider ----
//   tier 2: date selector (left) | welcome + last-update (right)
// ---------------------------------------------------------------------------
// Figma tab icons (chart-tree-map = active, chart-pie-simple = inactive).
// fill=currentColor so they inherit the tab text color (white active / black inactive).
const TAB_ICON_TREEMAP = markup(`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M6.83043 10.75L5.16956 10.75C4.63543 10.75 4.18955 10.75 3.82533 10.7203C3.44544 10.6892 3.08879 10.6221 2.75153 10.4503C2.23408 10.1866 1.81338 9.76592 1.54973 9.24847C1.37789 8.91121 1.31078 8.55455 1.27974 8.17467C1.24998 7.81044 1.24999 7.3646 1.25 6.83046V5.16955C1.24999 4.6354 1.24998 4.18956 1.27974 3.82533C1.31078 3.44544 1.37789 3.08879 1.54973 2.75153C1.81338 2.23408 2.23408 1.81338 2.75153 1.54973C3.08879 1.37789 3.44544 1.31078 3.82533 1.27974C4.18955 1.24998 4.63538 1.24999 5.16952 1.25H6.83045C7.36458 1.24999 7.81045 1.24998 8.17467 1.27974C8.55455 1.31078 8.91121 1.37789 9.24847 1.54973C9.76592 1.81339 10.1866 2.23408 10.4503 2.75153C10.6221 3.08879 10.6892 3.44545 10.7203 3.82533C10.75 4.18956 10.75 4.63541 10.75 5.16957V6.83043C10.75 7.36459 10.75 7.81044 10.7203 8.17467C10.6892 8.55455 10.6221 8.91121 10.4503 9.24847C10.1866 9.76592 9.76592 10.1866 9.24847 10.4503C8.91121 10.6221 8.55455 10.6892 8.17467 10.7203C7.81044 10.75 7.36459 10.75 6.83043 10.75ZM8.05252 9.22524C8.33965 9.20178 8.47693 9.1599 8.56749 9.11376C8.80269 8.99392 8.99392 8.80269 9.11376 8.56749C9.1599 8.47693 9.20178 8.33964 9.22524 8.05252C9.24942 7.75664 9.25 7.37243 9.25 6.8V5.2C9.25 4.62757 9.24942 4.24336 9.22524 3.94748C9.20178 3.66036 9.1599 3.52307 9.11376 3.43251C8.99392 3.19731 8.80269 3.00608 8.56749 2.88624C8.47693 2.8401 8.33965 2.79822 8.05252 2.77476C7.75664 2.75058 7.37243 2.75 6.8 2.75L5.2 2.75C4.62757 2.75 4.24336 2.75058 3.94748 2.77476C3.66035 2.79822 3.52307 2.8401 3.43251 2.88624C3.19731 3.00608 3.00608 3.19731 2.88624 3.43251C2.8401 3.52307 2.79822 3.66035 2.77476 3.94748C2.75058 4.24336 2.75 4.62757 2.75 5.2L2.75 6.8C2.75 7.37243 2.75058 7.75664 2.77476 8.05252C2.79822 8.33964 2.8401 8.47693 2.88624 8.56749C3.00608 8.80269 3.19731 8.99391 3.43251 9.11376C3.52307 9.1599 3.66035 9.20178 3.94748 9.22524C4.24336 9.24941 4.62757 9.25 5.2 9.25L6.8 9.25C7.37243 9.25 7.75664 9.24942 8.05252 9.22524Z" fill="currentColor"/><path fill-rule="evenodd" clip-rule="evenodd" d="M6.83043 22.75H5.16956C4.63541 22.75 4.18956 22.75 3.82533 22.7203C3.44544 22.6892 3.08879 22.6221 2.75153 22.4503C2.23408 22.1866 1.81338 21.7659 1.54973 21.2485C1.37789 20.9112 1.31078 20.5546 1.27974 20.1747C1.24998 19.8104 1.24999 19.3646 1.25 18.8305V17.1695C1.24999 16.6354 1.24998 16.1896 1.27974 15.8253C1.31078 15.4454 1.37789 15.0888 1.54973 14.7515C1.81338 14.2341 2.23408 13.8134 2.75153 13.5497C3.08879 13.3779 3.44544 13.3108 3.82533 13.2797C4.18954 13.25 4.63535 13.25 5.16945 13.25H6.83045C7.36458 13.25 7.81045 13.25 8.17467 13.2797C8.55455 13.3108 8.91121 13.3779 9.24847 13.5497C9.76592 13.8134 10.1866 14.2341 10.4503 14.7515C10.6221 15.0888 10.6892 15.4454 10.7203 15.8253C10.75 16.1896 10.75 16.6354 10.75 17.1696V18.8304C10.75 19.3646 10.75 19.8104 10.7203 20.1747C10.6892 20.5546 10.6221 20.9112 10.4503 21.2485C10.1866 21.7659 9.76592 22.1866 9.24847 22.4503C8.91121 22.6221 8.55455 22.6892 8.17467 22.7203C7.81044 22.75 7.36459 22.75 6.83043 22.75ZM8.05252 21.2252C8.33965 21.2018 8.47693 21.1599 8.56749 21.1138C8.80269 20.9939 8.99392 20.8027 9.11376 20.5675C9.1599 20.4769 9.20178 20.3396 9.22524 20.0525C9.24942 19.7566 9.25 19.3724 9.25 18.8V17.2C9.25 16.6276 9.24942 16.2434 9.22524 15.9475C9.20178 15.6604 9.1599 15.5231 9.11376 15.4325C8.99392 15.1973 8.80269 15.0061 8.56749 14.8862C8.47693 14.8401 8.33965 14.7982 8.05252 14.7748C7.75664 14.7506 7.37243 14.75 6.8 14.75H5.2C4.62757 14.75 4.24336 14.7506 3.94748 14.7748C3.66035 14.7982 3.52307 14.8401 3.43251 14.8862C3.19731 15.0061 3.00608 15.1973 2.88624 15.4325C2.8401 15.5231 2.79822 15.6604 2.77476 15.9475C2.75058 16.2434 2.75 16.6276 2.75 17.2L2.75 18.8C2.75 19.3724 2.75058 19.7566 2.77476 20.0525C2.79822 20.3396 2.8401 20.4769 2.88624 20.5675C3.00608 20.8027 3.19731 20.9939 3.43251 21.1138C3.52307 21.1599 3.66035 21.2018 3.94748 21.2252C4.24336 21.2494 4.62757 21.25 5.2 21.25H6.8C7.37243 21.25 7.75664 21.2494 8.05252 21.2252Z" fill="currentColor"/><path fill-rule="evenodd" clip-rule="evenodd" d="M20.0278 7.25C20.354 7.25001 20.6428 7.25003 20.8821 7.23048C21.1369 7.20966 21.4009 7.16298 21.658 7.03201C22.0343 6.84026 22.3403 6.5343 22.532 6.15798C22.663 5.90093 22.7097 5.63689 22.7305 5.38207C22.75 5.14277 22.75 4.85403 22.75 4.52778V4.47222C22.75 4.14597 22.75 3.85722 22.7305 3.61793C22.7097 3.36311 22.663 3.09906 22.532 2.84202C22.3403 2.46569 22.0343 2.15973 21.658 1.96799C21.4009 1.83701 21.1369 1.79034 20.8821 1.76952C20.6428 1.74997 20.354 1.74998 20.0278 1.75L15.4722 1.75C15.146 1.74998 14.8572 1.74997 14.6179 1.76952C14.3631 1.79034 14.0991 1.83701 13.842 1.96799C13.4657 2.15973 13.1597 2.46569 12.968 2.84202C12.837 3.09906 12.7903 3.36311 12.7695 3.61793C12.75 3.85722 12.75 4.14596 12.75 4.4722V4.52779C12.75 4.85404 12.75 5.14278 12.7695 5.38207C12.7903 5.63689 12.837 5.90093 12.968 6.15798C13.1597 6.5343 13.4657 6.84026 13.842 7.03201C14.0991 7.16298 14.3631 7.20966 14.6179 7.23048C14.8572 7.25003 15.146 7.25001 15.4722 7.25L20.0278 7.25ZM20.977 5.6955C20.9667 5.70077 20.922 5.72222 20.7599 5.73546C20.5891 5.74942 20.3624 5.75 20 5.75L15.5 5.75C15.1376 5.75 14.9109 5.74941 14.7401 5.73546C14.578 5.72222 14.5333 5.70077 14.523 5.6955C14.4289 5.64756 14.3524 5.57107 14.3045 5.47699C14.2992 5.46665 14.2778 5.42198 14.2645 5.25992C14.2506 5.08911 14.25 4.86241 14.25 4.5C14.25 4.13759 14.2506 3.91089 14.2645 3.74008C14.2778 3.57802 14.2992 3.53335 14.3045 3.523C14.3524 3.42892 14.4289 3.35243 14.523 3.3045C14.5333 3.29923 14.578 3.27778 14.7401 3.26454C14.9109 3.25058 15.1376 3.25 15.5 3.25L20 3.25C20.3624 3.25 20.5891 3.25058 20.7599 3.26454C20.922 3.27778 20.9667 3.29923 20.977 3.3045C21.0711 3.35243 21.1476 3.42892 21.1955 3.523C21.2008 3.53335 21.2222 3.57802 21.2355 3.74008C21.2494 3.91089 21.25 4.13759 21.25 4.5C21.25 4.86241 21.2494 5.08911 21.2355 5.25992C21.2222 5.42198 21.2008 5.46665 21.1955 5.47699C21.1476 5.57107 21.0711 5.64757 20.977 5.6955Z" fill="currentColor"/><path fill-rule="evenodd" clip-rule="evenodd" d="M20.0278 14.75H15.4722C15.146 14.75 14.8572 14.75 14.6179 14.7305C14.3631 14.7097 14.0991 14.663 13.842 14.532C13.4657 14.3403 13.1597 14.0343 12.968 13.658C12.837 13.4009 12.7903 13.1369 12.7695 12.8821C12.75 12.6428 12.75 12.354 12.75 12.0278V11.9722C12.75 11.646 12.75 11.3572 12.7695 11.1179C12.7903 10.8631 12.837 10.5991 12.968 10.342C13.1597 9.96569 13.4657 9.65973 13.842 9.46799C14.0991 9.33701 14.3631 9.29034 14.6179 9.26952C14.8572 9.24997 15.146 9.24998 15.4722 9.25L20.0278 9.25C20.354 9.24998 20.6428 9.24997 20.8821 9.26952C21.1369 9.29034 21.4009 9.33701 21.658 9.46799C22.0343 9.65973 22.3403 9.96569 22.532 10.342C22.663 10.5991 22.7097 10.8631 22.7305 11.1179C22.75 11.3572 22.75 11.646 22.75 11.9722V12.0278C22.75 12.354 22.75 12.6428 22.7305 12.8821C22.7097 13.1369 22.663 13.4009 22.532 13.658C22.3403 14.0343 22.0343 14.3403 21.658 14.532C21.4009 14.663 21.1369 14.7097 20.8821 14.7305C20.6428 14.75 20.354 14.75 20.0278 14.75ZM20.7599 13.2355C20.922 13.2222 20.9667 13.2008 20.977 13.1955C21.0711 13.1476 21.1476 13.0711 21.1955 12.977C21.2008 12.9667 21.2222 12.922 21.2355 12.7599C21.2494 12.5891 21.25 12.3624 21.25 12C21.25 11.6376 21.2494 11.4109 21.2355 11.2401C21.2222 11.078 21.2008 11.0333 21.1955 11.023C21.1476 10.9289 21.0711 10.8524 20.977 10.8045C20.9667 10.7992 20.922 10.7778 20.7599 10.7645C20.5891 10.7506 20.3624 10.75 20 10.75L15.5 10.75C15.1376 10.75 14.9109 10.7506 14.7401 10.7645C14.578 10.7778 14.5333 10.7992 14.523 10.8045C14.4289 10.8524 14.3524 10.9289 14.3045 11.023C14.2992 11.0333 14.2778 11.078 14.2645 11.2401C14.2506 11.4109 14.25 11.6376 14.25 12C14.25 12.3624 14.2506 12.5891 14.2645 12.7599C14.2778 12.922 14.2992 12.9666 14.3045 12.977C14.3524 13.0711 14.4289 13.1476 14.523 13.1955C14.5333 13.2008 14.578 13.2222 14.7401 13.2355C14.9109 13.2494 15.1376 13.25 15.5 13.25H20C20.3624 13.25 20.5891 13.2494 20.7599 13.2355Z" fill="currentColor"/><path fill-rule="evenodd" clip-rule="evenodd" d="M20.0278 22.25C20.354 22.25 20.6428 22.25 20.8821 22.2305C21.1369 22.2097 21.4009 22.163 21.658 22.032C22.0343 21.8403 22.3403 21.5343 22.532 21.158C22.663 20.9009 22.7097 20.6369 22.7305 20.3821C22.75 20.1428 22.75 19.854 22.75 19.5278V19.4722C22.75 19.146 22.75 18.8572 22.7305 18.6179C22.7097 18.3631 22.663 18.0991 22.532 17.842C22.3403 17.4657 22.0343 17.1597 21.658 16.968C21.4009 16.837 21.1369 16.7903 20.8821 16.7695C20.6428 16.75 20.354 16.75 20.0278 16.75L15.4722 16.75C15.146 16.75 14.8572 16.75 14.6179 16.7695C14.3631 16.7903 14.0991 16.837 13.842 16.968C13.4657 17.1597 13.1597 17.4657 12.968 17.842C12.837 18.0991 12.7903 18.3631 12.7695 18.6179C12.75 18.8572 12.75 19.146 12.75 19.4722V19.5278C12.75 19.854 12.75 20.1428 12.7695 20.3821C12.7903 20.6369 12.837 20.9009 12.968 21.158C13.1597 21.5343 13.4657 21.8403 13.842 22.032C14.0991 22.163 14.3631 22.2097 14.6179 22.2305C14.8572 22.25 15.1459 22.25 15.4721 22.25H20.0278ZM20.977 20.6955C20.9667 20.7008 20.922 20.7222 20.7599 20.7355C20.5891 20.7494 20.3624 20.75 20 20.75H15.5C15.1376 20.75 14.9109 20.7494 14.7401 20.7355C14.578 20.7222 14.5333 20.7008 14.523 20.6955C14.4289 20.6476 14.3524 20.5711 14.3045 20.477C14.2992 20.4666 14.2778 20.422 14.2645 20.2599C14.2506 20.0891 14.25 19.8624 14.25 19.5C14.25 19.1376 14.2506 18.9109 14.2645 18.7401C14.2778 18.578 14.2992 18.5333 14.3045 18.523C14.3524 18.4289 14.4289 18.3524 14.523 18.3045C14.5333 18.2992 14.578 18.2778 14.7401 18.2645C14.9109 18.2506 15.1376 18.25 15.5 18.25H20C20.3624 18.25 20.5891 18.2506 20.7599 18.2645C20.922 18.2778 20.9667 18.2992 20.977 18.3045C21.0711 18.3524 21.1476 18.4289 21.1955 18.523C21.2008 18.5333 21.2222 18.578 21.2355 18.7401C21.2494 18.9109 21.25 19.1376 21.25 19.5C21.25 19.8624 21.2494 20.0891 21.2355 20.2599C21.2222 20.422 21.2008 20.4667 21.1955 20.477C21.1476 20.5711 21.0711 20.6476 20.977 20.6955Z" fill="currentColor"/></svg>`);
const TAB_ICON_PIE = markup(`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M11.5324 0.761423C10.8099 0.730493 10.25 1.31763 10.25 2.00005V2.77702C4.93924 3.16108 0.75 7.59131 0.75 13C0.75 18.6609 5.33908 23.25 11 23.25C16.4087 23.25 20.8389 19.0608 21.223 13.75H22C22.6824 13.75 23.2696 13.1902 23.2386 12.4676C22.9671 6.12537 17.8747 1.03292 11.5324 0.761423ZM20.5086 12.25C20.5058 12.25 20.5029 12.25 20.5 12.25C20.4971 12.25 20.4942 12.25 20.4914 12.25H11.75V2.27578C17.0891 2.64349 21.3566 6.91097 21.7243 12.25H20.5086ZM10.25 4.28169V12.5C10.25 13.1904 10.8096 13.75 11.5 13.75H19.7183C19.3379 18.2314 15.5798 21.75 11 21.75C6.16751 21.75 2.25 17.8325 2.25 13C2.25 8.42015 5.7686 4.66212 10.25 4.28169Z" fill="currentColor"/></svg>`);

export class Banner extends Component {
    static template = xml`
        <div class="o_baha_header">
            <div class="o_baha_header__top">
                <div class="o_baha_header__logo">
                    <img src="/dashboard_app/website_logo" alt="logo"/>
                </div>
                <div class="o_baha_header__user" t-on-click="toggleMenu">
                    <img class="o_baha_header__avatar" t-att-src="avatarUrl" alt="user"/>
                    <i class="fa fa-angle-down o_baha_header__caret"/>
                    <t t-if="state.menuOpen">
                        <div class="o_baha_header__menu" t-on-click.stop="() => {}">
                            <div class="o_baha_header__menu-name" t-esc="userName"/>
                            <t t-if="props.onAction">
                                <div class="o_baha_header__menu-item" t-on-click="() => this.doAction('import')">
                                    <i class="fa fa-upload"/><span>استيراد</span>
                                </div>
                                <div t-if="props.canAdvancedImport" class="o_baha_header__menu-item" t-on-click="() => this.doAction('advanced_import')">
                                    <i class="fa fa-sliders"/><span>استيراد متقدم</span>
                                </div>
                                <div class="o_baha_header__menu-item" t-on-click="() => this.doAction('export')">
                                    <i class="fa fa-download"/><span>تصدير</span>
                                </div>
                                <div class="o_baha_header__menu-sep"/>
                            </t>
                            <a class="o_baha_header__logout" t-att-href="logoutUrl">
                                <i class="fa fa-sign-out"/>
                                <span>تسجيل الخروج</span>
                            </a>
                        </div>
                    </t>
                </div>
            </div>

            <div class="o_baha_header__triangles"/>

            <div class="o_baha_header__row2">
                <div class="o_baha_header__welcome">
                    <div class="o_baha_header__greeting">
                        <t t-esc="props.comp.data.greeting"/>
                        <span class="o_baha_header__wave">👋</span>
                    </div>
                    <div class="o_baha_header__update" t-if="props.comp.data.last_update">
                        <span class="o_baha_header__dot"/>
                        <t t-esc="props.comp.data.last_update"/>
                    </div>
                </div>

                <div class="o_baha_header__controls">
                    <div class="o_baha_header__tabs" t-if="props.tabs and props.tabs.length > 1">
                        <t t-foreach="props.tabs" t-as="tab" t-key="tab.id">
                            <button class="o_baha_tab"
                                    t-att-class="{ 'o_baha_tab--active': tab_index === props.activeIndex }"
                                    t-on-click="() => this.props.onSelectTab(tab_index)">
                                <span class="o_baha_tab__ico" t-out="tab_index === 0 ? tabIconActive : tabIconInactive"/>
                                <span class="o_baha_tab__label" t-esc="tab.name"/>
                                <i t-if="props.editing and props.tabs.length > 1"
                                   class="fa fa-times o_baha_tab__remove" title="إزالة التبويب"
                                   t-on-click.stop="() => this.props.onRemoveTab(tab.id)"/>
                            </button>
                        </t>
                    </div>
                    <t t-if="state.mode !== 'quarter'">
                        <div class="o_baha_header__datepill" t-on-click="openPicker">
                            <span class="o_baha_header__cal" t-out="calIcon"/>
                            <span class="o_baha_header__date-label" t-esc="dateLabel"/>
                            <i class="fa fa-angle-down o_baha_header__date-caret"/>
                            <input type="text" t-ref="dateInput" class="o_baha_header__date-native" readonly="readonly"/>
                        </div>
                    </t>
                    <t t-if="props.onFilter">
                        <div class="o_baha_header__filter">
                            <div class="o_baha_filterpill" t-on-click="toggleModeMenu">
                                <i class="fa fa-filter"/>
                                <span t-esc="modeLabel"/>
                                <i class="fa fa-angle-down"/>
                                <t t-if="state.modeMenuOpen">
                                    <div class="o_baha_filter__menu" t-on-click.stop="() => {}">
                                        <div class="o_baha_filter__opt" t-att-class="{'o_baha_filter__opt--active': state.mode==='uptodate'}" t-on-click="() => this.setMode('uptodate')">حتى تاريخ</div>
                                        <div class="o_baha_filter__opt" t-att-class="{'o_baha_filter__opt--active': state.mode==='period'}" t-on-click="() => this.setMode('period')">فترة (من - إلى)</div>
                                        <div class="o_baha_filter__opt" t-att-class="{'o_baha_filter__opt--active': state.mode==='quarter'}" t-on-click="() => this.setMode('quarter')">ربع سنة</div>
                                    </div>
                                </t>
                            </div>
                            <div class="o_baha_filter__quarters" t-if="state.mode === 'quarter'">
                                <select class="o_baha_filter__yearsel" t-on-change="setYear">
                                    <t t-foreach="yearOptions" t-as="y" t-key="y">
                                        <option t-att-value="y" t-att-selected="y === state.year" t-esc="y"/>
                                    </t>
                                </select>
                                <t t-foreach="[1,2,3,4]" t-as="q" t-key="q">
                                    <button class="o_baha_qbtn" t-att-class="{ 'o_baha_qbtn--active': state.qnum === q }"
                                            t-on-click="() => this.setQuarter(q)">Q<t t-esc="q"/></button>
                                </t>
                            </div>
                        </div>
                    </t>
                </div>
            </div>
        </div>`;
    static props = ["comp", "colors", "onAction?", "canAdvancedImport?", "tabs?", "activeIndex?", "onSelectTab?", "filter?", "onFilter?", "editing?", "onRemoveTab?"];

    setup() {
        const f = this.props.filter || { mode: "uptodate", date: todayISO() };
        const now = new Date();
        let qnum = Math.floor(now.getMonth() / 3) + 1, year = now.getFullYear();
        const qm = /^(\d{4})-Q([1-4])$/.exec(f.quarter || "");
        if (qm) { year = parseInt(qm[1], 10); qnum = parseInt(qm[2], 10); }
        this.state = useState({
            menuOpen: false,
            modeMenuOpen: false,
            mode: (f.mode === "all" ? "uptodate" : f.mode) || "uptodate",   // no 'all' in the UI
            date: f.date || todayISO(),
            from: f.from || f.date || todayISO(),
            to: f.to || f.date || todayISO(),
            qnum, year,
        });
        this.dateInput = useRef("dateInput");
        this.fp = null;
        this._fpMode = null;
        this._onDocPointerDown = null;
        this._onCloseOverlaysEvent = null;
        onMounted(() => {
            this.syncPickers();
            this._onDocPointerDown = (ev) => this._handleClickOutside(ev);
            this._onCloseOverlaysEvent = (ev) => {
                if (this.closeAllOverlays()) {
                    ev.detail.closed = true;
                }
            };
            document.addEventListener("mousedown", this._onDocPointerDown, true);
            document.addEventListener("touchstart", this._onDocPointerDown, true);
            document.addEventListener(BAHA_CLOSE_OVERLAYS, this._onCloseOverlaysEvent);
        });
        onPatched(() => this.syncPickers());
        onWillUnmount(() => {
            if (this._onDocPointerDown) {
                document.removeEventListener("mousedown", this._onDocPointerDown, true);
                document.removeEventListener("touchstart", this._onDocPointerDown, true);
            }
            if (this._onCloseOverlaysEvent) {
                document.removeEventListener(BAHA_CLOSE_OVERLAYS, this._onCloseOverlaysEvent);
            }
            if (this.fp) {
                this.fp.destroy();
                this.fp = null;
            }
        });
    }
    // One flatpickr on the date pill: 'range' (2 dates) in period mode, 'single'
    // in uptodate mode; destroyed in quarter mode (the pill is hidden). Re-inited
    // on mode change. onPatched keeps it in sync as the pill appears/disappears.
    syncPickers() {
        const fp = window.flatpickr;
        if (!fp) return;
        const showDate = this.state.mode !== "quarter";
        const wantMode = this.state.mode === "period" ? "range" : "single";
        if (showDate && this.dateInput.el) {
            if (!this.fp || this._fpMode !== wantMode) {
                if (this.fp) this.fp.destroy();
                this.fp = fp(this.dateInput.el, this.fpOptions(wantMode));
                this._fpMode = wantMode;
            }
        } else if (!showDate && this.fp) {
            this.fp.destroy(); this.fp = null; this._fpMode = null;
        }
    }
    fpOptions(fpMode) {
        const fp = window.flatpickr;
        const pad = (n) => String(n).padStart(2, "0");
        const iso = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
        return {
            locale: fp.l10ns && fp.l10ns.ar ? "ar" : "default",
            defaultDate: fpMode === "range" ? [this.state.from, this.state.to] : this.state.date,
            dateFormat: "Y-m-d",
            mode: fpMode,
            clickOpens: false,
            disableMobile: true,
            monthSelectorType: "static",
            onReady: (dates, str, inst) => this.addYearDropdown(inst),
            onYearChange: (dates, str, inst) => this.syncYearDropdown(inst),
            onChange: (dates, str) => {
                if (fpMode === "range") {
                    if (dates.length === 2) {
                        this.state.from = iso(dates[0]);
                        this.state.to = iso(dates[1]);
                        this.emitFilter();
                    }
                } else if (str) {
                    this.state.date = str;
                    this.emitFilter();
                }
            },
        };
    }

    // ---- date filter (uptodate | period(range from-to) | quarter) ----
    toggleModeMenu() {
        this.state.modeMenuOpen = !this.state.modeMenuOpen;
        if (this.state.modeMenuOpen) {
            this.state.menuOpen = false;
        }
    }
    setMode(mode) {
        this.state.mode = mode;
        this.state.modeMenuOpen = false;
        this.emitFilter();
    }
    setQuarter(q) { this.state.qnum = q; this.state.mode = "quarter"; this.emitFilter(); }
    setYear(ev) { this.state.year = parseInt(ev.target.value, 10); this.emitFilter(); }
    emitFilter() {
        if (!this.props.onFilter) return;
        const mode = this.state.mode;
        const f = { mode };
        if (mode === "period") { f.from = this.state.from; f.to = this.state.to; f.date = this.state.from; }
        else if (mode === "quarter") { f.quarter = this.state.year + "-Q" + this.state.qnum; f.date = this.state.year + "-01-01"; }
        else { f.date = this.state.date; }
        this.props.onFilter(f);
    }
    get modeLabel() {
        return ({ uptodate: "حتى تاريخ", period: "فترة", quarter: "ربع سنة" })[this.state.mode] || "حتى تاريخ";
    }
    get dateLabel() {
        if (this.state.mode === "period") return this.state.from + " ← " + this.state.to;
        return this.state.date;
    }
    get yearOptions() {
        const now = new Date().getFullYear();
        const ys = [];
        for (let y = now - 10; y <= now + 5; y++) ys.push(y);
        return ys;
    }
    // Flatpickr has no year dropdown (only a number spinner). Inject a <select>
    // of years into the calendar header so the year can be picked directly.
    addYearDropdown(inst) {
        const header = inst.calendarContainer.querySelector(".flatpickr-current-month");
        if (!header || header.querySelector(".o_baha_year_select")) return;
        const numWrap = header.querySelector(".numInputWrapper");
        const select = document.createElement("select");
        select.className = "o_baha_year_select";
        const now = new Date().getFullYear();
        for (let y = now - 10; y <= now + 10; y++) {
            const opt = document.createElement("option");
            opt.value = String(y);
            opt.textContent = String(y);
            if (y === inst.currentYear) opt.selected = true;
            select.appendChild(opt);
        }
        select.addEventListener("change", (ev) =>
            inst.changeYear(parseInt(ev.target.value, 10))
        );
        if (numWrap) numWrap.style.display = "none";   // hide the number spinner
        header.appendChild(select);
    }
    syncYearDropdown(inst) {
        const select = inst.calendarContainer.querySelector(".o_baha_year_select");
        if (!select) return;
        const y = String(inst.currentYear);
        if (![...select.options].some((o) => o.value === y)) {
            const opt = document.createElement("option");
            opt.value = y;
            opt.textContent = y;
            select.appendChild(opt);
        }
        select.value = y;
    }
    closeAllOverlays() {
        let closed = false;
        if (this.fp?.isOpen) {
            this.fp.close();
            closed = true;
        }
        if (this.state.menuOpen) {
            this.state.menuOpen = false;
            closed = true;
        }
        if (this.state.modeMenuOpen) {
            this.state.modeMenuOpen = false;
            closed = true;
        }
        return closed;
    }
    _handleClickOutside(ev) {
        const target = ev.target;
        if (!target || typeof target.closest !== "function") {
            return;
        }
        if (target.closest(".flatpickr-calendar")) {
            return;
        }
        if (this.fp?.isOpen && !target.closest(".o_baha_header__datepill")) {
            this.fp.close();
        }
        if (this.state.menuOpen && !target.closest(".o_baha_header__user")) {
            this.state.menuOpen = false;
        }
        if (this.state.modeMenuOpen && !target.closest(".o_baha_filterpill")) {
            this.state.modeMenuOpen = false;
        }
    }
    // Click the pill: open if closed, close if already open (toggle).
    openPicker() {
        this.state.menuOpen = false;
        this.state.modeMenuOpen = false;
        if (this.fp) {
            this.fp.isOpen ? this.fp.close() : this.fp.open();
            return;
        }
        const el = this.dateInput.el;
        if (el && el.showPicker) {
            try { el.showPicker(); } catch (e) { /* no-op */ }
        }
    }
    toggleMenu() {
        this.state.menuOpen = !this.state.menuOpen;
        if (this.state.menuOpen) {
            this.state.modeMenuOpen = false;
            if (this.fp?.isOpen) {
                this.fp.close();
            }
        }
    }
    doAction(action) {
        this.state.menuOpen = false;
        if (this.props.onAction) {
            this.props.onAction(action);
        }
    }
    onDateChange(ev) {
        if (ev.target.value) {
            this.state.date = ev.target.value;
        }
    }
    get quarterLabel() {
        const d = new Date(this.state.date);
        if (isNaN(d)) return "";
        const q = Math.ceil((d.getUTCMonth() + 1) / 3);
        return `الربع ${QUARTER_NAMES[q - 1]} ${d.getUTCFullYear()}`;
    }
    get monthLabel() {
        const d = new Date(this.state.date);
        if (isNaN(d)) return "";
        return `${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
    }
    get calIcon() {
        return CAL_ICON;
    }
    get userName() {
        return user.name;
    }
    get avatarUrl() {
        return `/web/image/res.users/${user.userId}/avatar_128`;
    }
    get logoutUrl() {
        return "/web/session/logout?redirect=/web/login";
    }
    get tabIconActive() {
        return TAB_ICON_TREEMAP;
    }
    get tabIconInactive() {
        return TAB_ICON_PIE;
    }
}

// ---------------------------------------------------------------------------
// Toolbar — period filter + action buttons
// ---------------------------------------------------------------------------
export class Toolbar extends Component {
    static template = xml`
        <div class="o_baha_toolbar">
            <div class="o_baha_toolbar__period" t-if="props.comp.data.period">
                <i class="fa fa-calendar"/>
                <span t-esc="props.comp.data.period"/>
                <i class="fa fa-angle-down"/>
            </div>
            <div class="o_baha_toolbar__actions">
                <t t-foreach="actions" t-as="act" t-key="act_index">
                    <button class="o_baha_toolbar__btn"
                            t-att-class="{ 'o_baha_toolbar__btn--primary': act.primary }"
                            t-on-click="() => this.onClick(act)">
                        <i t-if="act.icon" t-att-class="'fa fa-' + act.icon"/>
                        <span t-esc="act.label"/>
                    </button>
                </t>
            </div>
        </div>`;
    static props = ["comp", "colors", "onAction?", "canAdvancedImport?"];

    get actions() {
        const actions = this.props.comp.data.actions || [];
        if (this.props.canAdvancedImport) {
            return actions;
        }
        return actions.filter((action) => action.action !== "advanced_import");
    }

    onClick(act) {
        if (act.action && this.props.onAction) {
            this.props.onAction(act.action);
        }
    }
}

// ---------------------------------------------------------------------------
// GaugeCard — circular ring gauge with %, label, trend
// ---------------------------------------------------------------------------
export class GaugeCard extends Component {
    static template = xml`
        <div class="o_baha_card o_baha_gauge"
             t-att-class="cardClass"
             t-att-tabindex="tabIndex"
             t-att-role="cardRole"
             t-on-click="() => this.openSelf()"
             t-on-keydown="onSelfKeydown">
            <div class="o_baha_gauge__info">
                <div class="o_baha_gauge__label" t-esc="props.comp.data.label"/>
                <div class="o_baha_trend" t-att-class="trendClass(props.comp.data.trend)">
                    <i t-att-class="props.comp.data.trend === 'down' ? 'fa fa-arrow-down' : 'fa fa-arrow-up'"/>
                    <span t-esc="props.comp.data.delta"/>
                </div>
            </div>
            <div class="o_baha_gauge__ring">
                <svg viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="34" class="o_baha_gauge__track"/>
                    <circle cx="40" cy="40" r="34" class="o_baha_gauge__value"
                            t-att-style="ringStyle"/>
                </svg>
                <div class="o_baha_gauge__pct">
                    <span t-esc="props.comp.data.value"/><small>%</small>
                </div>
            </div>
        </div>`;
    static props = ["comp", "colors", "onOpenRecord?", "onOpenDrilldown?"];

    trendClass(dir) { return trendClass(dir); }

    get cardClass() {
        return clickableClass(this.props.comp.data, "o_baha_clickable--card");
    }
    get tabIndex() {
        return isClickable(this.props.comp.data) ? 0 : undefined;
    }
    get cardRole() {
        return isClickable(this.props.comp.data) ? "button" : undefined;
    }
    openSelf() {
        openDataTarget(this.props.comp.data, this.props.onOpenRecord, this.props.onOpenDrilldown);
    }
    onSelfKeydown(ev) {
        onDataKeydown(ev, this.props.comp.data, this.props.onOpenRecord, this.props.onOpenDrilldown);
    }

    get ringStyle() {
        const r = 34;
        const circ = 2 * Math.PI * r;
        const val = Math.max(0, Math.min(100, this.props.comp.data.value || 0));
        const offset = circ * (1 - val / 100);
        const color = this.props.comp.data.color || this.props.colors.accent || "#00ab9d";
        return `stroke:${color};stroke-dasharray:${circ};stroke-dashoffset:${offset};`;
    }
}

// ---------------------------------------------------------------------------
// StatCard — number / fraction KPI + delta (big-number variant via data.big)
// ---------------------------------------------------------------------------
export class StatCard extends Component {
    static template = xml`
        <div class="o_baha_card o_baha_stat"
             t-att-class="cardClass"
             t-att-tabindex="tabIndex"
             t-att-role="cardRole"
             t-on-click="() => this.openSelf()"
             t-on-keydown="onSelfKeydown">
            <span t-if="props.comp.data.icon" class="o_baha_stat__ficon"><i t-attf-class="fa {{props.comp.data.icon}}"/></span>
            <div class="o_baha_stat__main">
                <div class="o_baha_stat__label" t-esc="props.comp.data.label"/>
                <div class="o_baha_stat__numrow">
                    <div class="o_baha_stat__value">
                        <span t-esc="props.comp.data.value"/><small t-if="props.comp.data.unit" t-esc="props.comp.data.unit"/>
                    </div>
                    <div t-if="props.comp.data.delta" class="o_baha_trend" t-att-class="trendClass(props.comp.data.delta_dir)">
                        <span class="o_baha_trend__pct" t-esc="props.comp.data.delta"/>
                        <span class="o_baha_trend__badge"><i t-att-class="props.comp.data.delta_dir === 'down' ? 'fa fa-arrow-down' : 'fa fa-arrow-up'"/></span>
                        <span t-if="props.comp.data.since" class="o_baha_gauge__since" t-esc="props.comp.data.since"/>
                    </div>
                </div>
            </div>
        </div>`;
    static props = ["comp", "colors", "onOpenRecord?", "onOpenDrilldown?"];
    trendClass(dir) { return trendClass(dir); }
    get cardClass() {
        return {
            "o_baha_stat--big": this.props.comp.data.big,
            "o_baha_stat--feature": this.props.comp.data.icon,
            "o_baha_clickable": isClickable(this.props.comp.data),
            "o_baha_clickable--card": isClickable(this.props.comp.data),
        };
    }
    get tabIndex() {
        return isClickable(this.props.comp.data) ? 0 : undefined;
    }
    get cardRole() {
        return isClickable(this.props.comp.data) ? "button" : undefined;
    }
    openSelf() {
        openDataTarget(this.props.comp.data, this.props.onOpenRecord, this.props.onOpenDrilldown);
    }
    onSelfKeydown(ev) {
        onDataKeydown(ev, this.props.comp.data, this.props.onOpenRecord, this.props.onOpenDrilldown);
    }
}

// ---------------------------------------------------------------------------
// ProgressCard — required-vs-actual completion bar
// ---------------------------------------------------------------------------
export class ProgressCard extends Component {
    static template = xml`
        <div class="o_baha_card o_baha_progress"
             t-att-class="cardClass"
             t-att-tabindex="tabIndex"
             t-att-role="cardRole"
             t-on-click="() => this.openSelf()"
             t-on-keydown="onSelfKeydown">
            <div class="o_baha_progress__head">
                <span class="o_baha_progress__label" t-esc="props.comp.data.label"/>
                <span class="o_baha_progress__value" t-esc="props.comp.data.value + '%'"/>
            </div>
            <div class="o_baha_progress__track">
                <div class="o_baha_progress__fill"
                     t-attf-style="width:{{props.comp.data.value}}%;background:{{props.comp.data.color or colorDefault}};"/>
            </div>
            <div t-if="props.comp.data.required" class="o_baha_progress__hint">
                المطلوب: <span t-esc="props.comp.data.required + '%'"/>
            </div>
        </div>`;
    static props = ["comp", "colors", "onOpenRecord?", "onOpenDrilldown?"];
    get colorDefault() { return this.props.colors.danger || "#ff5147"; }
    get cardClass() {
        return {
            "o_baha_clickable": isClickable(this.props.comp.data),
            "o_baha_clickable--card": isClickable(this.props.comp.data),
        };
    }
    get tabIndex() {
        return isClickable(this.props.comp.data) ? 0 : undefined;
    }
    get cardRole() {
        return isClickable(this.props.comp.data) ? "button" : undefined;
    }
    openSelf() {
        openDataTarget(this.props.comp.data, this.props.onOpenRecord, this.props.onOpenDrilldown);
    }
    onSelfKeydown(ev) {
        onDataKeydown(ev, this.props.comp.data, this.props.onOpenRecord, this.props.onOpenDrilldown);
    }
}

// ---------------------------------------------------------------------------
// BarChartH — horizontal ranked bars, color-coded by status
// ---------------------------------------------------------------------------
export class BarChartH extends Component {
    static template = xml`
        <div class="o_baha_card o_baha_barh">
            <div class="o_baha_card__head" t-if="props.comp.title and !props.comp.data.hide_head"><span class="o_baha_card__title" t-esc="props.comp.title"/><div class="o_baha_card__tools"><span class="o_baha_legend"><span class="o_baha_legend__item"><i class="o_baha_legend__dot o_baha_legend__dot--ok"/>علي المسار</span><span class="o_baha_legend__item"><i class="o_baha_legend__dot o_baha_legend__dot--risk"/>متأخر</span><span class="o_baha_legend__item"><i class="o_baha_legend__dot o_baha_legend__dot--late"/>متأخر جدا</span><span class="o_baha_legend__item"><i class="o_baha_legend__dot o_baha_legend__dot--none"/>لم يتم القياس</span></span><i class="fa fa-expand o_baha_panel__expand" t-on-click="menu.toggleMenu" t-on-keydown="menu.onMenuKeydown" tabindex="0" role="button" title="عرض التفاصيل"/><span class="o_baha_panel__menuwrap" t-ref="menuwrap"><i class="fa fa-ellipsis-v o_baha_panel__menu" t-att-class="{ 'o_baha_panel__menu--active': menu.drillItems.length, 'o_baha_panel__menu--on': menu.state.menuOpen }" t-att-role="menu.drillItems.length ? 'button' : undefined" t-att-tabindex="menu.drillItems.length ? 0 : undefined" t-att-title="menu.drillItems.length ? 'عرض التفاصيل' : ''" t-on-click="menu.toggleMenu" t-on-keydown="menu.onMenuKeydown"/><div t-if="menu.state.menuOpen" class="o_baha_panel__dropdown" t-attf-style="top:{{menu.state.menuPos.top}}px;left:{{menu.state.menuPos.left}}px;"><t t-foreach="menu.drillItems" t-as="d" t-key="d_index"><button class="o_baha_panel__dropitem" t-on-click="() => this.menu.pickDrill(d)"><i class="fa fa-table"/><span t-esc="d.label"/></button></t></div></span></div></div>
            <div class="o_baha_barh__rows">
                <t t-foreach="props.comp.data.items or []" t-as="item" t-key="item_index">
                    <div class="o_baha_barh__row"
                         t-att-class="clickableClass(item)"
                         t-att-tabindex="isClickable(item) ? 0 : undefined"
                         t-att-role="isClickable(item) ? 'button' : undefined"
                         t-on-click="() => this.openItem(item)"
                         t-on-keydown="(ev) => this.onItemKeydown(ev, item)">
                        <span class="o_baha_barh__label" t-esc="item.label"/>
                        <div class="o_baha_barh__track">
                            <div class="o_baha_barh__fill"
                                 t-attf-style="width:{{pct(item.value)}}%;background:{{item.color or colorAccent}};"/>
                            <span class="o_baha_barh__val">%<t t-esc="item.value"/></span>
                        </div>
                    </div>
                </t>
            </div>
        </div>`;
    static props = ["comp", "colors", "onOpenRecord?", "onOpenDrilldown?"];
    setup() {
        this.menu = useDrillMenu(this, () => this.props.comp.data.items || []);
    }
    get colorAccent() { return this.props.colors.accent || "#00ab9d"; }
    isClickable(item) { return isClickable(item); }
    clickableClass(item) { return clickableClass(item); }
    openItem(item) { dispatchItemClick(item, this.props.onOpenRecord, this.props.onOpenDrilldown); }
    onItemKeydown(ev, item) { onItemKeydown(ev, item, this.props.onOpenRecord, this.props.onOpenDrilldown); }
    get max() {
        const items = this.props.comp.data.items || [];
        return this.props.comp.data.max || Math.max(1, ...items.map((i) => i.value || 0));
    }
    // Bar GEOMETRY only — clamped to 0..100 so a value above `max` (a KPI that
    // beat its target, e.g. 118%) cannot render a fill wider than its track.
    // The label still shows the true value; only the drawing is capped.
    pct(v) { return Math.max(0, Math.min(100, Math.round(((v || 0) / this.max) * 100))); }
}

// ---------------------------------------------------------------------------
// BarChartV — vertical bars
// ---------------------------------------------------------------------------
export class BarChartV extends Component {
    static template = xml`
        <div class="o_baha_card o_baha_barv">
            <div class="o_baha_card__title" t-if="props.comp.title and !props.comp.data.hide_head" t-esc="props.comp.title"/>
            <div class="o_baha_barv__plot">
                <div class="o_baha_barv__yaxis">
                    <span>100%</span><span>80%</span><span>60%</span><span>40%</span><span>20%</span>
                </div>
                <div class="o_baha_barv__cols">
                    <t t-foreach="props.comp.data.items or []" t-as="item" t-key="item_index">
                        <div class="o_baha_barv__col">
                            <div class="o_baha_barv__bars">
                                <t t-if="item.bars">
                                    <t t-foreach="item.bars" t-as="b" t-key="b_index">
                                        <div class="o_baha_barv__bar" t-attf-style="height:{{pct(b.value)}}%;background:{{b.color or colorAccent}};"/>
                                    </t>
                                </t>
                                <div t-else="" class="o_baha_barv__bar" t-attf-style="height:{{pct(item.value)}}%;background:{{item.color or colorAccent}};"/>
                            </div>
                            <span class="o_baha_barv__label" t-esc="item.label"/>
                        </div>
                    </t>
                </div>
            </div>
        </div>`;
    static props = ["comp", "colors", "onOpenRecord?", "onOpenDrilldown?"];
    get colorAccent() { return this.props.colors.accent || "#00ab9d"; }
    isClickable(item) { return isClickable(item); }
    clickableClass(item) { return clickableClass(item); }
    openItem(item) { dispatchItemClick(item, this.props.onOpenRecord, this.props.onOpenDrilldown); }
    onItemKeydown(ev, item) { onItemKeydown(ev, item, this.props.onOpenRecord, this.props.onOpenDrilldown); }
    get max() {
        const items = this.props.comp.data.items || [];
        return this.props.comp.data.max || Math.max(1, ...items.map((i) => i.value || 0));
    }
    // Clamped for the same reason as BarChartH — a value over `max` must not
    // draw a column taller than the plot area.
    pct(v) { return Math.max(0, Math.min(100, Math.round(((v || 0) / this.max) * 100))); }
}

// ---------------------------------------------------------------------------
// DataTable — status/alerts table with red "delayed" row flags
// ---------------------------------------------------------------------------
export class DataTable extends Component {
    static template = xml`
        <div class="o_baha_card o_baha_table">
            <div class="o_baha_card__head" t-if="props.comp.title and !props.comp.data.hide_head"><span class="o_baha_card__title" t-esc="props.comp.title"/><div class="o_baha_card__tools"><span class="o_baha_legend"><span class="o_baha_legend__item"><i class="o_baha_legend__dot o_baha_legend__dot--ok"/>علي المسار</span><span class="o_baha_legend__item"><i class="o_baha_legend__dot o_baha_legend__dot--risk"/>متأخر</span><span class="o_baha_legend__item"><i class="o_baha_legend__dot o_baha_legend__dot--late"/>متأخر جدا</span><span class="o_baha_legend__item"><i class="o_baha_legend__dot o_baha_legend__dot--none"/>لم يتم القياس</span></span><i class="fa fa-expand o_baha_panel__expand" t-on-click="menu.toggleMenu" t-on-keydown="menu.onMenuKeydown" tabindex="0" role="button" title="عرض التفاصيل"/><span class="o_baha_panel__menuwrap" t-ref="menuwrap"><i class="fa fa-ellipsis-v o_baha_panel__menu" t-att-class="{ 'o_baha_panel__menu--active': menu.drillItems.length, 'o_baha_panel__menu--on': menu.state.menuOpen }" t-att-role="menu.drillItems.length ? 'button' : undefined" t-att-tabindex="menu.drillItems.length ? 0 : undefined" t-att-title="menu.drillItems.length ? 'عرض التفاصيل' : ''" t-on-click="menu.toggleMenu" t-on-keydown="menu.onMenuKeydown"/><div t-if="menu.state.menuOpen" class="o_baha_panel__dropdown" t-attf-style="top:{{menu.state.menuPos.top}}px;left:{{menu.state.menuPos.left}}px;"><t t-foreach="menu.drillItems" t-as="d" t-key="d_index"><button class="o_baha_panel__dropitem" t-on-click="() => this.menu.pickDrill(d)"><i class="fa fa-table"/><span t-esc="d.label"/></button></t></div></span></div></div>
            <table>
                <thead>
                    <tr>
                        <t t-foreach="props.comp.data.columns or []" t-as="col" t-key="col_index">
                            <th t-esc="col"/>
                        </t>
                    </tr>
                </thead>
                <tbody>
                    <t t-foreach="props.comp.data.rows or []" t-as="row" t-key="row_index">
                        <tr t-att-class="{ 'o_baha_table__row--delayed': row.status === 'delayed', 'o_baha_table__row--clickable': isClickable(row) }"
                            t-att-tabindex="isClickable(row) ? 0 : undefined"
                            t-att-role="isClickable(row) ? 'button' : undefined"
                            t-on-click="() => this.openRow(row)"
                            t-on-keydown="(ev) => this.onRowKeydown(ev, row)">
                            <t t-foreach="row.cells" t-as="cell" t-key="cell_index">
                                <td>
                                    <t t-if="cell and cell.type === 'progress'">
                                        <div class="o_baha_cellbar">
                                            <div class="o_baha_cellbar__track">
                                                <div class="o_baha_cellbar__fill"
                                                     t-attf-style="width:{{cell.value}}%;background:{{cell.color or colorAccent}};"/>
                                            </div>
                                            <span class="o_baha_cellbar__val" t-esc="cell.value + '%'"/>
                                        </div>
                                    </t>
                                    <t t-elif="cell and cell.type === 'badge'">
                                        <span class="o_baha_badge" t-attf-class="o_baha_badge--{{cell.level or 'mid'}}" t-esc="cell.label"/>
                                    </t>
                                    <t t-elif="cell and cell.type === 'tag'">
                                        <span class="o_baha_tag" t-attf-style="{{cell.color ? 'color:'+cell.color+';border-color:'+cell.color : ''}}" t-esc="cell.label"/>
                                    </t>
                                    <t t-else=""><span t-esc="cell"/></t>
                                </td>
                            </t>
                        </tr>
                    </t>
                </tbody>
            </table>
        </div>`;
    static props = ["comp", "colors", "onOpenRecord?", "onOpenDrilldown?"];
    setup() {
        this.menu = useDrillMenu(this, () => this.props.comp.data.rows || []);
    }
    get colorAccent() { return this.props.colors.accent || "#00ab9d"; }
    isClickable(row) { return isClickable(row); }
    openRow(row) {
        dispatchItemClick(row, this.props.onOpenRecord, this.props.onOpenDrilldown);
    }
    onRowKeydown(ev, row) {
        onItemKeydown(ev, row, this.props.onOpenRecord, this.props.onOpenDrilldown);
    }
}

// ---------------------------------------------------------------------------
// GaugeSemi — semicircle gauge with min-max scale + value + target
// ---------------------------------------------------------------------------
export class GaugeSemi extends Component {
    static template = xml`
        <div class="o_baha_card o_baha_semi"
             t-att-class="cardClass"
             t-att-tabindex="tabIndex"
             t-att-role="cardRole"
             t-on-click="() => this.openSelf()"
             t-on-keydown="onSelfKeydown">
            <div class="o_baha_semi__label" t-esc="props.comp.data.label"/>
            <div class="o_baha_semi__chart">
                <svg viewBox="0 0 120 66">
                    <path d="M10 60 A50 50 0 0 1 110 60" class="o_baha_semi__track"/>
                    <path d="M10 60 A50 50 0 0 1 110 60" class="o_baha_semi__value" t-att-style="arcStyle"/>
                </svg>
                <div class="o_baha_semi__big">
                    <span t-esc="props.comp.data.value"/><small t-if="props.comp.data.unit" t-esc="props.comp.data.unit"/>
                </div>
            </div>
            <div class="o_baha_semi__scale">
                <span t-esc="props.comp.data.min"/>
                <span t-esc="props.comp.data.max"/>
            </div>
            <div t-if="props.comp.data.delta" class="o_baha_trend" t-att-class="trendCls">
                <i t-att-class="props.comp.data.trend === 'down' ? 'fa fa-arrow-down' : 'fa fa-arrow-up'"/>
                <span t-esc="props.comp.data.delta"/>
            </div>
        </div>`;
    static props = ["comp", "colors", "onOpenRecord?", "onOpenDrilldown?"];
    get trendCls() { return trendClass(this.props.comp.data.trend); }
    get cardClass() {
        return {
            "o_baha_clickable": isClickable(this.props.comp.data),
            "o_baha_clickable--card": isClickable(this.props.comp.data),
        };
    }
    get tabIndex() {
        return isClickable(this.props.comp.data) ? 0 : undefined;
    }
    get cardRole() {
        return isClickable(this.props.comp.data) ? "button" : undefined;
    }
    openSelf() {
        openDataTarget(this.props.comp.data, this.props.onOpenRecord, this.props.onOpenDrilldown);
    }
    onSelfKeydown(ev) {
        onDataKeydown(ev, this.props.comp.data, this.props.onOpenRecord, this.props.onOpenDrilldown);
    }
    get arcStyle() {
        const len = 157;  // ~ semicircle arc length for r=50
        const d = this.props.comp.data;
        let pct = d.pct;
        if (pct === undefined) {
            const min = d.min_value !== undefined ? d.min_value : 0;
            const max = d.max_value !== undefined ? d.max_value : 100;
            const v = parseFloat(d.value) || 0;
            pct = max > min ? ((v - min) / (max - min)) * 100 : 0;
        }
        pct = Math.max(0, Math.min(100, pct));
        const color = d.color || this.props.colors.accent || "#00ab9d";
        return `stroke:${color};stroke-dasharray:${len};stroke-dashoffset:${len * (1 - pct / 100)};`;
    }
}

// ---------------------------------------------------------------------------
// KpiGaugeCard — small ring + current/target + quality badge
// ---------------------------------------------------------------------------
export class KpiGaugeCard extends Component {
    static template = xml`
        <div class="o_baha_card o_baha_kpi"
             t-att-class="cardClass"
             t-att-tabindex="tabIndex"
             t-att-role="cardRole"
             t-on-click="() => this.openSelf()"
             t-on-keydown="onSelfKeydown">
            <div class="o_baha_kpi__top">
                <span class="o_baha_kpi__name" t-esc="props.comp.data.label"/>
                <span t-if="props.comp.data.quality" class="o_baha_badge" t-attf-class="o_baha_badge--{{props.comp.data.quality_level or 'mid'}}" t-esc="props.comp.data.quality"/>
            </div>
            <div class="o_baha_kpi__body">
                <div class="o_baha_gauge__ring o_baha_kpi__ring">
                    <svg viewBox="0 0 80 80">
                        <circle cx="40" cy="40" r="34" class="o_baha_gauge__track"/>
                        <circle cx="40" cy="40" r="34" class="o_baha_gauge__value" t-att-style="ringStyle"/>
                    </svg>
                    <div class="o_baha_gauge__pct"><span t-esc="props.comp.data.pct"/><small>%</small></div>
                </div>
                <div class="o_baha_kpi__nums">
                    <div class="o_baha_kpi__cur"><span t-esc="props.comp.data.value"/></div>
                    <div class="o_baha_kpi__target">المستهدف: <span t-esc="props.comp.data.target"/></div>
                </div>
            </div>
        </div>`;
    static props = ["comp", "colors", "onOpenRecord?", "onOpenDrilldown?"];
    get cardClass() {
        return {
            "o_baha_clickable": isClickable(this.props.comp.data),
            "o_baha_clickable--card": isClickable(this.props.comp.data),
        };
    }
    get tabIndex() {
        return isClickable(this.props.comp.data) ? 0 : undefined;
    }
    get cardRole() {
        return isClickable(this.props.comp.data) ? "button" : undefined;
    }
    openSelf() {
        openDataTarget(this.props.comp.data, this.props.onOpenRecord, this.props.onOpenDrilldown);
    }
    onSelfKeydown(ev) {
        onDataKeydown(ev, this.props.comp.data, this.props.onOpenRecord, this.props.onOpenDrilldown);
    }
    get ringStyle() {
        const r = 34, circ = 2 * Math.PI * r;
        const v = Math.max(0, Math.min(100, this.props.comp.data.pct || 0));
        const color = this.props.comp.data.color || this.props.colors.accent || "#00ab9d";
        return `stroke:${color};stroke-dasharray:${circ};stroke-dashoffset:${circ * (1 - v / 100)};`;
    }
}

// ---------------------------------------------------------------------------
// BudgetSplitBar — منصرف / متبقي two-segment bar
// ---------------------------------------------------------------------------
export class BudgetSplitBar extends Component {
    static template = xml`
        <div class="o_baha_card o_baha_split"
             t-att-class="cardClass"
             t-att-tabindex="tabIndex"
             t-att-role="cardRole"
             t-on-click="() => this.openSelf()"
             t-on-keydown="onSelfKeydown">
            <div class="o_baha_card__head" t-if="props.comp.title and !props.comp.data.hide_head"><span class="o_baha_card__title" t-esc="props.comp.title"/><div class="o_baha_card__tools"><span class="o_baha_legend"><span class="o_baha_legend__item"><i class="o_baha_legend__dot o_baha_legend__dot--ok"/>علي المسار</span><span class="o_baha_legend__item"><i class="o_baha_legend__dot o_baha_legend__dot--risk"/>متأخر</span><span class="o_baha_legend__item"><i class="o_baha_legend__dot o_baha_legend__dot--late"/>متأخر جدا</span><span class="o_baha_legend__item"><i class="o_baha_legend__dot o_baha_legend__dot--none"/>لم يتم القياس</span></span><i class="fa fa-expand o_baha_panel__expand" t-on-click="menu.toggleMenu" t-on-keydown="menu.onMenuKeydown" tabindex="0" role="button" title="عرض التفاصيل"/><span class="o_baha_panel__menuwrap" t-ref="menuwrap"><i class="fa fa-ellipsis-v o_baha_panel__menu" t-att-class="{ 'o_baha_panel__menu--active': menu.drillItems.length, 'o_baha_panel__menu--on': menu.state.menuOpen }" t-att-role="menu.drillItems.length ? 'button' : undefined" t-att-tabindex="menu.drillItems.length ? 0 : undefined" t-att-title="menu.drillItems.length ? 'عرض التفاصيل' : ''" t-on-click="menu.toggleMenu" t-on-keydown="menu.onMenuKeydown"/><div t-if="menu.state.menuOpen" class="o_baha_panel__dropdown" t-attf-style="top:{{menu.state.menuPos.top}}px;left:{{menu.state.menuPos.left}}px;"><t t-foreach="menu.drillItems" t-as="d" t-key="d_index"><button class="o_baha_panel__dropitem" t-on-click="() => this.menu.pickDrill(d)"><i class="fa fa-table"/><span t-esc="d.label"/></button></t></div></span></div></div>
            <div class="o_baha_split__bar">
                <div class="o_baha_split__seg o_baha_split__seg--spent"
                     t-attf-style="width:{{props.comp.data.spent_pct}}%;" t-esc="props.comp.data.spent_label"/>
                <div class="o_baha_split__seg o_baha_split__seg--rem"
                     t-attf-style="width:{{100 - props.comp.data.spent_pct}}%;" t-esc="props.comp.data.remaining_label"/>
            </div>
            <div class="o_baha_split__legend">
                <span><i class="o_baha_dot o_baha_dot--spent"/> منصرف</span>
                <span><i class="o_baha_dot o_baha_dot--rem"/> متبقي</span>
            </div>
        </div>`;
    static props = ["comp", "colors", "onOpenRecord?", "onOpenDrilldown?"];
    setup() {
        this.menu = useDrillMenu(this, () => [this.props.comp.data]);
    }
    get cardClass() {
        return {
            "o_baha_clickable": isClickable(this.props.comp.data),
            "o_baha_clickable--card": isClickable(this.props.comp.data),
        };
    }
    get tabIndex() {
        return isClickable(this.props.comp.data) ? 0 : undefined;
    }
    get cardRole() {
        return isClickable(this.props.comp.data) ? "button" : undefined;
    }
    openSelf() {
        openDataTarget(this.props.comp.data, this.props.onOpenRecord, this.props.onOpenDrilldown);
    }
    onSelfKeydown(ev) {
        onDataKeydown(ev, this.props.comp.data, this.props.onOpenRecord, this.props.onOpenDrilldown);
    }
}

// ---------------------------------------------------------------------------
// BarChartHPlanned — planned (grey) vs actual (colored) + budget label
// ---------------------------------------------------------------------------
export class BarChartHPlanned extends Component {
    static template = xml`
        <div class="o_baha_card o_baha_barhp">
            <div class="o_baha_card__head" t-if="props.comp.title and !props.comp.data.hide_head"><span class="o_baha_card__title" t-esc="props.comp.title"/><div class="o_baha_card__tools"><span class="o_baha_legend"><span class="o_baha_legend__item"><i class="o_baha_legend__dot o_baha_legend__dot--ok"/>علي المسار</span><span class="o_baha_legend__item"><i class="o_baha_legend__dot o_baha_legend__dot--risk"/>متأخر</span><span class="o_baha_legend__item"><i class="o_baha_legend__dot o_baha_legend__dot--late"/>متأخر جدا</span><span class="o_baha_legend__item"><i class="o_baha_legend__dot o_baha_legend__dot--none"/>لم يتم القياس</span></span><i class="fa fa-expand o_baha_panel__expand" t-on-click="menu.toggleMenu" t-on-keydown="menu.onMenuKeydown" tabindex="0" role="button" title="عرض التفاصيل"/><span class="o_baha_panel__menuwrap" t-ref="menuwrap"><i class="fa fa-ellipsis-v o_baha_panel__menu" t-att-class="{ 'o_baha_panel__menu--active': menu.drillItems.length, 'o_baha_panel__menu--on': menu.state.menuOpen }" t-att-role="menu.drillItems.length ? 'button' : undefined" t-att-tabindex="menu.drillItems.length ? 0 : undefined" t-att-title="menu.drillItems.length ? 'عرض التفاصيل' : ''" t-on-click="menu.toggleMenu" t-on-keydown="menu.onMenuKeydown"/><div t-if="menu.state.menuOpen" class="o_baha_panel__dropdown" t-attf-style="top:{{menu.state.menuPos.top}}px;left:{{menu.state.menuPos.left}}px;"><t t-foreach="menu.drillItems" t-as="d" t-key="d_index"><button class="o_baha_panel__dropitem" t-on-click="() => this.menu.pickDrill(d)"><i class="fa fa-table"/><span t-esc="d.label"/></button></t></div></span></div></div>
            <div class="o_baha_barhp__rows">
                <t t-foreach="props.comp.data.items or []" t-as="item" t-key="item_index">
                    <div class="o_baha_barhp__row"
                         t-att-class="clickableClass(item)"
                         t-att-tabindex="isClickable(item) ? 0 : undefined"
                         t-att-role="isClickable(item) ? 'button' : undefined"
                         t-on-click="() => this.openItem(item)"
                         t-on-keydown="(ev) => this.onItemKeydown(ev, item)">
                        <span class="o_baha_barhp__label" t-esc="item.label"/>
                        <div class="o_baha_barhp__track">
                            <div class="o_baha_barhp__plan"/>
                            <div class="o_baha_barhp__fill"
                                 t-attf-style="width:{{pct(item.value)}}%;background:{{item.color or colorAccent}};"/>
                        </div>
                        <span class="o_baha_barhp__budget" t-esc="item.budget"/>
                    </div>
                </t>
            </div>
        </div>`;
    static props = ["comp", "colors", "onOpenRecord?", "onOpenDrilldown?"];
    setup() {
        this.menu = useDrillMenu(this, () => this.props.comp.data.items || []);
    }
    get colorAccent() { return this.props.colors.accent || "#00ab9d"; }
    isClickable(item) { return isClickable(item); }
    clickableClass(item) { return clickableClass(item); }
    openItem(item) { dispatchItemClick(item, this.props.onOpenRecord, this.props.onOpenDrilldown); }
    onItemKeydown(ev, item) { onItemKeydown(ev, item, this.props.onOpenRecord, this.props.onOpenDrilldown); }
    // Actual-vs-planned values are already percentages; clamp the drawn width
    // so an over-100% actual stays inside its planned track.
    pct(v) { return Math.max(0, Math.min(100, Math.round(v || 0))); }
}

// ---------------------------------------------------------------------------
// GoalsList — rows with a mini ring gauge each
// ---------------------------------------------------------------------------
export class GoalsList extends Component {
    static template = xml`
        <div class="o_baha_card o_baha_goals">
            <div class="o_baha_card__head" t-if="props.comp.title and !props.comp.data.hide_head"><span class="o_baha_card__title" t-esc="props.comp.title"/><div class="o_baha_card__tools"><span class="o_baha_legend"><span class="o_baha_legend__item"><i class="o_baha_legend__dot o_baha_legend__dot--ok"/>علي المسار</span><span class="o_baha_legend__item"><i class="o_baha_legend__dot o_baha_legend__dot--risk"/>متأخر</span><span class="o_baha_legend__item"><i class="o_baha_legend__dot o_baha_legend__dot--late"/>متأخر جدا</span><span class="o_baha_legend__item"><i class="o_baha_legend__dot o_baha_legend__dot--none"/>لم يتم القياس</span></span><i class="fa fa-expand o_baha_panel__expand" t-on-click="menu.toggleMenu" t-on-keydown="menu.onMenuKeydown" tabindex="0" role="button" title="عرض التفاصيل"/><span class="o_baha_panel__menuwrap" t-ref="menuwrap"><i class="fa fa-ellipsis-v o_baha_panel__menu" t-att-class="{ 'o_baha_panel__menu--active': menu.drillItems.length, 'o_baha_panel__menu--on': menu.state.menuOpen }" t-att-role="menu.drillItems.length ? 'button' : undefined" t-att-tabindex="menu.drillItems.length ? 0 : undefined" t-att-title="menu.drillItems.length ? 'عرض التفاصيل' : ''" t-on-click="menu.toggleMenu" t-on-keydown="menu.onMenuKeydown"/><div t-if="menu.state.menuOpen" class="o_baha_panel__dropdown" t-attf-style="top:{{menu.state.menuPos.top}}px;left:{{menu.state.menuPos.left}}px;"><t t-foreach="menu.drillItems" t-as="d" t-key="d_index"><button class="o_baha_panel__dropitem" t-on-click="() => this.menu.pickDrill(d)"><i class="fa fa-table"/><span t-esc="d.label"/></button></t></div></span></div></div>
            <t t-foreach="props.comp.data.items or []" t-as="g" t-key="g_index">
                <div class="o_baha_goals__row"
                     t-att-class="clickableClass(g)"
                     t-att-tabindex="isClickable(g) ? 0 : undefined"
                     t-att-role="isClickable(g) ? 'button' : undefined"
                     t-on-click="() => this.openItem(g)"
                     t-on-keydown="(ev) => this.onItemKeydown(ev, g)">
                    <div class="o_baha_goals__ring">
                        <svg viewBox="0 0 80 80">
                            <circle cx="40" cy="40" r="34" class="o_baha_gauge__track"/>
                            <circle cx="40" cy="40" r="34" class="o_baha_gauge__value" t-att-style="ringStyle(g)"/>
                        </svg>
                        <div class="o_baha_gauge__pct"><span t-esc="g.value"/><small>%</small></div>
                    </div>
                    <div class="o_baha_goals__text">
                        <div class="o_baha_goals__label" t-esc="g.label"/>
                        <div t-if="g.delta" class="o_baha_trend" t-att-class="g.trend === 'down' ? 'o_baha_trend--down' : 'o_baha_trend--up'">
                            <span class="o_baha_trend__pct" t-esc="g.delta"/>
                            <span class="o_baha_trend__badge"><i t-att-class="g.trend === 'down' ? 'fa fa-arrow-down' : 'fa fa-arrow-up'"/></span>
                            <span class="o_baha_gauge__since">عن الشهر السابق</span>
                        </div>
                    </div>
                </div>
            </t>
        </div>`;
    static props = ["comp", "colors", "onOpenRecord?", "onOpenDrilldown?"];
    setup() {
        this.menu = useDrillMenu(this, () => this.props.comp.data.items || []);
    }
    isClickable(item) { return isClickable(item); }
    clickableClass(item) { return clickableClass(item); }
    openItem(item) { dispatchItemClick(item, this.props.onOpenRecord, this.props.onOpenDrilldown); }
    onItemKeydown(ev, item) { onItemKeydown(ev, item, this.props.onOpenRecord, this.props.onOpenDrilldown); }
    ringStyle(g) {
        const r = 34, circ = 2 * Math.PI * r;
        const v = Math.max(0, Math.min(100, g.value || 0));
        const color = g.color || this.props.colors.accent || "#00ab9d";
        return `stroke:${color};stroke-dasharray:${circ};stroke-dashoffset:${circ * (1 - v / 100)};`;
    }
}

// ---------------------------------------------------------------------------
// ListCards — risk register / required actions (severity badge, tag, date, text)
// ---------------------------------------------------------------------------
export class ListCards extends Component {
    static template = xml`
        <div class="o_baha_card o_baha_listcards">
            <div class="o_baha_listcards__head">
                <div class="o_baha_listcards__headmain">
                    <span class="o_baha_card__title" t-esc="props.comp.title"/>
                    <span t-if="props.comp.data.count" class="o_baha_listcards__count" t-esc="props.comp.data.count"/>
                </div>
                <div class="o_baha_card__tools">
                    <span t-if="props.comp.data.filter_label" class="o_baha_chip">
                        <span t-esc="props.comp.data.filter_label"/><i class="fa fa-angle-down"/>
                    </span>
                    <i class="fa fa-expand o_baha_panel__expand" t-on-click="menu.toggleMenu" t-on-keydown="menu.onMenuKeydown" tabindex="0" role="button" title="عرض التفاصيل"/>
                    <span class="o_baha_panel__menuwrap" t-ref="menuwrap">
                        <i class="fa fa-ellipsis-v o_baha_panel__menu"
                           t-att-class="{ 'o_baha_panel__menu--active': menu.drillItems.length, 'o_baha_panel__menu--on': menu.state.menuOpen }"
                           t-att-role="menu.drillItems.length ? 'button' : undefined"
                           t-att-tabindex="menu.drillItems.length ? 0 : undefined"
                           t-att-title="menu.drillItems.length ? 'عرض التفاصيل' : ''"
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
                </div>
            </div>
            <t t-foreach="props.comp.data.items or []" t-as="it" t-key="it_index">
                <div class="o_baha_listcards__item"
                     t-attf-class="o_baha_listcards__item--{{it.level or 'mid'}} {{clickableClass(it)}}"
                     t-att-tabindex="isClickable(it) ? 0 : undefined"
                     t-att-role="isClickable(it) ? 'button' : undefined"
                     t-on-click="() => this.openItem(it)"
                     t-on-keydown="(ev) => this.onItemKeydown(ev, it)">
                    <div class="o_baha_listcards__row1">
                        <span t-if="it.severity" class="o_baha_badge" t-attf-class="o_baha_badge--{{it.level or 'mid'}}" t-esc="it.severity"/>
                        <span t-if="it.tag" class="o_baha_tag" t-esc="it.tag"/>
                        <span t-if="it.date" class="o_baha_listcards__date" t-esc="it.date"/>
                    </div>
                    <div class="o_baha_listcards__title" t-esc="it.text"/>
                    <div t-if="it.decision" class="o_baha_listcards__decision" t-esc="it.decision"/>
                </div>
            </t>
        </div>`;
    static props = ["comp", "colors", "onOpenRecord?", "onOpenDrilldown?"];
    setup() {
        this.menu = useDrillMenu(this, () => this.props.comp.data.items || []);
    }
    isClickable(item) { return isClickable(item); }
    clickableClass(item) { return clickableClass(item); }
    openItem(item) { dispatchItemClick(item, this.props.onOpenRecord, this.props.onOpenDrilldown); }
    onItemKeydown(ev, item) { onItemKeydown(ev, item, this.props.onOpenRecord, this.props.onOpenDrilldown); }
}

// ---------------------------------------------------------------------------
// AlertsPanel — grouped alert lists
// ---------------------------------------------------------------------------
export class AlertsPanel extends Component {
    static template = xml`
        <div class="o_baha_card o_baha_alerts">
            <div class="o_baha_card__head" t-if="props.comp.title and !props.comp.data.hide_head"><span class="o_baha_card__title" t-esc="props.comp.title"/><div class="o_baha_card__tools"><span class="o_baha_legend"><span class="o_baha_legend__item"><i class="o_baha_legend__dot o_baha_legend__dot--ok"/>علي المسار</span><span class="o_baha_legend__item"><i class="o_baha_legend__dot o_baha_legend__dot--risk"/>متأخر</span><span class="o_baha_legend__item"><i class="o_baha_legend__dot o_baha_legend__dot--late"/>متأخر جدا</span><span class="o_baha_legend__item"><i class="o_baha_legend__dot o_baha_legend__dot--none"/>لم يتم القياس</span></span><i class="fa fa-expand o_baha_panel__expand" t-on-click="menu.toggleMenu" t-on-keydown="menu.onMenuKeydown" tabindex="0" role="button" title="عرض التفاصيل"/><span class="o_baha_panel__menuwrap" t-ref="menuwrap"><i class="fa fa-ellipsis-v o_baha_panel__menu" t-att-class="{ 'o_baha_panel__menu--active': menu.drillItems.length, 'o_baha_panel__menu--on': menu.state.menuOpen }" t-att-role="menu.drillItems.length ? 'button' : undefined" t-att-tabindex="menu.drillItems.length ? 0 : undefined" t-att-title="menu.drillItems.length ? 'عرض التفاصيل' : ''" t-on-click="menu.toggleMenu" t-on-keydown="menu.onMenuKeydown"/><div t-if="menu.state.menuOpen" class="o_baha_panel__dropdown" t-attf-style="top:{{menu.state.menuPos.top}}px;left:{{menu.state.menuPos.left}}px;"><t t-foreach="menu.drillItems" t-as="d" t-key="d_index"><button class="o_baha_panel__dropitem" t-on-click="() => this.menu.pickDrill(d)"><i class="fa fa-table"/><span t-esc="d.label"/></button></t></div></span></div></div>
            <t t-foreach="props.comp.data.groups or []" t-as="grp" t-key="grp_index">
                <div class="o_baha_alerts__group"
                     t-att-class="{ 'o_baha_alerts__group--open': this.isGroupOpen(grp_index) }">
                    <div class="o_baha_alerts__ghead"
                         role="button"
                         tabindex="0"
                         t-att-aria-expanded="this.isGroupOpen(grp_index) ? 'true' : 'false'"
                         t-on-click="() => this.toggleGroup(grp_index)"
                         t-on-keydown="(ev) => this.onGroupKeydown(ev, grp_index)">
                        <span class="o_baha_alerts__gtitle" t-attf-style="color:{{grp.color or colorPrimary}};">
                            <span t-esc="grp.title"/>
                            <i t-if="grp.icon" t-att-class="'fa ' + grp.icon" t-attf-style="color:{{grp.color or colorPrimary}};"/>
                        </span>
                        <i t-att-class="this.isGroupOpen(grp_index) ? 'fa fa-angle-up o_baha_alerts__chevron' : 'fa fa-angle-down o_baha_alerts__chevron'"/>
                    </div>
                    <div t-if="this.isGroupOpen(grp_index)" class="o_baha_alerts__divider"/>
                    <div t-if="this.isGroupOpen(grp_index)" class="o_baha_alerts__list">
                        <t t-foreach="grp.items or []" t-as="it" t-key="it_index">
                            <div class="o_baha_alerts__item"
                                 t-att-class="clickableClass(it)"
                                 t-att-tabindex="isClickable(it) ? 0 : undefined"
                                 t-att-role="isClickable(it) ? 'button' : undefined"
                                 t-on-click="() => this.openItem(it)"
                                 t-on-keydown="(ev) => this.onItemKeydown(ev, it)">
                                <span class="o_baha_alerts__name">
                                    <i class="o_baha_alerts__dot" t-attf-style="background:{{it.color or grp.color or colorPrimary}};"/>
                                    <span t-esc="it.label"/>
                                </span>
                                <span class="o_baha_alerts__meta" t-esc="it.value"/>
                            </div>
                        </t>
                    </div>
                </div>
            </t>
        </div>`;
    static props = ["comp", "colors", "onOpenRecord?", "onOpenDrilldown?"];
    setup() {
        this.state = useState({ openGroups: {} });
        this.menu = useDrillMenu(this, () => (this.props.comp.data.groups || []).flatMap((g) => g.items || []));
    }
    get colorPrimary() { return this.props.colors.primary || "#5c4b43"; }
    isGroupOpen(index) { return Boolean(this.state.openGroups[index]); }
    toggleGroup(index) {
        this.state.openGroups[index] = !this.isGroupOpen(index);
    }
    onGroupKeydown(ev, index) {
        if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            this.toggleGroup(index);
        }
    }
    isClickable(item) { return isClickable(item); }
    clickableClass(item) { return clickableClass(item); }
    openItem(item) { dispatchItemClick(item, this.props.onOpenRecord, this.props.onOpenDrilldown); }
    onItemKeydown(ev, item) { onItemKeydown(ev, item, this.props.onOpenRecord, this.props.onOpenDrilldown); }
}

// ---------------------------------------------------------------------------
// GaugeGrid — ONE component = a titled panel holding a grid of ring gauges
// (e.g. "تقييم الاهداف الاستراتيجية الـ 11"). Items come from config.items.
// ---------------------------------------------------------------------------
export class GaugeGrid extends Component {
    static template = xml`
        <div class="o_baha_panel o_baha_gaugegrid">
            <div class="o_baha_panel__head" t-if="!props.comp.data.hide_head">
                <span class="o_baha_panel__title" t-esc="props.comp.title"/>
                <div class="o_baha_panel__headtools">
                    <div class="o_baha_legend">
                        <span class="o_baha_legend__item"><i class="o_baha_legend__dot o_baha_legend__dot--ok"/>علي المسار</span>
                        <span class="o_baha_legend__item"><i class="o_baha_legend__dot o_baha_legend__dot--risk"/>متأخر</span>
                        <span class="o_baha_legend__item"><i class="o_baha_legend__dot o_baha_legend__dot--late"/>متأخر جدا</span><span class="o_baha_legend__item"><i class="o_baha_legend__dot o_baha_legend__dot--none"/>لم يتم القياس</span>
                    </div>
                    <i class="fa fa-expand o_baha_panel__expand" t-on-click="menu.toggleMenu" t-on-keydown="menu.onMenuKeydown" tabindex="0" role="button" title="عرض التفاصيل"/>
                    <span class="o_baha_panel__menuwrap" t-ref="menuwrap">
                        <i class="fa fa-ellipsis-v o_baha_panel__menu"
                           t-att-class="{ 'o_baha_panel__menu--active': menu.drillItems.length, 'o_baha_panel__menu--on': menu.state.menuOpen }"
                           t-att-role="menu.drillItems.length ? 'button' : undefined"
                           t-att-tabindex="menu.drillItems.length ? 0 : undefined"
                           t-att-title="menu.drillItems.length ? 'عرض التفاصيل' : ''"
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
                </div>
            </div>
            <div class="o_baha_gaugegrid__grid" t-attf-style="grid-template-columns: repeat({{props.comp.data.cols or 4}}, 1fr);">
                <t t-foreach="props.comp.data.items or []" t-as="g" t-key="g_index">
                    <div class="o_baha_card o_baha_gauge"
                         t-att-class="clickableClass(g, 'o_baha_clickable--card')"
                         t-att-tabindex="isClickable(g) ? 0 : undefined"
                         t-att-role="isClickable(g) ? 'button' : undefined"
                         t-on-click="() => this.openItem(g)"
                         t-on-keydown="(ev) => this.onItemKeydown(ev, g)">
                        <div class="o_baha_gauge__info">
                            <div class="o_baha_gauge__label" t-esc="g.label"/>
                            <div class="o_baha_trend" t-att-class="trendClass(g.trend)">
                                <span class="o_baha_trend__pct" t-esc="g.delta"/>
                                <span class="o_baha_trend__badge"><i t-att-class="g.trend === 'down' ? 'fa fa-arrow-down' : 'fa fa-arrow-up'"/></span>
                                <span class="o_baha_gauge__since">عن الشهر السابق</span>
                            </div>
                        </div>
                        <div class="o_baha_gauge__ring">
                            <svg viewBox="0 0 80 80">
                                <circle cx="40" cy="40" r="34" class="o_baha_gauge__track"/>
                                <circle cx="40" cy="40" r="34" class="o_baha_gauge__value" t-att-style="ringStyle(g)"/>
                            </svg>
                            <div class="o_baha_gauge__pct"><span t-esc="g.value"/><small>%</small></div>
                        </div>
                    </div>
                </t>
            </div>
        </div>`;
    static props = ["comp", "colors", "onOpenRecord?", "onOpenDrilldown?"];
    setup() {
        this.menu = useDrillMenu(this, () => this.props.comp.data.items || []);
    }
    trendClass(dir) { return trendClass(dir); }
    isClickable(item) { return isClickable(item); }
    clickableClass(item, extra = "") { return clickableClass(item, extra); }
    openItem(item) { dispatchItemClick(item, this.props.onOpenRecord, this.props.onOpenDrilldown); }
    onItemKeydown(ev, item) { onItemKeydown(ev, item, this.props.onOpenRecord, this.props.onOpenDrilldown); }
    ringStyle(g) {
        const r = 34;
        const circ = 2 * Math.PI * r;
        const val = Math.max(0, Math.min(100, g.value || 0));
        const color = g.color || this.props.colors.accent || "#00ab9d";
        return `stroke:${color};stroke-dasharray:${circ};stroke-dashoffset:${circ * (1 - val / 100)};`;
    }
}

// ---------------------------------------------------------------------------
// StatGrid — ONE component = a titled panel holding a grid of stat cards
// with a brand-tinted icon (e.g. "مؤشرات قياس المسار"). Items: config.items.
// ---------------------------------------------------------------------------
export class StatGrid extends Component {
    static template = xml`
        <div class="o_baha_panel o_baha_statgrid" t-att-class="{ 'o_baha_statgrid--bare': props.comp.data.bare }">
            <div class="o_baha_panel__head" t-if="!props.comp.data.hide_head">
                <span class="o_baha_panel__title" t-esc="props.comp.title"/>
                <div class="o_baha_panel__headtools">
                    <div class="o_baha_legend">
                        <span class="o_baha_legend__item"><i class="o_baha_legend__dot o_baha_legend__dot--ok"/>علي المسار</span>
                        <span class="o_baha_legend__item"><i class="o_baha_legend__dot o_baha_legend__dot--risk"/>متأخر</span>
                        <span class="o_baha_legend__item"><i class="o_baha_legend__dot o_baha_legend__dot--late"/>متأخر جدا</span><span class="o_baha_legend__item"><i class="o_baha_legend__dot o_baha_legend__dot--none"/>لم يتم القياس</span>
                    </div>
                    <i class="fa fa-expand o_baha_panel__expand" t-on-click="toggleMenu" t-on-keydown="onMenuKeydown" tabindex="0" role="button" title="عرض التفاصيل"/>
                    <span class="o_baha_panel__menuwrap" t-ref="menuwrap">
                        <i class="fa fa-ellipsis-v o_baha_panel__menu"
                           t-att-class="{ 'o_baha_panel__menu--active': drillItems.length,
                                          'o_baha_panel__menu--on': state.menuOpen }"
                           t-att-role="drillItems.length ? 'button' : undefined"
                           t-att-tabindex="drillItems.length ? 0 : undefined"
                           t-att-title="drillItems.length ? 'عرض التفاصيل' : ''"
                           t-on-click="toggleMenu"
                           t-on-keydown="onMenuKeydown"/>
                        <div t-if="state.menuOpen" class="o_baha_panel__dropdown"
                             t-attf-style="top:{{state.menuPos.top}}px;left:{{state.menuPos.left}}px;">
                            <t t-foreach="drillItems" t-as="d" t-key="d_index">
                                <button class="o_baha_panel__dropitem"
                                        t-on-click="() => this.pickDrill(d)">
                                    <i class="fa fa-table"/><span t-esc="d.label"/>
                                </button>
                            </t>
                        </div>
                    </span>
                </div>
            </div>
            <div class="o_baha_statgrid__grid" t-attf-style="grid-template-columns: repeat({{props.comp.data.cols or 2}}, 1fr);">
                <t t-foreach="props.comp.data.items or []" t-as="s" t-key="s_index">
                    <div class="o_baha_card o_baha_stat"
                         t-att-class="{ 'o_baha_stat--big': s.big }">
                        <span class="o_baha_stat__icon" t-if="s.icon">
                            <t t-if="iconSvg(s.icon)" t-out="iconSvg(s.icon)"/>
                            <i t-else="" t-attf-class="fa {{s.icon}}"/>
                        </span>
                        <div class="o_baha_stat__label" t-esc="s.label"/>
                        <div class="o_baha_stat__row">
                            <div class="o_baha_stat__value" t-attf-class="o_baha_val--{{statusOf(s)}}">
                                <span class="o_baha_val__head" t-esc="numHead(s.value)"/><span class="o_baha_val__tail" t-if="numTail(s.value)" t-esc="numTail(s.value)"/><small t-if="s.unit" t-esc="s.unit"/>
                            </div>
                            <div t-if="s.delta" class="o_baha_trend" t-attf-class="o_baha_trend--{{statusOf(s)}}">
                                <span class="o_baha_trend__pct o_baha_trend__txt" t-esc="s.delta"/>
                                <span class="o_baha_trend__badge"><i t-att-class="s.delta_dir === 'down' ? 'fa fa-arrow-down' : 'fa fa-arrow-up'"/></span>
                                <span t-if="s.since" class="o_baha_gauge__since" t-esc="s.since"/>
                            </div>
                        </div>
                    </div>
                </t>
            </div>
        </div>`;
    static props = ["comp", "colors", "onOpenRecord?", "onOpenDrilldown?"];
    setup() {
        this.state = useState({ menuOpen: false, menuPos: { top: 0, left: 0 } });
        this.menuWrap = useRef("menuwrap");
        // Fixed-positioned (the cell clips), so dismissal must be explicit.
        useExternalListener(document, "click", this.onDocumentClick.bind(this), { capture: true });
        useExternalListener(document, "keydown", this.onDocumentKeydown.bind(this));
        useExternalListener(document, BAHA_CLOSE_OVERLAYS, () => this.closeMenu());
        useExternalListener(window, "resize", () => this.closeMenu());
        useExternalListener(window, "scroll", () => this.closeMenu(), { capture: true });
    }
    closeMenu() {
        if (this.state.menuOpen) {
            this.state.menuOpen = false;
        }
    }
    onDocumentClick(ev) {
        if (!this.state.menuOpen) {
            return;
        }
        const wrap = this.menuWrap.el;
        if (wrap && wrap.contains(ev.target)) {
            return;
        }
        this.closeMenu();
    }
    onDocumentKeydown(ev) {
        if (ev.key === "Escape") {
            this.closeMenu();
        }
    }
    /** Stats that have something to drill into (a record or an aggregate). */
    get drillItems() {
        return (this.props.comp.data.items || []).filter((s) => isClickable(s));
    }
    /** The cards themselves are no longer clickable — the ⋮ owns the action.
     *  One drillable stat opens straight away; several offer a short list. */
    toggleMenu(ev) {
        const items = this.drillItems;
        if (!items.length) {
            return;
        }
        if (items.length === 1) {
            this.openItem(items[0]);
            return;
        }
        if (this.state.menuOpen) {
            this.closeMenu();
            return;
        }
        const icon = (ev && ev.currentTarget) || this.menuWrap.el;
        const r = icon.getBoundingClientRect();
        const WIDTH = 220;
        this.state.menuPos = {
            top: Math.round(r.bottom + 6),
            left: Math.round(Math.max(8, Math.min(r.left, window.innerWidth - WIDTH - 8))),
        };
        this.state.menuOpen = true;
    }
    onMenuKeydown(ev) {
        if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            this.toggleMenu(ev);
        }
    }
    pickDrill(item) {
        this.state.menuOpen = false;
        this.openItem(item);
    }
    statusOf(s) { return s.status || (s.delta_dir === "down" ? "bad" : "ok"); }
    numHead(v) { const s = String(v == null ? "" : v); const i = s.indexOf("/"); return i >= 0 ? s.slice(0, i) : s; }
    numTail(v) { const s = String(v == null ? "" : v); const i = s.indexOf("/"); return i >= 0 ? s.slice(i) : ""; }
    iconSvg(key) { return STAT_ICONS[key] || null; }
    isClickable(item) { return isClickable(item); }
    openItem(item) { dispatchItemClick(item, this.props.onOpenRecord, this.props.onOpenDrilldown); }
    onItemKeydown(ev, item) { onItemKeydown(ev, item, this.props.onOpenRecord, this.props.onOpenDrilldown); }
}

// ---------------------------------------------------------------------------
// KpiGrid — ONE component = a titled panel holding a grid of KPI gauge cards
// (e.g. "مؤشرات الاداء الاستراتيجي"). Items come from config.items.
// ---------------------------------------------------------------------------
export class KpiGrid extends Component {
    static template = xml`
        <div class="o_baha_panel o_baha_kpigrid">
            <div class="o_baha_panel__head" t-if="!props.comp.data.hide_head">
                <span class="o_baha_panel__title" t-esc="props.comp.title"/>
                <div class="o_baha_panel__headtools">
                    <div class="o_baha_legend">
                        <span class="o_baha_legend__item"><i class="o_baha_legend__dot o_baha_legend__dot--ok"/>علي المسار</span>
                        <span class="o_baha_legend__item"><i class="o_baha_legend__dot o_baha_legend__dot--risk"/>متأخر</span>
                        <span class="o_baha_legend__item"><i class="o_baha_legend__dot o_baha_legend__dot--late"/>متأخر جدا</span><span class="o_baha_legend__item"><i class="o_baha_legend__dot o_baha_legend__dot--none"/>لم يتم القياس</span>
                    </div>
                    <i class="fa fa-expand o_baha_panel__expand" t-on-click="menu.toggleMenu" t-on-keydown="menu.onMenuKeydown" tabindex="0" role="button" title="عرض التفاصيل"/>
                    <span class="o_baha_panel__menuwrap" t-ref="menuwrap">
                        <i class="fa fa-ellipsis-v o_baha_panel__menu"
                           t-att-class="{ 'o_baha_panel__menu--active': menu.drillItems.length, 'o_baha_panel__menu--on': menu.state.menuOpen }"
                           t-att-role="menu.drillItems.length ? 'button' : undefined"
                           t-att-tabindex="menu.drillItems.length ? 0 : undefined"
                           t-att-title="menu.drillItems.length ? 'عرض التفاصيل' : ''"
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
                </div>
            </div>
            <div class="o_baha_kpigrid__grid" t-attf-style="grid-template-columns: repeat({{props.comp.data.cols or 2}}, 1fr);">
                <t t-foreach="props.comp.data.items or []" t-as="k" t-key="k_index">
                    <div class="o_baha_card o_baha_kpi"
                         t-att-class="clickableClass(k, 'o_baha_clickable--card')"
                         t-att-tabindex="isClickable(k) ? 0 : undefined"
                         t-att-role="isClickable(k) ? 'button' : undefined"
                         t-on-click="() => this.openItem(k)"
                         t-on-keydown="(ev) => this.onItemKeydown(ev, k)">
                        <div class="o_baha_kpi__top">
                            <span class="o_baha_kpi__name" t-esc="k.label"/>
                            <span t-if="k.quality" class="o_baha_badge" t-attf-class="o_baha_badge--{{k.quality_level or 'mid'}}" t-esc="k.quality"/>
                        </div>
                        <div class="o_baha_kpi__body">
                            <div class="o_baha_gauge__ring o_baha_kpi__ring">
                                <svg viewBox="0 0 80 80">
                                    <circle cx="40" cy="40" r="34" class="o_baha_gauge__track"/>
                                    <circle cx="40" cy="40" r="34" class="o_baha_gauge__value" t-att-style="ringStyle(k)"/>
                                </svg>
                                <div class="o_baha_gauge__pct"><span t-esc="k.pct"/><small>%</small></div>
                            </div>
                            <div class="o_baha_kpi__nums">
                                <div class="o_baha_kpi__cur"><span t-esc="k.value"/></div>
                                <div class="o_baha_kpi__target">المستهدف: <span t-esc="k.target"/></div>
                            </div>
                        </div>
                    </div>
                </t>
            </div>
        </div>`;
    static props = ["comp", "colors", "onOpenRecord?", "onOpenDrilldown?"];
    setup() {
        this.menu = useDrillMenu(this, () => this.props.comp.data.items || []);
    }
    isClickable(item) { return isClickable(item); }
    clickableClass(item, extra = "") { return clickableClass(item, extra); }
    openItem(item) { dispatchItemClick(item, this.props.onOpenRecord, this.props.onOpenDrilldown); }
    onItemKeydown(ev, item) { onItemKeydown(ev, item, this.props.onOpenRecord, this.props.onOpenDrilldown); }
    ringStyle(k) {
        const r = 34, circ = 2 * Math.PI * r;
        const v = Math.max(0, Math.min(100, k.pct || 0));
        const color = k.color || this.props.colors.accent || "#00ab9d";
        return `stroke:${color};stroke-dasharray:${circ};stroke-dashoffset:${circ * (1 - v / 100)};`;
    }
}

// ---------------------------------------------------------------------------
// SemiGrid — ONE component = a titled panel holding a row of semicircle gauges
// (e.g. "مؤشرات الاداء التقني الرئيسية"). Items come from config.items.
// ---------------------------------------------------------------------------
export class SemiGrid extends Component {
    static template = xml`
        <div class="o_baha_panel o_baha_semigrid">
            <div class="o_baha_panel__head" t-if="!props.comp.data.hide_head">
                <span class="o_baha_panel__title" t-esc="props.comp.title"/>
                <div class="o_baha_panel__headtools">
                    <div class="o_baha_legend">
                        <span class="o_baha_legend__item"><i class="o_baha_legend__dot o_baha_legend__dot--ok"/>علي المسار</span>
                        <span class="o_baha_legend__item"><i class="o_baha_legend__dot o_baha_legend__dot--risk"/>متأخر</span>
                        <span class="o_baha_legend__item"><i class="o_baha_legend__dot o_baha_legend__dot--late"/>متأخر جدا</span><span class="o_baha_legend__item"><i class="o_baha_legend__dot o_baha_legend__dot--none"/>لم يتم القياس</span>
                    </div>
                    <i class="fa fa-expand o_baha_panel__expand" t-on-click="menu.toggleMenu" t-on-keydown="menu.onMenuKeydown" tabindex="0" role="button" title="عرض التفاصيل"/>
                    <span class="o_baha_panel__menuwrap" t-ref="menuwrap">
                        <i class="fa fa-ellipsis-v o_baha_panel__menu"
                           t-att-class="{ 'o_baha_panel__menu--active': menu.drillItems.length, 'o_baha_panel__menu--on': menu.state.menuOpen }"
                           t-att-role="menu.drillItems.length ? 'button' : undefined"
                           t-att-tabindex="menu.drillItems.length ? 0 : undefined"
                           t-att-title="menu.drillItems.length ? 'عرض التفاصيل' : ''"
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
                </div>
            </div>
            <div class="o_baha_semigrid__grid" t-attf-style="grid-template-columns: repeat({{props.comp.data.cols or 5}}, 1fr);">
                <t t-foreach="props.comp.data.items or []" t-as="s" t-key="s_index">
                    <div class="o_baha_card o_baha_semi"
                         t-att-class="clickableClass(s, 'o_baha_clickable--card')"
                         t-att-tabindex="isClickable(s) ? 0 : undefined"
                         t-att-role="isClickable(s) ? 'button' : undefined"
                         t-on-click="() => this.openItem(s)"
                         t-on-keydown="(ev) => this.onItemKeydown(ev, s)">
                        <div class="o_baha_semi__label" t-esc="s.label"/>
                        <div class="o_baha_semi__chart">
                            <svg viewBox="0 0 120 66">
                                <path d="M10 60 A50 50 0 0 1 110 60" class="o_baha_semi__track"/>
                                <path d="M10 60 A50 50 0 0 1 110 60" class="o_baha_semi__value" t-att-style="arcStyle(s)"/>
                            </svg>
                            <div class="o_baha_semi__big">
                                <span t-esc="s.value"/><small t-if="s.unit" t-esc="s.unit"/>
                            </div>
                        </div>
                        <div class="o_baha_semi__scale">
                            <span t-esc="s.min"/>
                            <span t-esc="s.max"/>
                        </div>
                        <div t-if="s.delta" class="o_baha_trend" t-att-class="trendClass(s.trend)">
                            <i t-att-class="s.trend === 'down' ? 'fa fa-arrow-down' : 'fa fa-arrow-up'"/>
                            <span t-esc="s.delta"/>
                        </div>
                    </div>
                </t>
            </div>
        </div>`;
    static props = ["comp", "colors", "onOpenRecord?", "onOpenDrilldown?"];
    setup() {
        this.menu = useDrillMenu(this, () => this.props.comp.data.items || []);
    }
    trendClass(dir) { return trendClass(dir); }
    isClickable(item) { return isClickable(item); }
    clickableClass(item, extra = "") { return clickableClass(item, extra); }
    openItem(item) { dispatchItemClick(item, this.props.onOpenRecord, this.props.onOpenDrilldown); }
    onItemKeydown(ev, item) { onItemKeydown(ev, item, this.props.onOpenRecord, this.props.onOpenDrilldown); }
    arcStyle(s) {
        const len = 157;
        let pct = s.pct === undefined ? 0 : s.pct;
        pct = Math.max(0, Math.min(100, pct));
        const color = s.color || this.props.colors.accent || "#00ab9d";
        return `stroke:${color};stroke-dasharray:${len};stroke-dashoffset:${len * (1 - pct / 100)};`;
    }
}

// ---------------------------------------------------------------------------
// Registry: component_type -> OWL component
// ---------------------------------------------------------------------------
export const WIDGETS = {
    gauge_grid: GaugeGrid,
    stat_grid: StatGrid,
    kpi_grid: KpiGrid,
    semi_grid: SemiGrid,
    banner: Banner,
    toolbar: Toolbar,
    gauge_card: GaugeCard,
    gauge_semi: GaugeSemi,
    kpi_gauge_card: KpiGaugeCard,
    stat_card: StatCard,
    progress_card: ProgressCard,
    budget_split_bar: BudgetSplitBar,
    bar_h: BarChartH,
    bar_h_planned: BarChartHPlanned,
    bar_v: BarChartV,
    data_table: DataTable,
    goals_list: GoalsList,
    list_cards: ListCards,
    alerts_panel: AlertsPanel,
};
