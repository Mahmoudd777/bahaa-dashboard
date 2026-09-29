param([string]$Pptx, [string[]]$Charts)
# Each slide's _rels names the chart parts it embeds. Walk the rels to map
# chart -> slide, then print that slide's text so a chart's bare numbers can be
# read against the axis labels and title that sit on the slide itself.
Add-Type -AssemblyName System.IO.Compression.FileSystem
$z = [System.IO.Compression.ZipFile]::OpenRead($Pptx)
function Txt($e) { $sr = New-Object System.IO.StreamReader($e.Open()); $t = $sr.ReadToEnd(); $sr.Close(); $t }
$map = @{}
foreach ($e in ($z.Entries | Where-Object { $_.FullName -match '^ppt/slides/_rels/slide\d+\.xml\.rels$' })) {
  $slide = [regex]::Match($e.FullName, 'slide(\d+)\.xml\.rels').Groups[1].Value
  $x = Txt $e
  foreach ($m in [regex]::Matches($x, 'charts/(chart\d+)\.xml')) {
    $map[$m.Groups[1].Value] = $slide
  }
}
foreach ($c in $Charts) {
  $s = $map[$c]
  "=== $c -> slide$s ==="
  if (-not $s) { continue }
  $se = $z.Entries | Where-Object { $_.FullName -eq "ppt/slides/slide$s.xml" }
  $xml = Txt $se
  ([regex]::Matches($xml, '<a:t>(.*?)</a:t>', 'Singleline') | ForEach-Object { $_.Groups[1].Value }) -join ' | '
}
$z.Dispose()
