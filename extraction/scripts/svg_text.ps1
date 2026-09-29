param([string]$Dir = "client_data/pptx", [string]$OutFile = "svg_text.txt")
# An SVG stores its labels as text, not pixels. If any of these carry data,
# it is readable without looking at a picture — and no sweep has touched them.
Add-Type -AssemblyName System.IO.Compression.FileSystem
$out = New-Object System.Text.StringBuilder
$withText = 0; $total = 0
foreach ($pptx in (Get-ChildItem -Path $Dir -Filter *.pptx)) {
  $z = [System.IO.Compression.ZipFile]::OpenRead($pptx.FullName)
  foreach ($e in ($z.Entries | Where-Object { $_.FullName -like 'ppt/media/*.svg' })) {
    $total++
    $sr = New-Object System.IO.StreamReader($e.Open()); $xml = $sr.ReadToEnd(); $sr.Close()
    $texts = [regex]::Matches($xml, '<text[^>]*>(.*?)</text>|<tspan[^>]*>(.*?)</tspan>', 'Singleline') |
      ForEach-Object { ($_.Groups[1].Value + $_.Groups[2].Value) -replace '<[^>]+>', '' } |
      ForEach-Object { ($_ -replace '\s+', ' ').Trim() } | Where-Object { $_ }
    if ($texts.Count -gt 0) {
      $withText++
      [void]$out.AppendLine("=== $($pptx.BaseName.Substring(0,2)) / $($e.Name) ($($texts.Count) runs)")
      [void]$out.AppendLine(($texts -join ' | '))
    }
  }
  $z.Dispose()
}
[System.IO.File]::WriteAllText($OutFile, $out.ToString(), (New-Object System.Text.UTF8Encoding($true)))
"svg files: $total | carrying text: $withText"
