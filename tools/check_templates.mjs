// Static check for OWL widget templates: every bare call in a component's
// template must be a method or getter of that same component. OWL resolves
// template calls on the component itself, so a method defined on the wrong
// class throws at render time and takes the whole dashboard page down
// (ctx.barPct, 8 October 2026). `node --check` cannot see this.
import { readFileSync } from 'node:fs';

const file = process.argv[2] || 'dashboard_app/static/src/dashboard/components/widgets.js';
const src = readFileSync(file, 'utf8');
// Calls that are not component methods: JS built-ins and OWL/template helpers.
const ALLOWED = new Set(['if', 'for', 'while', 'switch', 'return', 'typeof', 'Math', 'String', 'Number',
  'Boolean', 'Array', 'Object', 'JSON', 'isNaN', 'parseInt', 'parseFloat', 'Date', 'encodeURIComponent',
  'repeat', 'minmax', 'rgba', 'rgb', 'var', 'calc', 'translate', 'translateX', 'translateY', 'rotate',
  'scale', 'url', 'markup', 'props', 'env', 'function',
  'and', 'or', 'not']);  // OWL's word operators, as in "a and (b or c)"
let problems = 0, classes = 0;
const re = /export class (\w+) extends Component \{/g;
let m;
while ((m = re.exec(src))) {
  // the class body, by brace matching from its opening brace
  let i = m.index + m[0].length, depth = 1;
  while (depth && i < src.length) { const ch = src[i++]; if (ch === '{') depth++; else if (ch === '}') depth--; }
  const body = src.slice(m.index, i);
  const tpl = (body.match(/static template = xml`([\s\S]*?)`;/) || [])[1];
  if (!tpl) continue;
  classes++;
  const own = new Set([...body.matchAll(/^\s{4}(?:get\s+|static\s+|async\s+)?(\w+)\s*\(/gm)].map((x) => x[1]));
  // only expressions: attribute values of t-* / on-* directives and {{ }} blocks
  const exprs = [...tpl.matchAll(/(?:t-[\w-]+|t-on-[\w.-]+)="([^"]*)"/g)].map((x) => x[1])
    .concat([...tpl.matchAll(/\{\{([^}]*)\}\}/g)].map((x) => x[1]));
  const called = new Set();
  for (const e of exprs) {
    for (const c of e.matchAll(/(^|[^.\w$])([A-Za-z_$][\w$]*)\s*\(/g)) called.add(c[2]);
  }
  for (const name of called) {
    if (ALLOWED.has(name) || own.has(name)) continue;
    // a call written as this.x( or props.x( is resolved differently; bare names must be own
    console.log(`  ${m[1]}: template calls ${name}() but the class has no such method`);
    problems++;
  }
}
console.log(`${classes} components checked, ${problems} problem(s)`);
process.exit(problems ? 1 : 0);
