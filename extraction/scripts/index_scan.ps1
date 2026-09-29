param([string]$Pptx)
# The decks carry their own tables of contents. Using them as the checklist is
# the only way to know a section was not simply never looked at.
Add-Type -AssemblyName System.IO.Compression.FileSystem
$z = [System.IO.Compression.ZipFile]::OpenRead($Pptx)
foreach ($e in ($z.Entries | Where-Object { $_.FullName -match '^ppt/slides/slide\d+\.xml$' })) {
  $n = [int][regex]::Match($e.FullName, 'slide(\d+)\.xml').Groups[1].Value
  $sr = New-Object System.IO.StreamReader($e.Open()); $xml = $sr.ReadToEnd(); $sr.Close()
  $runs = @([regex]::Matches($xml, '<a:t>(.*?)</a:t>', 'Singleline') | ForEach-Object { ($_.Groups[1].Value -replace '\s+', ' ').Trim() } | Where-Object { $_ })
  if ($runs -contains 'فهرس' -or $runs -contains 'المحتويات' -or ($runs | Where-Object { $_ -match '^المحتوى' })) {
    "### slide$n"
    ($runs -join ' | ')
  }
}
$z.Dispose()
