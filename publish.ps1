# $Root = ".\"
# $Source = $Root + "\dist\"
# $Target = $Root + "\public\"
# if (![System.IO.Directory]::Exists($Target)) {   
#     New-Item $Target -ItemType Directory
# }
# Get-ChildItem -Path $Source\*.* -Recurse | Remove-Item -Force
# Get-ChildItem -Path $Target\*.* -Recurse | Remove-Item -Force

# Check if SurrealDB is already running on the specified port
$connection = Test-NetConnection -ComputerName "localhost" -Port 8000

if ($connection.TcpTestSucceeded) {
    Write-Host "SurrealDB is already running on port 8000."
} else {
    Write-Host "SurrealDB is not running on port $port. Starting the server..."
    # Run the SurrealDB command to start the server
    Start-Process "surreal" -ArgumentList "start", "rocksdb://./surrealDB", "-u", "root", "-p", "root"
}

npm run build
# Copy-Item -Path $Source\* -Destination $Target -Recurse -Force
node ./dist/server/index.js