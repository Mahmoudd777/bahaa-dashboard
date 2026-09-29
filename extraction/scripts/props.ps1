param([string]$Dir = "client_data/pptx")
Add-Type -AssemblyName System.IO.Compression.FileSystem
foreach ($pptx in (Get-ChildItem -Path $Dir -Filter *.pptx)) {
  "##### " + $pptx.BaseName
  $z = [System.IO.Compression.ZipFile]::OpenRead($pptx.FullName)
  foreach ($e in ($z.Entries | Where-Object { $_.FullName -match '^(docProps/|customXml/)' })) {
    $sr = New-Object System.IO.StreamReader($e.Open()); $x = $sr.ReadToEnd(); $sr.Close()
    $t = ($x -replace '<[^>]+>', ' ') -replace '\s+', ' '
    $t = $t.Trim()
    if ($t.Length -gt 0) { "  [$($e.FullName)] " + $t.Substring(0, [Math]::Min(220, $t.Length)) }
  }
  # media extensions actually present
  $ext = $z.Entries | Where-Object { $_.FullName -like 'ppt/media/*' } |
    ForEach-Object { [System.IO.Path]::GetExtension($_.Name).ToLower() } |
    Group-Object | Sort-Object Count -Descending |
    ForEach-Object { "$($_.Name)=$($_.Count)" }
  "  media: " + ($ext -join ', ')
  # hidden slides
  $hidden = 0
  foreach ($e in ($z.Entries | Where-Object { $_.FullName -match '^ppt/slides/slide\d+\.xml$' })) {
    $sr = New-Object System.IO.StreamReader($e.Open()); $x = $sr.ReadToEnd(); $sr.Close()
    if ($x -match '<p:sld[^>]*show="0"') { $hidden++ }
  }
  "  hidden slides: $hidden"
  $z.Dispose()
}
