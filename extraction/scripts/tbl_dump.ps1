param([string]$Pptx, [int]$From, [int]$To)
# Slide tables keep their cells in row order inside <a:tbl>, unlike loose text
# boxes, so reading the table markup gives back the grid the deck shows.
Add-Type -AssemblyName System.IO.Compression.FileSystem
$z = [System.IO.Compression.ZipFile]::OpenRead($Pptx)
for ($n = $From; $n -le $To; $n++) {
  $e = $z.Entries | Where-Object { $_.FullName -eq "ppt/slides/slide$n.xml" }
  if (-not $e) { continue }
  $sr = New-Object System.IO.StreamReader($e.Open()); $xml = $sr.ReadToEnd(); $sr.Close()
  $t = 0
  foreach ($tbl in [regex]::Matches($xml, '<a:tbl>.*?</a:tbl>', 'Singleline')) {
    $t++
    "### slide$n table$t"
    foreach ($row in [regex]::Matches($tbl.Value, '<a:tr[ >].*?</a:tr>', 'Singleline')) {
      $cells = @()
      foreach ($tc in [regex]::Matches($row.Value, '<a:tc[ >].*?</a:tc>', 'Singleline')) {
        $txt = (([regex]::Matches($tc.Value, '<a:t>(.*?)</a:t>', 'Singleline') | ForEach-Object { $_.Groups[1].Value }) -join ' ')
        $cells += ($txt -replace '\s+', ' ').Trim()
      }
      ($cells -join ' ||| ')
    }
  }
}
$z.Dispose()
