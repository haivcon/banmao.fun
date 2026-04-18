const https = require('https');
const fs = require('fs');

const creds = { apiKey: '518386345946128', apiSecret: 'm3GgI78B8K7lR-_N4j-T-Z4yvLg', cloudName: 'dtg0czl2b' };

async function testCloudinary() {
  return new Promise((resolve) => {
    const authHeader = 'Basic ' + Buffer.from(creds.apiKey + ':' + creds.apiSecret).toString('base64');
    const data = JSON.stringify({ expression: 'folder:banmao*', max_results: 500 });
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
    const res = await testCloudinary();
    const ids = res.resources ? res.resources.map(r => r.public_id) : [];
    fs.writeFileSync('all_ids.txt', ids.join('\n'));
    console.log('Saved', ids.length, 'records');
})();
