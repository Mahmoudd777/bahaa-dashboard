param([string]$File, [string]$OutFile)

# Charts carry their own data: a category axis and one or more named series.
# Nothing else in the decks holds the year-by-year figures behind them, so
# this reads them straight out of the chart parts.
Add-Type -AssemblyName System.IO.Compression.FileSystem
$z = [System.IO.Compression.ZipFile]::OpenRead($File)
$out = New-Object System.Text.StringBuilder
[void]$out.AppendLine("chart,series,category,value")

function Esc($s) {
  $t = ($s -replace '\s+', ' ').Trim()
  if ($t -match '[",]') { return '"' + ($t -replace '"', '""') + '"' }
  return $t
}

foreach ($e in ($z.Entries | Where-Object { $_.FullName -like 'ppt/charts/chart*.xml' })) {
  $sr = New-Object System.IO.StreamReader($e.Open()); $xml = $sr.ReadToEnd(); $sr.Close()
  $name = [System.IO.Path]::GetFileNameWithoutExtension($e.Name)

  # each <c:ser> holds one series: its name, its categories and its values
  foreach ($m in [regex]::Matches($xml, '<c:ser>.*?</c:ser>', 'Singleline')) {
    $s = $m.Value
    $sname = ''
    $tx = [regex]::Match($s, '<c:tx>.*?<c:v>(.*?)</c:v>', 'Singleline')
    if ($tx.Success) { $sname = $tx.Groups[1].Value }

    $cats = @()
    $cm = [regex]::Match($s, '<c:cat>(.*?)</c:cat>', 'Singleline')
    if ($cm.Success) {
      $cats = [regex]::Matches($cm.Groups[1].Value, '<c:v>(.*?)</c:v>') | ForEach-Object { $_.Groups[1].Value }
    }

    $vals = @()
    $vm = [regex]::Match($s, '<c:val>(.*?)</c:val>', 'Singleline')
    if ($vm.Success) {
      $vals = [regex]::Matches($vm.Groups[1].Value, '<c:v>(.*?)</c:v>') | ForEach-Object { $_.Groups[1].Value }
    }

    for ($i = 0; $i -lt $vals.Count; $i++) {
      $cat = if ($i -lt $cats.Count) { $cats[$i] } else { "" }
      [void]$out.AppendLine((Esc $name) + "," + (Esc $sname) + "," + (Esc $cat) + "," + (Esc $vals[$i]))
    }
  }
}
$z.Dispose()
[System.IO.File]::WriteAllText($OutFile, $out.ToString(), (New-Object System.Text.UTF8Encoding($true)))
"rows: " + ($out.ToString().Split("`n").Count - 2)
