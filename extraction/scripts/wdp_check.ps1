param([string]$Dir = "client_data/pptx", [string]$Out = "wdp")
# .wdp is JPEG XR — PowerPoint keeps one beside an image that has effects
# applied. They were never extracted because the sweep only knew png/jpeg/emf.
# This pulls them out, deduplicates, and renders each to PNG so they can be
# looked at like any other picture.
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName PresentationCore
if (-not (Test-Path $Out)) { New-Item -ItemType Directory -Path $Out | Out-Null }
$seen = @{}
$total = 0; $kept = 0; $rendered = 0; $failed = 0
foreach ($pptx in (Get-ChildItem -Path $Dir -Filter *.pptx)) {
  $z = [System.IO.Compression.ZipFile]::OpenRead($pptx.FullName)
  foreach ($e in ($z.Entries | Where-Object { $_.FullName -like 'ppt/media/*.wdp' })) {
    $total++
    $ms = New-Object System.IO.MemoryStream
    $s = $e.Open(); $s.CopyTo($ms); $s.Close()
    $bytes = $ms.ToArray(); $ms.Close()
    if ($bytes.Length -lt 20000) { continue }
    $key = [System.BitConverter]::ToString([System.Security.Cryptography.SHA1]::Create().ComputeHash($bytes))
    if ($seen.ContainsKey($key)) { continue }
    $seen[$key] = $true; $kept++
    $name = "{0:D3}_{1}_{2}" -f $kept, $pptx.BaseName.Substring(0,2), [System.IO.Path]::GetFileNameWithoutExtension($e.Name)
    try {
      $in = New-Object System.IO.MemoryStream(,$bytes)
      $dec = [System.Windows.Media.Imaging.BitmapDecoder]::Create($in,
        [System.Windows.Media.Imaging.BitmapCreateOptions]::PreservePixelFormat,
        [System.Windows.Media.Imaging.BitmapCacheOption]::OnLoad)
      $enc = New-Object System.Windows.Media.Imaging.PngBitmapEncoder
      $enc.Frames.Add($dec.Frames[0])
      $fs = [System.IO.File]::Create((Join-Path $Out ($name + '.png')))
      $enc.Save($fs); $fs.Close(); $in.Close()
      $rendered++
    } catch { $failed++ }
  }
  $z.Dispose()
}
"wdp parts: $total | distinct and large: $kept | rendered: $rendered | failed: $failed"
