import { handler } from './index.js';

handler({
  Records: [
    { body: JSON.stringify({ campaignId: '68b88a9fdc370bbf4bdcc9ba' }) },
  ],
})
  .then(() => {
    console.log('Processing complete');
  })
  .catch((err) => {
    console.error('Processing failed', err);
  });
