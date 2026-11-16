import {execFileSync} from 'node:child_process';
import {mkdirSync, readFileSync, writeFileSync, copyFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tracked = execFileSync('git', ['ls-files', '-z'], {cwd: root, encoding: 'utf8'}).split('\0');
export const files = tracked.filter(p => /^(?:index\.html|robots\.txt|sitemap\.xml|googlef05130026d779268\.html|phone-munshi\/(?:index\.html|data-deletion\/index\.html)|assets\/(?:site\.(?:css|js)|phone-munshi\.css|phone-munshi\/(?:logo\.svg|app-icon\.png|business-assistant\.webp)))$/.test(p));
const redirects = JSON.parse(readFileSync(join(root, 'serve.json'))).redirects;

export function edgeCode(phone) {
  const pages = Object.fromEntries(files.filter(p => p.endsWith('.html')).map(p => [p.endsWith('/index.html') ? '/' + p.slice(0, -11) : '/' + p.slice(0, -5), '/' + p]));
  return `var phone = ${phone};
var pages = ${JSON.stringify(pages)};
var files = ${JSON.stringify(Object.fromEntries(files.map(p => ['/' + p, true])))};
var redirects = ${JSON.stringify(Object.fromEntries(redirects.map(r => [r.source, r.destination])))};
function handler(event) {
  var r = event.request, uri = r.uri;
  function redirect(location, status) {
    var q = [];
    for (var k in r.querystring) {
      var item = r.querystring[k], values = item.multiValue || [item];
      for (var i = 0; i < values.length; i++) q.push(encodeURIComponent(k) + '=' + encodeURIComponent(values[i].value));
    }
    if (q.length) {
      var hash = location.indexOf('#'), fragment = hash < 0 ? '' : location.slice(hash);
      location = (hash < 0 ? location : location.slice(0, hash)) + '?' + q.join('&') + fragment;
    }
    return {statusCode: status, headers: {location: {value: location}}};
  }
  if (phone && r.headers.host.value === 'www.phonemunshi.com') return redirect('https://phonemunshi.com' + uri, 301);
  var legal = uri.match(/^\\/phone-munshi\\/(privacy|terms|refunds|faq)(?:\\/|\\/index.html)?$/) || (phone && uri.match(/^\\/(privacy|terms|refunds|faq)(?:\\/|\\/index.html)?$/));
  if (legal) {
    var names = {privacy:'privacy.html',terms:'terms.html',refunds:'refund.html',faq:'faq.html'};
    return redirect('/static/legal/' + names[legal[1]], 302);
  }
  if (/^\\/static\\/legal\\/(?:(?:index|privacy|terms|refund|faq)\\.html|legal\\.css|metadata\\.json)$/.test(uri)) return r;
  if (redirects[uri]) return redirect(redirects[uri], 301);
  if (uri === '/') {r.uri = '/index.html'; return r;}
  var key = uri.replace(/\\/$/, '');
  if (pages[key]) {
    if (pages[key].slice(-11) === '/index.html' && uri.slice(-1) !== '/') return redirect(uri + '/', 301);
    r.uri = pages[key]; return r;
  }
  if (/^\\/(?:arzi|csc-pro|helpora|stocksaathi|products|thank-you)(?:\\/|$)/i.test(uri) || /\\.pdf$/i.test(uri) || uri === '/invoice-sample.html') return {statusCode:410, body:'This page has been removed.'};
  var decoded;
  try {decoded = decodeURIComponent(uri);} catch(e) {return {statusCode:400};}
  if (files[decoded]) return r;
  return {statusCode:404, headers:{'content-type':{value:'text/plain; charset=utf-8'}}, body:'Page not found.'};
}
`;
}

const ref = name => ({Ref:name});
const att = (name, key) => ({'Fn::GetAtt':[name,key]});
const sub = text => ({'Fn::Sub':text});
const resources = {};
function resource(name, type, properties, why, must = []) {
  resources[name] = {Type:type, Properties:properties, Metadata:{'com.aws.cloudformation.Context':{why,must}}};
}
resource('Content', 'AWS::S3::Bucket', {
  PublicAccessBlockConfiguration:{BlockPublicAcls:true,BlockPublicPolicy:true,IgnorePublicAcls:true,RestrictPublicBuckets:true},
  BucketEncryption:{ServerSideEncryptionConfiguration:[{ServerSideEncryptionByDefault:{SSEAlgorithm:'AES256'}}]},
  VersioningConfiguration:{Status:'Enabled'},
  LifecycleConfiguration:{Rules:[{Id:'OldDeployments',Status:'Enabled',NoncurrentVersionExpiration:{NoncurrentDays:30},AbortIncompleteMultipartUpload:{DaysAfterInitiation:7}}]}
}, 'Store both static sites under separate prefixes; only CloudFront may read content.', ['Keep public access blocked.','Only public website assets are uploaded.']);
resources.Content.DeletionPolicy = 'Retain';
resources.Content.UpdateReplacePolicy = 'Retain';
resource('AccessControl','AWS::CloudFront::OriginAccessControl', {OriginAccessControlConfig:{Name:sub('${AWS::StackName}-s3'),OriginAccessControlOriginType:'s3',SigningBehavior:'always',SigningProtocol:'sigv4'}},'Sign origin requests instead of exposing the S3 website endpoint.');
for (const [name,domain,prefix,phone] of [['Studio','sonkawadelabs.in','studio',false],['Phone','phonemunshi.com','phone',true]]) {
  resource(name+'Routing','AWS::CloudFront::Function',{Name:sub('${AWS::StackName}-'+prefix),AutoPublish:true,FunctionConfig:{Comment:'Preserve website routes and redirects',Runtime:'cloudfront-js-2.0'},FunctionCode:edgeCode(phone)},'Preserve the Node server routing without an always-on server.',['Keep policy navigation on the website domain.','Allow only public legal files from the Google Cloud origin.','Return 404 for unknown paths.']);
  resource(name+'Firewall','AWS::WAFv2::WebACL',{Scope:'CLOUDFRONT',DefaultAction:{Allow:{}},VisibilityConfig:{CloudWatchMetricsEnabled:false,SampledRequestsEnabled:false,MetricName:prefix+'Website'},Rules:[{Name:'RequestRateLimit',Priority:0,Action:{Block:{}},Statement:{RateBasedStatement:{Limit:1000,AggregateKeyType:'IP'}},VisibilityConfig:{CloudWatchMetricsEnabled:false,SampledRequestsEnabled:false,MetricName:prefix+'RateLimit'}}]},'Dedicated web ACL required by the CloudFront Free subscription.',['Do not share between subscriptions.']);
  resource(name+'Distribution','AWS::CloudFront::Distribution',{DistributionConfig:{
    Enabled:true,Comment:domain+' static website',Aliases:[domain,'www.'+domain],DefaultRootObject:'index.html',HttpVersion:'http2and3',IPV6Enabled:true,
    Origins:[{Id:'content',DomainName:att('Content','RegionalDomainName'),OriginPath:'/'+prefix,OriginAccessControlId:ref('AccessControl'),S3OriginConfig:{OriginAccessIdentity:''}},{Id:'legal',DomainName:'phone-munshi-1062783566405.asia-south1.run.app',CustomOriginConfig:{OriginProtocolPolicy:'https-only',OriginSSLProtocols:['TLSv1.2'],HTTPSPort:443}}],
    DefaultCacheBehavior:{TargetOriginId:'content',ViewerProtocolPolicy:'redirect-to-https',AllowedMethods:['GET','HEAD','OPTIONS'],CachedMethods:['GET','HEAD'],Compress:true,CachePolicyId:ref('CachePolicyId'),ResponseHeadersPolicyId:ref('HeadersPolicyId'),FunctionAssociations:[{EventType:'viewer-request',FunctionARN:att(name+'Routing','FunctionARN')}]},
    CacheBehaviors:[{PathPattern:'/static/legal/*',TargetOriginId:'legal',ViewerProtocolPolicy:'redirect-to-https',AllowedMethods:['GET','HEAD','OPTIONS'],CachedMethods:['GET','HEAD'],Compress:true,CachePolicyId:ref('LegalCachePolicyId'),ResponseHeadersPolicyId:ref('HeadersPolicyId'),FunctionAssociations:[{EventType:'viewer-request',FunctionARN:att(name+'Routing','FunctionARN')}]}],
    ViewerCertificate:{AcmCertificateArn:ref(name+'CertificateArn'),SslSupportMethod:'sni-only',MinimumProtocolVersion:'TLSv1.2_2025'},WebACLId:att(name+'Firewall','Arn')
  }},'Serve static content globally with HTTPS while retaining the current domain.',['Keep the origin private.','Verify pages before switching DNS.']);
  resource(name+'FreePlan','AWS::PricingPlanManager::Subscription',{PlanFamily:'CloudFront',PlanTier:'FREE',ResourceArns:[sub('arn:${AWS::Partition}:cloudfront::${AWS::AccountId}:distribution/${'+name+'Distribution}'),att(name+'Firewall','Arn')]},'Use the zero-dollar flat-rate plan requested for these static websites.',['Do not upgrade to a paid plan without owner authorization.']);
}
// Free plans exclude access logs; keep the owner's zero-dollar tier.
resources.PhoneFreePlan.DependsOn = ['StudioFreePlan'];
resource('ContentPolicy','AWS::S3::BucketPolicy',{Bucket:ref('Content'),PolicyDocument:{Version:'2012-10-17',Statement:[
  {Effect:'Deny',Principal:'*',Action:'s3:*',Resource:[att('Content','Arn'),sub('${Content.Arn}/*')],Condition:{Bool:{'aws:SecureTransport':'false'}}},
  ...['Studio','Phone'].map((name,i) => ({Effect:'Allow',Principal:{Service:'cloudfront.amazonaws.com'},Action:'s3:GetObject',Resource:sub('${Content.Arn}/'+(i?'phone':'studio')+'/*'),Condition:{StringEquals:{'AWS:SourceArn':sub('arn:${AWS::Partition}:cloudfront::${AWS::AccountId}:distribution/${'+name+'Distribution}'),'AWS:SourceAccount':ref('AWS::AccountId')}}}))
]}},'Each distribution may read only its own site prefix.',['Never grant anonymous bucket access.']);
export const template = {AWSTemplateFormatVersion:'2010-09-09',Description:'Static studio and Phone Munshi websites on private S3 with CloudFront Free plans; serves live Google Cloud policies under website domains.',Metadata:{AWSToolsMetrics:{AWSAgentToolkit:'aws-cloudformation@3'}},Parameters:Object.fromEntries(['StudioCertificateArn','PhoneCertificateArn','CachePolicyId','HeadersPolicyId','LegalCachePolicyId'].map(k=>[k,{Type:'String',MinLength:1}])),Resources:resources,Outputs:{Bucket:{Value:ref('Content')},...Object.fromEntries(['Studio','Phone'].flatMap(n=>[[n+'DistributionId',{Value:ref(n+'Distribution')}],[n+'Domain',{Value:att(n+'Distribution','DomainName')}],[n+'Subscription',{Value:ref(n+'FreePlan')}]]))}};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const prefix of ['studio','phone']) {
    for (const p of files) {
      const target = join(root,'.aws-build-current',prefix,p);mkdirSync(dirname(target),{recursive:true});copyFileSync(join(root,p),target);
    }
  }
  copyFileSync(join(root,'phone-munshi/index.html'),join(root,'.aws-build-current/phone/index.html'));
  writeFileSync(join(root,'.aws-build-current/phone/robots.txt'),'User-agent: *\nAllow: /\nSitemap: https://phonemunshi.com/sitemap.xml\n');
  writeFileSync(join(root,'.aws-build-current/phone/sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://phonemunshi.com/</loc></url></urlset>');
  writeFileSync(join(root,'.aws-build-current/template.json'),JSON.stringify(template,null,2)+'\n');
  console.log('Prepared public assets and CloudFormation template:',Buffer.byteLength(JSON.stringify(template)),'bytes');
}
