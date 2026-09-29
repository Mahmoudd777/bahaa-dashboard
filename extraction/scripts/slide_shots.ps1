param([string]$In = "imgs", [string]$Out = "shots")
# A screenshot of a slide is wide, big, and has many distinct colours — unlike
# a logo (few colours) or a photograph (wide but smooth). Sampling a grid of
# pixels and counting how many are near-grey or near-white separates a
# document from a photograph well enough to sort what needs reading.
Add-Type -AssemblyName System.Drawing
if (-not (Test-Path $Out)) { New-Item -ItemType Directory -Path $Out | Out-Null }
$kept = 0
foreach ($f in (Get-ChildItem -Path $In -File | Sort-Object Name)) {
  try { $img = [System.Drawing.Bitmap]::FromFile($f.FullName) } catch { continue }
  $w = $img.Width; $h = $img.Height
  $ratio = $w / [double]$h
  if ($w -lt 700 -or $ratio -lt 1.2 -or $ratio -gt 2.6) { $img.Dispose(); continue }
  # Count how many sampled pixels sit in a narrow band of saturation: slide
  # backgrounds and text are flat, photographs are not.
  $flat = 0; $n = 0
  for ($x = 4; $x -lt $w; $x += [int]($w / 24)) {
    for ($y = 4; $y -lt $h; $y += [int]($h / 24)) {
      $c = $img.GetPixel($x, $y)
      $mx = [math]::Max($c.R, [math]::Max($c.G, $c.B))
      $mn = [math]::Min($c.R, [math]::Min($c.G, $c.B))
      if (($mx - $mn) -lt 26) { $flat++ }
      $n++
    }
  }
  $img.Dispose()
  if ($n -gt 0 -and ($flat / [double]$n) -gt 0.55) {
    Copy-Item $f.FullName (Join-Path $Out $f.Name)
    $kept++
  }
}
"document-like images: $kept"
