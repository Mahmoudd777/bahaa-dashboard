param([string]$Dir = "client_data/pptx")
# Every part type in every deck, so nothing is assumed to have been looked at.
Add-Type -AssemblyName System.IO.Compression.FileSystem
$tally = @{}
foreach ($pptx in (Get-ChildItem -Path $Dir -Filter *.pptx)) {
  $z = [System.IO.Compression.ZipFile]::OpenRead($pptx.FullName)
  foreach ($e in $z.Entries) {
    $kind = switch -regex ($e.FullName) {
      '^ppt/slides/slide\d+\.xml$'        { 'slide' }
      '^ppt/slideLayouts/'                { 'slideLayout' }
      '^ppt/slideMasters/'                { 'slideMaster' }
      '^ppt/notesSlides/'                 { 'notesSlide' }
      '^ppt/notesMasters/'                { 'notesMaster' }
      '^ppt/handoutMasters/'              { 'handoutMaster' }
      '^ppt/charts/'                      { 'chart' }
      '^ppt/diagrams/'                    { 'diagram (SmartArt)' }
      '^ppt/embeddings/'                  { 'embedding' }
      '^ppt/media/.*\.svg$'               { 'media: SVG' }
      '^ppt/media/.*\.emf$'               { 'media: EMF' }
      '^ppt/media/.*\.(png|jpe?g|gif|bmp|tiff?)$' { 'media: raster' }
      '^ppt/media/'                       { 'media: other' }
      '^docProps/'                        { 'docProps' }
      '^ppt/tags/'                        { 'tags' }
      '^customXml/'                       { 'customXml' }
      default                             { 'other' }
    }
    if (-not $tally.ContainsKey($kind)) { $tally[$kind] = 0 }
    $tally[$kind]++
  }
  $z.Dispose()
}
$tally.GetEnumerator() | Sort-Object Value -Descending | ForEach-Object { "{0,6}  {1}" -f $_.Value, $_.Key }
