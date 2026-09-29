param([string]$Pptx, [int]$Slide)
# A slide that is a diagram rather than a table gives no reliable reading
# order, but every shape carries its position. Emitting text with x and y lets
# a parser rebuild the columns and rows the reader actually sees.
Add-Type -AssemblyName System.IO.Compression.FileSystem
$z = [System.IO.Compression.ZipFile]::OpenRead($Pptx)
$e = $z.Entries | Where-Object { $_.FullName -eq "ppt/slides/slide$Slide.xml" }
$sr = New-Object System.IO.StreamReader($e.Open()); $xml = $sr.ReadToEnd(); $sr.Close()
$z.Dispose()
$out = New-Object System.Text.StringBuilder
[void]$out.AppendLine("x,y,cx,cy,text")
foreach ($m in [regex]::Matches($xml, '<p:sp>.*?</p:sp>', 'Singleline')) {
  $s = $m.Value
  $off = [regex]::Match($s, '<a:off x="(-?\d+)" y="(-?\d+)"/>')
  $ext = [regex]::Match($s, '<a:ext cx="(\d+)" cy="(\d+)"/>')
  if (-not $off.Success) { continue }
  $t = (([regex]::Matches($s, '<a:t>(.*?)</a:t>', 'Singleline') | ForEach-Object { $_.Groups[1].Value }) -join ' ')
  $t = ($t -replace '\s+', ' ').Trim()
  if (-not $t) { continue }
  $q = '"' + ($t -replace '"', '""') + '"'
  [void]$out.AppendLine(($off.Groups[1].Value) + "," + ($off.Groups[2].Value) + "," +
    $(if ($ext.Success) { $ext.Groups[1].Value } else { 0 }) + "," +
    $(if ($ext.Success) { $ext.Groups[2].Value } else { 0 }) + "," + $q)
}
[System.IO.File]::WriteAllText("slide$Slide" + "_shapes.csv", $out.ToString(), (New-Object System.Text.UTF8Encoding($true)))
"shapes: " + ($out.ToString().Split("`n").Count - 2)
