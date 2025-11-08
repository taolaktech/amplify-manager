import { handler } from './index.js';

handler({
  Records: [
    { body: JSON.stringify({ campaignId: '690e1c44101fa82b9985c105' }) },
  ],
})
  .then(() => {
    console.log('Processing complete');
  })
  .catch((err) => {
    console.error('Processing failed', err);
  });
