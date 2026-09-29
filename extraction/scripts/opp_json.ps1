param([string]$Pptx, [int]$From, [int]$To, [string]$OutFile)
# Emits each slide's text runs as an array, in z-order, so a parser can work on
# the runs rather than on a joined string where the separators are ambiguous.
Add-Type -AssemblyName System.IO.Compression.FileSystem
$z = [System.IO.Compression.ZipFile]::OpenRead($Pptx)
$out = @{}
for ($n = $From; $n -le $To; $n++) {
  $e = $z.Entries | Where-Object { $_.FullName -eq "ppt/slides/slide$n.xml" }
  if (-not $e) { continue }
  $sr = New-Object System.IO.StreamReader($e.Open()); $xml = $sr.ReadToEnd(); $sr.Close()
  $runs = @([regex]::Matches($xml, '<a:t>(.*?)</a:t>', 'Singleline') | ForEach-Object {
    ($_.Groups[1].Value -replace '\s+', ' ').Trim()
  } | Where-Object { $_ })
  $out["$n"] = $runs
}
$z.Dispose()
[System.IO.File]::WriteAllText($OutFile, ($out | ConvertTo-Json -Depth 4 -Compress), (New-Object System.Text.UTF8Encoding($false)))
"slides: " + $out.Count
