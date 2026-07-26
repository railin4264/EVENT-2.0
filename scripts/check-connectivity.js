const http = require('http');

function checkUrl(url, name, expectedContent) {
    return new Promise((resolve, reject) => {
        console.log(`Checking ${name} at ${url}...`);
        http.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 400) {
                    if (expectedContent && !data.includes(expectedContent)) {
                        console.error(`❌ ${name} is reachable but missing content: "${expectedContent}"`);
                        resolve(false);
                    } else {
                        console.log(`✅ ${name} is UP (Status: ${res.statusCode})`);
                        resolve(true);
                    }
                } else {
                    console.error(`❌ ${name} returned status ${res.statusCode}`);
                    resolve(false);
                }
            });
        }).on('error', (err) => {
            console.error(`❌ ${name} connection failed: ${err.message}`);
            resolve(false);
        });
    });
}

async function run() {
    const frontend = await checkUrl('http://localhost:3000', 'Frontend', 'Vive el Momento');
    const backend = await checkUrl('http://localhost:5000', 'Backend', null);

    if (frontend && backend) {
        console.log('\n🎉 ALL SYSTEMS GO! App is ready for browser testing.');
    } else {
        console.log('\n⚠️ Systems check failed.');
        process.exit(1);
    }
}

run();
