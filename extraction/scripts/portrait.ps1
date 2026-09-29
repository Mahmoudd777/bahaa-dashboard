param([string]$In = "missed", [string]$Out = "portraits")
# The filter required a landscape shape, so a portrait page — a letter, a
# scanned decision, a form — would have slipped past it. This is the one
# category the earlier sweep could systematically have missed.
Add-Type -AssemblyName System.Drawing
if (-not (Test-Path $Out)) { New-Item -ItemType Directory -Path $Out | Out-Null }
$kept = 0
foreach ($f in (Get-ChildItem -Path $In -File)) {
  try { $img = [System.Drawing.Bitmap]::FromFile($f.FullName) } catch { continue }
  $ratio = $img.Width / [double]$img.Height
  $img.Dispose()
  if ($ratio -lt 1.15) { Copy-Item $f.FullName (Join-Path $Out $f.Name); $kept++ }
}
"portrait or square images among the ones the filter passed over: $kept"
