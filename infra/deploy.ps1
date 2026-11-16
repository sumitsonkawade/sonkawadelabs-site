param([string]$Profile = 'websites')
$ErrorActionPreference = 'Stop'
$siteRoot = Split-Path $PSScriptRoot -Parent
$awsBinary = Join-Path $env:LOCALAPPDATA 'Programs\Amazon\AWSCLIV2\aws.exe'
if (-not (Test-Path $awsBinary)) { $awsBinary = 'aws' }
Push-Location $siteRoot
try {
    node --test infra/cloudfront.test.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Routing tests failed' }
    node infra/build-cloudfront.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Website build failed' }
    $stack = & $awsBinary cloudformation describe-stacks --stack-name sonkawadelabs-websites-v5 --region us-east-1 --profile $Profile --no-cli-pager | ConvertFrom-Json
    if ($LASTEXITCODE -ne 0) { throw 'Could not read website stack' }
    $outputs = @{}
    $stack.Stacks[0].Outputs | ForEach-Object { $outputs[$_.OutputKey] = $_.OutputValue }
    foreach ($site in @(@('studio','StudioDistributionId'), @('phone','PhoneDistributionId'))) {
        # Upload assets before HTML. Do not delete old objects during a live deployment.
        & $awsBinary s3 sync ".aws-build-current/$($site[0])/" "s3://$($outputs.Bucket)/$($site[0])/" --exclude '*.html' --cache-control 'public,max-age=300' --profile $Profile --no-cli-pager
        if ($LASTEXITCODE -ne 0) { throw 'Asset upload failed' }
        & $awsBinary s3 sync ".aws-build-current/$($site[0])/" "s3://$($outputs.Bucket)/$($site[0])/" --exclude '*' --include '*.html' --cache-control 'public,max-age=60,must-revalidate' --profile $Profile --no-cli-pager
        if ($LASTEXITCODE -ne 0) { throw 'Page upload failed' }
        & $awsBinary cloudfront create-invalidation --distribution-id $outputs[$site[1]] --paths '/*' --profile $Profile --no-cli-pager
        if ($LASTEXITCODE -ne 0) { throw 'Cache invalidation failed' }
    }
} finally { Pop-Location }
