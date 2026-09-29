# Two layers no earlier sweep read: the speaker notes, and the external
# targets of every hyperlink. Both can carry text that appears nowhere on
# a slide.
Add-Type -AssemblyName System.IO.Compression.FileSystem
$notes = @(); $links = @{}
foreach ($pptx in (Get-ChildItem -Path "D:/APPS/project/client_source_files" -Filter *.pptx | Sort-Object Name)) {
  $deck = $pptx.Name.Substring(0,2)
  $z = [System.IO.Compression.ZipFile]::OpenRead($pptx.FullName)
  foreach ($e in $z.Entries) {
    if ($e.FullName -match '^ppt/notesSlides/notesSlide(\d+)\.xml$') {
      $sr = New-Object System.IO.StreamReader($e.Open())
      $xml = $sr.ReadToEnd(); $sr.Close()
      $t = ([regex]::Matches($xml, '<a:t>([^<]*)</a:t>') | ForEach-Object { $_.Groups[1].Value }) -join ' '
      $t = ($t -replace '\s+',' ').Trim()
      # A notes page always carries the slide number placeholder; that alone is not content.
      if ($t.Length -gt 3 -and $t -notmatch '^\d+$') { $notes += "$deck/notesSlide$($Matches[1]): $t" }
    }
    if ($e.FullName -match '^ppt/slides/_rels/') {
      $sr = New-Object System.IO.StreamReader($e.Open())
      $xml = $sr.ReadToEnd(); $sr.Close()
      foreach ($m in [regex]::Matches($xml, 'Target="([^"]+)"\s+TargetMode="External"')) {
        $u = $m.Groups[1].Value
        if (-not $links.ContainsKey($u)) { $links[$u] = 0 }
        $links[$u]++
      }
    }
  }
  $z.Dispose()
}
"=== speaker notes with text: $($notes.Count) ==="
$notes | Select-Object -First 40
"=== distinct external hyperlink targets: $($links.Count) ==="
$links.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 30 | ForEach-Object { "{0,4}x  {1}" -f $_.Value, $_.Key }
