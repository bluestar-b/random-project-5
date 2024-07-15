const crypto = require('crypto');

const numBytes = 16;

crypto.randomBytes(numBytes, (err, buffer) => {
  if (err) {
    console.error('Error generating random bytes:', err);
    return;
  }
  
  // Buffer contains the random bytes
  console.log('Random bytes:', buffer.toString('hex'));
});

