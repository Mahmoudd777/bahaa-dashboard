param([string]$Dir = "client_data/pptx", [string]$Out = "imgs")
# Pull every embedded image out of all six decks, keeping one copy of each
# distinct file: the decks reuse logos and furniture on hundreds of slides, so
# deduplicating by content is what makes looking at them by eye feasible.
Add-Type -AssemblyName System.IO.Compression.FileSystem
if (-not (Test-Path $Out)) { New-Item -ItemType Directory -Path $Out | Out-Null }
$seen = @{}
$kept = 0; $total = 0
foreach ($pptx in (Get-ChildItem -Path $Dir -Filter *.pptx)) {
  $z = [System.IO.Compression.ZipFile]::OpenRead($pptx.FullName)
  foreach ($e in ($z.Entries | Where-Object { $_.FullName -match '^ppt/media/.*\.(png|jpe?g|emf|gif|bmp)$' })) {
    $total++
    $ms = New-Object System.IO.MemoryStream
    $s = $e.Open(); $s.CopyTo($ms); $s.Close()
    $bytes = $ms.ToArray(); $ms.Close()
    if ($bytes.Length -lt 6000) { continue }          # icons and rules
    $sha = [System.Security.Cryptography.SHA1]::Create().ComputeHash($bytes)
    $key = [System.BitConverter]::ToString($sha)
    if ($seen.ContainsKey($key)) { continue }
    $seen[$key] = $true
    $ext = [System.IO.Path]::GetExtension($e.Name)
    $name = "{0:D4}_{1}_{2}{3}" -f $kept, $pptx.BaseName.Substring(0,2), [System.IO.Path]::GetFileNameWithoutExtension($e.Name), $ext
    [System.IO.File]::WriteAllBytes((Join-Path $Out $name), $bytes)
    $kept++
  }
  $z.Dispose()
}
"images in the decks: $total | distinct and large enough to carry data: $kept"
