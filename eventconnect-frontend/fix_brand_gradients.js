const fs = require('fs');
const path = require('path');
const glob = require('child_process').execSync;

// Find all tsx/ts under src except node_modules
const files = glob.execSync('find src -type f \\( -name "*.tsx" -o -name "*.ts" \\)', { cwd: process.cwd() }).toString().trim().split('\n');

const map = [
  [/from-blue-500 to-cyan-500/g, 'from-emerald-500 to-teal-500'],
  [/from-blue-500 to-purple-500/g, 'from-emerald-500 to-teal-500'],
  [/from-blue-500 to-green-500/g, 'from-emerald-500 to-teal-500'],
  [/from-blue-500 to-indigo-500/g, 'from-emerald-500 to-teal-500'],
  [/from-blue-400 to-blue-600/g, 'from-emerald-400 to-emerald-600'],
  [/from-blue-600 to-indigo-600/g, 'from-emerald-500 to-teal-500'],
  [/from-blue-500 to-indigo-500/g, 'from-emerald-500 to-teal-500'],
  [/from-emerald-50 to-blue-50/g, 'from-emerald-50 to-teal-50'],
  [/from-blue-100 to-purple-100/g, 'from-emerald-100 to-teal-100'],
  [/from-blue-400 to-cyan-500/g, 'from-emerald-400 to-teal-500'],
  [/from-blue-500 to-cyan-400/g, 'from-emerald-500 to-teal-400'],
  // purple/violet brand gradients -> emerald/teal for cohesion
  [/from-violet-500 to-purple-500/g, 'from-emerald-500 to-teal-500'],
  [/from-purple-500 to-pink-500/g, 'from-emerald-500 to-teal-500'],
  [/from-violet-600 to-indigo-600/g, 'from-emerald-500 to-teal-500'],
];

let changed = 0;
for (const f of files) {
  let s = fs.readFileSync(f, 'utf8');
  const orig = s;
  for (const [re, rep] of map) {
    s = s.replace(re, rep);
  }
  if (s !== orig) {
    fs.writeFileSync(f, s);
    changed++;
  }
}
console.log('Files with brand-gradient unification:', changed);
