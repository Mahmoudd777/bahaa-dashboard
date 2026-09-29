param([string]$File, [int]$MaxRows = 40)

# Minimal xlsx reader: shared strings plus the first worksheet's cells, laid
# out by row. Enough to see what an embedded workbook holds without Excel.
Add-Type -AssemblyName System.IO.Compression.FileSystem
$z = [System.IO.Compression.ZipFile]::OpenRead($File)

function Read-Entry($name) {
  $e = $z.Entries | Where-Object { $_.FullName -eq $name }
  if (-not $e) { return $null }
  $sr = New-Object System.IO.StreamReader($e.Open()); $t = $sr.ReadToEnd(); $sr.Close(); return $t
}

$shared = @()
$ss = Read-Entry 'xl/sharedStrings.xml'
if ($ss) {
  foreach ($m in [regex]::Matches($ss, '<si>(.*?)</si>', 'Singleline')) {
    $txt = ([regex]::Matches($m.Groups[1].Value, '<t[^>]*>(.*?)</t>', 'Singleline') |
            ForEach-Object { $_.Groups[1].Value }) -join ''
    $shared += $txt
  }
}

foreach ($sheet in ($z.Entries | Where-Object { $_.FullName -match '^xl/worksheets/sheet\d+\.xml$' } | Select-Object -First 2)) {
  "--- $($sheet.FullName) ---"
  $sr = New-Object System.IO.StreamReader($sheet.Open()); $xml = $sr.ReadToEnd(); $sr.Close()
  $n = 0
  foreach ($rm in [regex]::Matches($xml, '<row[^>]*>(.*?)</row>', 'Singleline')) {
    $n++; if ($n -gt $MaxRows) { break }
    $cells = @()
    foreach ($cm in [regex]::Matches($rm.Groups[1].Value, '<c[^>]*?(?:\s+t="(?<t>[^"]+)")?[^>]*>(?:<v>(?<v>.*?)</v>|<is>.*?<t[^>]*>(?<i>.*?)</t>.*?</is>)?</c>', 'Singleline')) {
      $v = $cm.Groups['v'].Value
      if ($cm.Groups['t'].Value -eq 's' -and $v -ne '') { $v = $shared[[int]$v] }
      elseif ($cm.Groups['i'].Value) { $v = $cm.Groups['i'].Value }
      $cells += $v
    }
    $line = ($cells -join ' | ').Trim()
    if ($line -replace '[\s|]', '') { $line }
  }
}
$z.Dispose()
