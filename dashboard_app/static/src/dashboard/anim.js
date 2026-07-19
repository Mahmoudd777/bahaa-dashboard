/** @odoo-module **/

import { onWillUnmount } from "@odoo/owl";

// Entrance + chart "blow up" animations, built on the locally-bundled GSAP
// (window.gsap). Everything degrades safely: no GSAP or reduced-motion → all
// helpers no-op and content stays at its natural, fully-visible state.

function gsapLib() {
    return typeof window !== "undefined" ? window.gsap : undefined;
}

export function prefersReducedMotion() {
    return (
        typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
}

// Cells that are NOT nested inside a panel's inner grid (the top-level "units").
function topCells(root) {
    return [...root.querySelectorAll(".o_baha_dash__cell")].filter(
        (c) => !c.closest(".o_baha_panel__grid")
    );
}
function panelInnerCells(root) {
    return [...root.querySelectorAll(".o_baha_panel__grid > .o_baha_dash__cell")];
}

// Animate an SVG ring/arc "drawing on" from fully hidden to its target offset.
function drawRings(root, gsap, tl, at) {
    const rings = root.querySelectorAll(".o_baha_gauge__value, .o_baha_semi__value");
    rings.forEach((r) => {
        const dash = parseFloat(getComputedStyle(r).strokeDasharray) || 0;
        if (!dash) return;
        tl.from(r, { strokeDashoffset: dash, duration: 1, ease: "power2.out" }, at);
    });
}

// Grow bars/progress from nothing using transforms (no layout thrash, keeps %).
function growBars(root, gsap, tl, at) {
    const wide = root.querySelectorAll(
        ".o_baha_barh__fill, .o_baha_barhp__fill, .o_baha_progress__fill, .o_baha_split__seg, .o_baha_cellbar__fill"
    );
    if (wide.length) {
        tl.from(
            wide,
            { scaleX: 0, transformOrigin: "right center", duration: 0.8, ease: "power2.out", stagger: 0.04, clearProps: "transform" },
            at
        );
    }
    const tall = root.querySelectorAll(".o_baha_barv__bar");
    if (tall.length) {
        tl.from(
            tall,
            { scaleY: 0, transformOrigin: "bottom center", duration: 0.7, ease: "power2.out", stagger: 0.03, clearProps: "transform" },
            at
        );
    }
}

// Count plain numeric leaves up from 0, preserving any prefix/suffix (%, M, commas).
function countUp(root, gsap, tl, at) {
    const els = root.querySelectorAll(
        ".o_baha_gauge__pct > span:first-child, .o_baha_progress__value, .o_baha_val__head, .o_baha_cellbar__val"
    );
    els.forEach((el) => {
        const raw = el.textContent.trim();
        const m = raw.match(/^(\D*)(-?[\d,]*\.?\d+)(\D*)$/);
        if (!m) return;
        const [, pre, numStr, post] = m;
        const target = parseFloat(numStr.replace(/,/g, ""));
        if (!isFinite(target)) return;
        const decimals = (numStr.split(".")[1] || "").length;
        const grouped = numStr.includes(",");
        const obj = { v: 0 };
        tl.to(
            obj,
            {
                v: target,
                duration: 1.1,
                ease: "power1.out",
                onUpdate() {
                    let s = decimals ? obj.v.toFixed(decimals) : Math.round(obj.v).toString();
                    if (grouped) {
                        s = Number(s).toLocaleString("en-US");
                    }
                    el.textContent = pre + s + post;
                },
            },
            at
        );
    });
}

// Build and play the full entrance timeline over one section root.
// Returns the gsap.context (has .revert()) or null when motion is skipped.
export function revealSection(root) {
    const gsap = gsapLib();
    if (!root || !gsap || prefersReducedMotion()) {
        return null;
    }
    return gsap.context(() => {
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

        const cells = topCells(root);
        if (cells.length) {
            tl.from(
                cells,
                {
                    opacity: 0,
                    y: 28,
                    scale: 0.92,
                    filter: "blur(10px)",
                    duration: 0.7,
                    stagger: { each: 0.06, from: "start" },
                    // drop gsap's inline transform/filter on finish so CSS hover works
                    clearProps: "transform,filter",
                },
                0
            );
        }
        const inner = panelInnerCells(root);
        if (inner.length) {
            tl.from(
                inner,
                { opacity: 0, y: 14, scale: 0.96, duration: 0.5, stagger: 0.03, clearProps: "transform" },
                0.15
            );
        }

        // Charts come alive just after their cards land.
        drawRings(root, gsap, tl, 0.25);
        growBars(root, gsap, tl, 0.25);
        countUp(root, gsap, tl, 0.2);
    }, root);
}

// OWL hook: returns { replay } to (re)run the entrance on a section root.
// Caller drives when to replay (initial render + on tab switch).
export function useReveal(getRootEl) {
    let ctx = null;
    function replay() {
        if (ctx) {
            ctx.revert();
            ctx = null;
        }
        const el = getRootEl();
        if (el) {
            ctx = revealSection(el);
        }
    }
    onWillUnmount(() => {
        if (ctx) {
            ctx.revert();
        }
    });
    return { replay };
}
