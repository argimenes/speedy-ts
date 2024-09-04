$Root = ".\"
$Source = $Root + "\dist\"
$Target = $Root + "\public\"
if (![System.IO.Directory]::Exists($Target)) {   
    New-Item $Target -ItemType Directory
}
Get-ChildItem -Path $Source\*.* -Recurse | Remove-Item -Force
Get-ChildItem -Path $Target\*.* -Recurse | Remove-Item -Force
npm run build
Copy-Item -Path $Source\* -Destination $Target -Recurse -Force
node index.js