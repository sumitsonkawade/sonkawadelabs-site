# Static website hosting

`build-cloudfront.mjs` packages only tracked public website files, excluding server source,
dependencies, local previews, business templates, and deployment configuration. The studio and
Phone Munshi packages have separate homepages, robots files, and sitemaps. Each distribution has
its own routing function and Free pricing-plan subscription; both read separate prefixes from
one encrypted, versioned, private S3 bucket using signed origin access control.

The generated `.aws-build-current/template.json` defines the infrastructure. Certificate ARNs and managed
cache/header policy IDs are parameters. Certificates are DNS-validated in `us-east-1`; leave
their validation CNAME records in place for renewal. DNS stays at Hostinger. Existing email,
verification, app-subdomain records, and backend-hosted legal pages must remain unchanged.

## Publish website changes

Commit new public assets first: the build deliberately selects files from `git ls-files`.
Then run:

```powershell
& "$env:LOCALAPPDATA\Programs\Amazon\AWSCLIV2\aws.exe" login --profile websites
.\infra\deploy.ps1
```

This uploads assets before pages and invalidates the CloudFront caches. It does not change
infrastructure or DNS. HTML has a 60-second cache lifetime; assets have 300 seconds. Removed
objects are retained in S3, but the edge allowlist is generated from the tracked public files;
when adding/removing routes or assets, rebuild and update the CloudFormation stack as well.

## Infrastructure updates

Run `node --test infra/cloudfront.test.mjs` and `node infra/build-cloudfront.mjs`, validate the
generated template, and review a CloudFormation change set against `sonkawadelabs-websites-v5` in
`us-east-1`. Preserve the existing certificate and policy parameters. Review routing changes
against both the local routing tests and the existing `server.test.js` behavior.

Do not upgrade the `FREE` subscription tiers without owner authorization. S3 requests/storage
and any optional AWS services remain subject to their own allowances and pricing. The bucket
is retained if the stack is deleted; noncurrent object versions expire after 30 days.

## Rollback

The original Railway website services remain available during migration. DNS records captured
in `.aws-migration/*.before-cutover.json` contain the prior apex and `www` targets. Restore only
those two website records per domain to roll back; do not restore an entire old DNS snapshot
over newer email or certificate records. Keep the Phone Munshi voice/API backend and canonical legal policies on Google Cloud Run.

AWS account verification was cleared on 16 November 2026. See `.aws-migration/resume.md` for the latest stack and cutover state. Do not switch DNS until distributions are deployed, both Free plans are ACTIVE, and endpoint checks pass.

Free plans exclude detailed access logs. Keep access logging disabled and use the standard managed caching policy to preserve eligibility; do not silently upgrade to a paid plan. Subscribe the sites sequentially to avoid plan-service throttling. Policy routes stay on the website domain at `/static/legal/`. CloudFront fetches the current legal pages and stylesheet from the canonical Google Cloud Run origin over HTTPS using the managed CachingDisabled policy. Only allowlisted legal files are forwarded.

## Current endpoints (16 November 2026)

Stack `sonkawadelabs-websites-v5` is CREATE_COMPLETE. Both CloudFront subscriptions are FREE / ACTIVE.

| Site | Distribution | CloudFront hostname |
| --- | --- | --- |
| sonkawadelabs.in | E2GUTOM0LF436R | d2dp7y0smu1rta.cloudfront.net |
| phonemunshi.com | EPQ87XSEMC0YC | d2lx9qvgkpers2.cloudfront.net |

Content is stored in `sonkawadelabs-websites-v5-content-bbfzuquqfuty`, under `studio/` and `phone/`.
DNS cutover completed on 16 November 2026. Live root and www requests now reach CloudFront; www.phonemunshi.com redirects to the root domain. Original Railway services remain available for rollback and have not been stopped.
Endpoint verification matched all 12 files per site and checked same-domain legal navigation, canonical www handling, unknown routes and security headers.
