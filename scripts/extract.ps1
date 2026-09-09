$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
$root = Split-Path $PSScriptRoot -Parent
$file = Get-ChildItem -LiteralPath $root -Filter '*.xlsx' | Where-Object { $_.Name -notlike '~$*' } | Select-Object -First 1
$stream = [IO.File]::Open($file.FullName, 'Open', 'Read', 'ReadWrite')
$zip = [IO.Compression.ZipArchive]::new($stream)
function Read-Xml($name) {
  $reader = [IO.StreamReader]::new($zip.GetEntry($name).Open())
  try { [xml]$reader.ReadToEnd() } finally { $reader.Dispose() }
}
try {
  $strings = Read-Xml 'xl/sharedStrings.xml'
  $shared = @($strings.sst.si | ForEach-Object { $_.InnerText })
  $sheet = Read-Xml 'xl/worksheets/sheet1.xml'
  $rows = @($sheet.worksheet.sheetData.row | ForEach-Object {
    $cells = [ordered]@{ row = [int]$_.r }
    foreach ($cell in $_.c) {
      $value = $cell.v
      if ($cell.t -eq 's') { $value = $shared[[int]$value] }
      elseif ($cell.t -eq 'inlineStr') { $value = $cell.is.InnerText }
      if ($null -ne $value -and "$value" -ne '') { $cells[$cell.r -replace '\d',''] = "$value" }
    }
    if ($cells.Count -gt 1) { $cells }
  })
  New-Item -ItemType Directory -Force -Path "$root/src" | Out-Null
  $rows | ConvertTo-Json -Depth 8 | Set-Content -Encoding UTF8 "$root/src/raw-data.json"
  $rows | Select-Object -First 18 | ConvertTo-Json -Depth 8
} finally { $zip.Dispose(); $stream.Dispose() }
