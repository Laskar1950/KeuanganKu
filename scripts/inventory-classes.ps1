# Extracts every unique className token used across JSX files.
# Used for design-system coverage verification only (not shipped).
$files = Get-ChildItem -Path 'src' -Recurse -Filter '*.jsx'
$classes = @{}
foreach ($f in $files) {
  $content = Get-Content $f.FullName -Raw
  $regex = [regex]'className="([^"]+)"|className=\{`([^`]+)`\}|className=\{([^\}]*)\}'
  foreach ($m in $regex.Matches($content)) {
    $val = $m.Groups[1].Value + $m.Groups[2].Value + $m.Groups[3].Value
    foreach ($tok in ($val -split '\s+')) {
      $tok = $tok.Trim('`${}').Trim()
      if ($tok -match '^[a-zA-Z][a-zA-Z0-9_-]*$') { $classes[$tok] = $true }
    }
  }
}
$classes.Keys | Sort-Object
