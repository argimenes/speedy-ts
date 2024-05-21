npm run build
$TargetEnv_Desktop = "C:\Users\iiand\Documents\Projects\speedy-ts"
$Target_Base = $TargetEnv_Desktop + "\public\"
$TargetPath = $Target_Base
if (![System.IO.Directory]::Exists($TargetPath)) {   
    New-Item $TargetPath -ItemType Directory
}
Remove-Item $TargetPath\*.*
Get-ChildItem -Path .\dist\assets\index.*.js | Select-Object -First 1 | Copy-Item -Destination $TargetPath\index.js -Force
Get-ChildItem -Path .\dist\assets\index.*.css | Select-Object -First 1 | Copy-Item -Destination $TargetPath\index.css -Force