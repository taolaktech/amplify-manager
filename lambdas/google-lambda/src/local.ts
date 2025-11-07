import { handler } from './index.js';

handler({
  Records: [
    { body: JSON.stringify({ campaignId: '690de0b4101fa82b9985c0ff' }) },
  ],
})
  .then(() => {
    console.log('Processing complete');
  })
  .catch((err) => {
    console.error('Processing failed', err);
  });
