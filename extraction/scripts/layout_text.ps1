param([string]$Dir = "client_data/pptx")
# Layouts and masters usually hold only placeholder prompts, but they are real
# parts with real text and nothing has looked at them. Anything that is not a
# placeholder prompt would be content hiding in the template.
Add-Type -AssemblyName System.IO.Compression.FileSystem
$seen = @{}
foreach ($pptx in (Get-ChildItem -Path $Dir -Filter *.pptx)) {
  $z = [System.IO.Compression.ZipFile]::OpenRead($pptx.FullName)
  foreach ($e in ($z.Entries | Where-Object { $_.FullName -match '^ppt/(slideLayouts|slideMasters|notesMasters|handoutMasters)/[^/]+\.xml$' })) {
    $sr = New-Object System.IO.StreamReader($e.Open()); $xml = $sr.ReadToEnd(); $sr.Close()
    foreach ($m in [regex]::Matches($xml, '<a:t>(.*?)</a:t>', 'Singleline')) {
      $t = ($m.Groups[1].Value -replace '\s+', ' ').Trim()
      if ($t.Length -lt 4) { continue }
      if (-not $seen.ContainsKey($t)) { $seen[$t] = 0 }
      $seen[$t] = $seen[$t] + 1
    }
  }
  $z.Dispose()
}
"distinct text runs across layouts and masters: $($seen.Count)"
$seen.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 40 |
  ForEach-Object { "{0,5}x  {1}" -f $_.Value, $_.Key.Substring(0, [Math]::Min(78, $_.Key.Length)) }
