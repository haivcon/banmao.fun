const https = require('https');

const parseCloudinaryUrl = () => {
    const url = 'cloudinary://273132753513258:W2DPzhJzXzT4EgHh7GH_IPPAYwI@dr729c6e6';
    const match = url.match(/cloudinary:\/\/(\d+):([^@]+)@(.+)/);
    return { apiKey: match[1], apiSecret: match[2], cloudName: match[3] };
};

const creds = parseCloudinaryUrl();
const expressions = [
  'folder:banmao* AND 354 AND blizzard',
  'folder:banmao* AND blizzard',
  'folder:banmao* AND public_id:*354_blizzard*'
];

async function testCloudinary(expr) {
  return new Promise((resolve) => {
    const authHeader = 'Basic ' + Buffer.from(creds.apiKey + ':' + creds.apiSecret).toString('base64');
    const data = JSON.stringify({ expression: expr, max_results: 5 });
    const req = https.request('https://api.cloudinary.com/v1_1/' + creds.cloudName + '/resources/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': authHeader }
    }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve(JSON.parse(body)));
    });
    req.write(data);
    req.end();
  });
}

(async () => {
  for (let expr of expressions) {
     const res = await testCloudinary(expr);
     console.log('Expr:', expr);
     console.log('Found:', res.resources ? res.resources.length : 0);
     if (res.resources && res.resources.length > 0) {
        res.resources.forEach(r => console.log('File:', r.public_id));
     }
     console.log('------------------');
  }
})();
