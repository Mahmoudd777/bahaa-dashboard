param([string]$File, [string]$OutFile, [int]$MaxSlides = 0)

Add-Type -AssemblyName System.IO.Compression.FileSystem
$ns = @{a='http://schemas.openxmlformats.org/drawingml/2006/main'}
$z = [System.IO.Compression.ZipFile]::OpenRead($File)
$slides = $z.Entries | Where-Object { $_.FullName -match '^ppt/slides/slide\d+\.xml$' } |
          Sort-Object { [int]([regex]::Match($_.FullName,'slide(\d+)\.xml').Groups[1].Value) }
$sb = New-Object System.Text.StringBuilder
$n = 0
foreach ($e in $slides) {
    $n++
    if ($MaxSlides -gt 0 -and $n -gt $MaxSlides) { break }
    $sr = New-Object System.IO.StreamReader($e.Open())
    $xml = [xml]$sr.ReadToEnd(); $sr.Close()
    [void]$sb.AppendLine("")
    [void]$sb.AppendLine("=== SLIDE $n ===")

    # tables
    $nsm = New-Object System.Xml.XmlNamespaceManager($xml.NameTable)
    $nsm.AddNamespace('a', $ns.a)
    $tbls = $xml.SelectNodes("//a:tbl", $nsm)
    $ti = 0
    foreach ($t in $tbls) {
        $ti++
        [void]$sb.AppendLine("--- TABLE $ti ---")
        foreach ($tr in $t.SelectNodes("a:tr", $nsm)) {
            $cells = @()
            foreach ($tc in $tr.SelectNodes("a:tc", $nsm)) {
                $txt = ($tc.SelectNodes(".//a:t", $nsm) | ForEach-Object { $_.InnerText }) -join ' '
                $cells += ($txt -replace '\s+',' ').Trim()
            }
            [void]$sb.AppendLine(($cells -join " | "))
        }
    }

    # non-table text
    $free = @()
    foreach ($sp in $xml.SelectNodes("//a:t", $nsm)) {
        $inTable = $false
        $p = $sp.ParentNode
        while ($p -ne $null) { if ($p.LocalName -eq 'tbl') { $inTable = $true; break }; $p = $p.ParentNode }
        if (-not $inTable) { $t2 = ($sp.InnerText -replace '\s+',' ').Trim(); if ($t2) { $free += $t2 } }
    }
    if ($free.Count) {
        [void]$sb.AppendLine("--- TEXT ---")
        [void]$sb.AppendLine(($free -join " ~ "))
    }
}
$z.Dispose()
[System.IO.File]::WriteAllText($OutFile, $sb.ToString(), (New-Object System.Text.UTF8Encoding($true)))
"slides processed: $n"
"written: $OutFile"
