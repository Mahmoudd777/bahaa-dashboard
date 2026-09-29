// Put the component fixes into the seed, where they belong.
// They were applied straight to the test database, so a fresh install came up
// with the pre-fix names. Editing the seed makes new installs correct; it does
// not disturb existing databases, which the file's noupdate="1" protects.
import { readFileSync, writeFileSync } from "fs";

const FILE = "D:/APPS/project/custom_addons/dashboard_app/data/demo_dashboard.xml";
let xml = readFileSync(FILE, "utf8");
const before = xml;
const log = [];

const rename = (id, name) => {
  const re = new RegExp(`(<record id="${id}" model="dashboard.component"><field name="name">)[^<]*(</field>)`);
  if (re.test(xml)) { xml = xml.replace(re, `$1${name}$2`); log.push(`${id} -> ${name}`); }
  else log.push(`${id} NOT FOUND`);
};

// adds a key into that record's JSON config
const addCfg = (id, key, value) => {
  const re = new RegExp(`(<record id="${id}" model="dashboard.component">[\\s\\S]*?<field name="config">\\{)`);
  if (re.test(xml) && !new RegExp(`id="${id}"[\\s\\S]*?"${key}"`).test(xml)) {
    xml = xml.replace(re, `$1"${key}": ${value}, `);
    log.push(`${id} config += ${key}`);
  }
};

// Plain figures, not items tracked against a target: the RAG key implied a
// status the numbers never carried.
for (const id of ["ceo_path", "vp_path", "gm_path"]) { rename(id, "مؤشرات عامة"); addCfg(id, "hide_legend", "true"); }

// Promised a probability it never computed, and pinned a year the filter can
// move away from.
for (const id of ["ceo_risk_forecast", "vp_forecast", "gm_forecast"]) rename(id, "نسبة تحقق المستهدف");

// Budget panels.
for (const id of ["ceo_budget", "ceo_ind_budget", "vp_budget", "vp_budget2", "gm_budget"]) rename(id, "ملخص الميزانية");

// The short initiatives table listed every row, identical to the full table
// below it. It now answers "what needs attention" instead.
for (const id of ["ceo_initiatives", "vp_initiatives", "gm_initiatives"]) {
  rename(id, "مبادرات تحتاج متابعة");
  addCfg(id, "attention_only", "true");
}

if (xml !== before) writeFileSync(FILE, xml, "utf8");
log.forEach((l) => console.log("SEED " + l));
