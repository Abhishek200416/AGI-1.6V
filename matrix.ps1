param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$ArgsList
)
& "C:\Program Files\nodejs\node.exe" "$PSScriptRoot\matrix\cli\matrix-cli.js" @ArgsList
