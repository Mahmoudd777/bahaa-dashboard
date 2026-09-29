param([string]$Dir = "client_data/pptx")
Add-Type -AssemblyName System.IO.Compression.FileSystem
$names = New-Object System.Collections.ArrayList
foreach ($pptx in (Get-ChildItem -Path $Dir -Filter *.pptx)) {
  $z = [System.IO.Compression.ZipFile]::OpenRead($pptx.FullName)
  foreach ($e in $z.Entries) { [void]$names.Add($e.FullName) }
  $z.Dispose()
}
$rules = @(
  @('slide',              '^ppt/slides/slide\d+\.xml$'),
  @('slideLayout',        '^ppt/slideLayouts/slideLayout'),
  @('slideMaster',        '^ppt/slideMasters/'),
  @('notesSlide',         '^ppt/notesSlides/notesSlide'),
  @('notesMaster',        '^ppt/notesMasters/'),
  @('handoutMaster',      '^ppt/handoutMasters/'),
  @('chart',              '^ppt/charts/chart\d+\.xml$'),
  @('diagram (SmartArt)', '^ppt/diagrams/'),
  @('embedding',          '^ppt/embeddings/'),
  @('media SVG',          '^ppt/media/.*\.svg$'),
  @('media EMF/WMF',      '^ppt/media/.*\.(emf|wmf)$'),
  @('media raster',       '^ppt/media/.*\.(png|jpe?g|gif|bmp|tif|tiff)$'),
  @('media other',        '^ppt/media/'),
  @('docProps',           '^docProps/'),
  @('customXml',          '^customXml/'),
  @('tags',               '^ppt/tags/')
)
foreach ($r in $rules) {
  $n = ($names | Where-Object { $_ -match $r[1] }).Count
  if ($n -gt 0) { "{0,6}  {1}" -f $n, $r[0] }
}
