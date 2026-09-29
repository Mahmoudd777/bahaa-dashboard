// Charts carry numbers but not always their axis labels; the labels live on the
// slide that embeds them. This maps each chart part back to its slide and
// prints that slide's text so a bare series can be read in context.
import {readFileSync, existsSync} from 'node:fs';
import {execSync} from 'node:child_process';
const dir = 'client_data/pptx_04';
if (!existsSync(dir)) {
  execSync(`powershell -NoProfile -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory('client_data/pptx/04_الوثيقة التفصيلية لاستراتيجية تطوير منطقة الباحة 21092026.pptx','${dir}')"`, {stdio:'inherit'});
}
