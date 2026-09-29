param([string]$Pptx)
# A slide whose content is a picture carries almost no text of its own. This
# lists every slide with its text-run count and the images it embeds, so the
# ones that are pictures of slides can be told from ordinary ones.
Add-Type -AssemblyName System.IO.Compression.FileSystem
$z = [System.IO.Compression.ZipFile]::OpenRead($Pptx)
$rels = @{}
foreach ($e in ($z.Entries | Where-Object { $_.FullName -match '^ppt/slides/_rels/slide\d+\.xml\.rels$' })) {
  $n = [int][regex]::Match($e.FullName, 'slide(\d+)').Groups[1].Value
  $sr = New-Object System.IO.StreamReader($e.Open()); $x = $sr.ReadToEnd(); $sr.Close()
  $imgs = [regex]::Matches($x, 'media/([^"]+\.(?:png|jpe?g|emf))') | ForEach-Object { $_.Groups[1].Value }
  $rels[$n] = $imgs
}
foreach ($e in ($z.Entries | Where-Object { $_.FullName -match '^ppt/slides/slide\d+\.xml$' })) {
  $n = [int][regex]::Match($e.FullName, 'slide(\d+)').Groups[1].Value
  $sr = New-Object System.IO.StreamReader($e.Open()); $x = $sr.ReadToEnd(); $sr.Close()
  $runs = [regex]::Matches($x, '<a:t>').Count
  $imgs = $rels[$n]
  if ($runs -le 12 -and $imgs -and $imgs.Count -ge 1) {
    "slide$n runs=$runs images=$($imgs -join ',')"
  }
}
$z.Dispose()
