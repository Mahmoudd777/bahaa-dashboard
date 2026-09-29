param([string]$In = "imgs", [string]$Shots = "shots", [string]$Out = "missed")
# The document filter wanted a landscape shape. A portrait letter or a very
# wide banner would have failed it while still carrying text. This collects
# every large image the filter did not pick, so the claim that nothing is
# left can be checked rather than asserted.
Add-Type -AssemblyName System.Drawing
if (-not (Test-Path $Out)) { New-Item -ItemType Directory -Path $Out | Out-Null }
$picked = @{}
Get-ChildItem -Path $Shots -File | ForEach-Object { $picked[$_.Name] = $true }
$kept = 0
foreach ($f in (Get-ChildItem -Path $In -File | Sort-Object Name)) {
  if ($picked.ContainsKey($f.Name)) { continue }
  try { $img = [System.Drawing.Bitmap]::FromFile($f.FullName) } catch { continue }
  $w = $img.Width; $h = $img.Height
  # big enough that text could be legible in it
  $big = ($w -ge 900 -or $h -ge 900)
  $flat = 0; $n = 0
  if ($big) {
    for ($x = 4; $x -lt $w; $x += [int][math]::Max(1, ($w / 20))) {
      for ($y = 4; $y -lt $h; $y += [int][math]::Max(1, ($h / 20))) {
        $c = $img.GetPixel($x, $y)
        $mx = [math]::Max($c.R, [math]::Max($c.G, $c.B)); $mn = [math]::Min($c.R, [math]::Min($c.G, $c.B))
        if (($mx - $mn) -lt 40) { $flat++ }
        $n++
      }
    }
  }
  $img.Dispose()
  if ($big -and $n -gt 0 -and ($flat / [double]$n) -gt 0.45) {
    Copy-Item $f.FullName (Join-Path $Out $f.Name); $kept++
  }
}
"large images the document filter did not pick, but which look flat enough to carry text: $kept"
