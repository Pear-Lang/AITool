# Define regex patterns for different character types
$uppercasePattern = '[A-Z]'
$lowercasePattern = '[a-z]'
$digitPattern = '\d'
$whitespacePattern = '\s'
$punctuationPattern = '[\p{P}]'  # Unicode punctuation

# Initialize total counters
$totalUppercase = 0
$totalLowercase = 0
$totalDigits = 0
$totalWhitespace = 0
$totalPunctuation = 0

# Retrieve all files recursively
Get-ChildItem -Recurse -File | ForEach-Object {
    try {
        # Read file content as a single string
        $content = Get-Content -Path $_.FullName -Raw -ErrorAction Stop

        # Split content into characters
        $chars = $content.ToCharArray()

        # Count different types of characters
        $totalUppercase += ($chars | Where-Object { $_ -match $uppercasePattern }).Count
        $totalLowercase += ($chars | Where-Object { $_ -match $lowercasePattern }).Count
        $totalDigits += ($chars | Where-Object { $_ -match $digitPattern }).Count
        $totalWhitespace += ($chars | Where-Object { $_ -match $whitespacePattern }).Count
        $totalPunctuation += ($chars | Where-Object { $_ -match $punctuationPattern }).Count
    }
    catch {
        Write-Warning "Failed to process file: $_.FullName. Error: $_"
    }
}

# Output the aggregated results
Write-Output "Total Uppercase Letters: $totalUppercase"
Write-Output "Total Lowercase Letters: $totalLowercase"
Write-Output "Total Digits: $totalDigits"
Write-Output "Total Whitespace Characters: $totalWhitespace"
Write-Output "Total Punctuation Characters: $totalPunctuation"
  