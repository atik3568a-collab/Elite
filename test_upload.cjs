const fs = require('fs');

async function run() {
  const form = new FormData();
  form.append('photo', new Blob([fs.readFileSync('package.json')]), 'package.json');

  const headers = {
    'Authorization': 'Bearer test'
  };

  const res = await fetch('http://localhost:3000/api/user/photo', {
    method: 'PUT',
    body: form,
    headers: headers
  });

  console.log(res.status);
  console.log(await res.text());
}
run();
