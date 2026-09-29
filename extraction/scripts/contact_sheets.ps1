param([string]$In = "imgs", [string]$Out = "sheetsimg", [int]$Cols = 8, [int]$Rows = 5, [int]$Cell = 250)
# 868 images is too many to open one at a time, so they go onto numbered
# contact sheets. A photograph and a screenshot of a table look nothing alike
# even at thumbnail size, which is all this has to tell apart.
Add-Type -AssemblyName System.Drawing
if (-not (Test-Path $Out)) { New-Item -ItemType Directory -Path $Out | Out-Null }
$files = Get-ChildItem -Path $In -File | Sort-Object Name
$perSheet = $Cols * $Rows
$sheetNo = 0
$font = New-Object System.Drawing.Font("Arial", 11)
$brush = [System.Drawing.Brushes]::Red
$failed = @()
for ($i = 0; $i -lt $files.Count; $i += $perSheet) {
  $sheetNo++
  $bmp = New-Object System.Drawing.Bitmap(($Cols * $Cell), ($Rows * $Cell))
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::FromArgb(245,245,245))
  for ($k = 0; $k -lt $perSheet -and ($i + $k) -lt $files.Count; $k++) {
    $f = $files[$i + $k]
    $x = ($k % $Cols) * $Cell
    $y = [math]::Floor($k / $Cols) * $Cell
    try {
      $img = [System.Drawing.Image]::FromFile($f.FullName)
      $scale = [math]::Min(($Cell - 22) / $img.Width, ($Cell - 22) / $img.Height)
      $w = [int]($img.Width * $scale); $h = [int]($img.Height * $scale)
      $g.DrawImage($img, ($x + ($Cell - $w) / 2), ($y + 18 + ($Cell - 22 - $h) / 2), $w, $h)
      $img.Dispose()
    } catch { $failed += $f.Name }
    $g.DrawString($f.Name.Substring(0,4), $font, $brush, ($x + 3), ($y + 2))
    $g.DrawRectangle([System.Drawing.Pens]::LightGray, $x, $y, $Cell, $Cell)
  }
  $g.Dispose()
  $bmp.Save((Join-Path $Out ("sheet{0:D2}.png" -f $sheetNo)), [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}
"sheets: $sheetNo | images: $($files.Count) | could not render: $($failed.Count)"
