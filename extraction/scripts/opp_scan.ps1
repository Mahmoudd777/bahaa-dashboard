param([string]$Pptx)
# The investment opportunities are written as numbered slide titles ("21. منتجع
# الباحة الجبلي"). Nothing indexes them, so this sweeps every slide for a title
# of that shape and prints it with its slide number.
Add-Type -AssemblyName System.IO.Compression.FileSystem
$z = [System.IO.Compression.ZipFile]::OpenRead($Pptx)
$rows = @()
foreach ($e in ($z.Entries | Where-Object { $_.FullName -match '^ppt/slides/slide\d+\.xml$' })) {
  $n = [int][regex]::Match($e.FullName, 'slide(\d+)\.xml').Groups[1].Value
  $sr = New-Object System.IO.StreamReader($e.Open()); $xml = $sr.ReadToEnd(); $sr.Close()
  $texts = [regex]::Matches($xml, '<a:t>(.*?)</a:t>', 'Singleline') | ForEach-Object { $_.Groups[1].Value }
  foreach ($t in $texts) {
    $c = ($t -replace '\s+', ' ').Trim()
    if ($c -match '^\d{1,2}\s*\.\s*\S' -and $c.Length -gt 6 -and $c.Length -lt 70) {
      $rows += [pscustomobject]@{ slide = $n; title = $c }
      break
    }
  }
}
$z.Dispose()
$rows | Sort-Object slide | ForEach-Object { "$($_.slide)`t$($_.title)" }
