import { handler } from './index.js';

handler({
  Records: [
    { body: JSON.stringify({ campaignId: '68d4674eb8d42e267779f503' }) },
  ],
})
  .then(() => {
    console.log('Processing complete');
  })
  .catch((err) => {
    console.error('Processing failed', err);
  });
