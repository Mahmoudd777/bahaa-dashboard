# The notes are the only place a derivation is written out. Dump them as
# UTF-8 with the slide each one belongs to, so the text can be read.
Add-Type -AssemblyName System.IO.Compression.FileSystem
$out = New-Object System.Collections.ArrayList
foreach ($pptx in (Get-ChildItem -Path "D:/APPS/project/client_source_files" -Filter *.pptx | Sort-Object Name)) {
  $deck = $pptx.Name.Substring(0,2)
  $z = [System.IO.Compression.ZipFile]::OpenRead($pptx.FullName)
  # A notes page names its slide through its own relationships file.
  $rels = @{}
  foreach ($e in $z.Entries) {
    if ($e.FullName -match '^ppt/notesSlides/_rels/notesSlide(\d+)\.xml\.rels$') {
      $n = $Matches[1]
      $sr = New-Object System.IO.StreamReader($e.Open()); $x = $sr.ReadToEnd(); $sr.Close()
      if ($x -match 'slides/slide(\d+)\.xml') { $rels[$n] = $Matches[1] }
    }
  }
  foreach ($e in $z.Entries) {
    if ($e.FullName -match '^ppt/notesSlides/notesSlide(\d+)\.xml$') {
      $n = $Matches[1]
      $sr = New-Object System.IO.StreamReader($e.Open()); $x = $sr.ReadToEnd(); $sr.Close()
      $t = ([regex]::Matches($x, '<a:t>([^<]*)</a:t>') | ForEach-Object { $_.Groups[1].Value }) -join ' '
      $t = ($t -replace '\s+',' ').Trim()
      if ($t.Length -gt 3 -and $t -notmatch '^\d+$') {
        [void]$out.Add("deck$deck slide$($rels[$n])`t$t")
      }
    }
  }
  $z.Dispose()
}
[System.IO.File]::WriteAllLines("notes_text.txt", $out, (New-Object System.Text.UTF8Encoding $true))
"wrote $($out.Count) notes"
