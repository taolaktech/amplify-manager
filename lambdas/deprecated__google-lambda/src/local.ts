import { handler } from './index.js';

handler({
  Records: [
    { body: JSON.stringify({ campaignId: '69130feda2171d7ead489c27' }) },
  ],
})
  .then(() => {
    console.log('Processing complete');
  })
  .catch((err) => {
    console.error('Processing failed', err);
  });
