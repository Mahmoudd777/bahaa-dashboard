param([string]$Pptx, [int]$From, [int]$To)
Add-Type -AssemblyName System.IO.Compression.FileSystem
$z = [System.IO.Compression.ZipFile]::OpenRead($Pptx)
for ($n = $From; $n -le $To; $n++) {
  $e = $z.Entries | Where-Object { $_.FullName -eq "ppt/slides/slide$n.xml" }
  if (-not $e) { continue }
  $sr = New-Object System.IO.StreamReader($e.Open()); $xml = $sr.ReadToEnd(); $sr.Close()
  $texts = [regex]::Matches($xml, '<a:t>(.*?)</a:t>', 'Singleline') | ForEach-Object { ($_.Groups[1].Value -replace '\s+', ' ').Trim() }
  "### slide$n"
  ($texts | Where-Object { $_ }) -join ' | '
}
$z.Dispose()
