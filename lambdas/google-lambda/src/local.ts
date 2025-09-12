import { handler } from './index.js';

handler({
  Records: [
    { body: JSON.stringify({ campaignId: '68c43dccb205e5d0a36ea6ff' }) },
  ],
})
  .then(() => {
    console.log('Processing complete');
  })
  .catch((err) => {
    console.error('Processing failed', err);
  });
