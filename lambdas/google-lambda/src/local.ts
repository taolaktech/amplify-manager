import { handler } from './index.js';

handler({
  Records: [
    { body: JSON.stringify({ campaignId: '68e89923b3a16f71ff332043' }) },
  ],
})
  .then(() => {
    console.log('Processing complete');
  })
  .catch((err) => {
    console.error('Processing failed', err);
  });
