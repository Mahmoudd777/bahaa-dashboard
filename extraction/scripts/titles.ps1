param([string]$Pptx)
# app.xml carries the list of slide titles PowerPoint keeps for the document
# outline. It is an index written by the application, independent of anything
# read off the slides, so it is a fair check on whether a section was missed.
Add-Type -AssemblyName System.IO.Compression.FileSystem
$z = [System.IO.Compression.ZipFile]::OpenRead($Pptx)
$e = $z.Entries | Where-Object { $_.FullName -eq 'docProps/app.xml' }
$sr = New-Object System.IO.StreamReader($e.Open()); $x = $sr.ReadToEnd(); $sr.Close()
$z.Dispose()
$m = [regex]::Match($x, '<TitlesOfParts>.*?</TitlesOfParts>', 'Singleline')
$all = [regex]::Matches($m.Value, '<vt:lpstr>(.*?)</vt:lpstr>') | ForEach-Object { $_.Groups[1].Value }
# The list begins with fonts and themes, then the slide titles.
$all | ForEach-Object { ($_ -replace '\s+', ' ').Trim() } | Where-Object { $_ }
