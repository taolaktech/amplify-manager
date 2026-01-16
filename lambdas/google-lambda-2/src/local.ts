import { SQSEvent } from 'aws-lambda';
import { handler } from './index.js';

handler({
  Records: [
    { body: JSON.stringify({ campaignId: '695e93c343b60e1b0d7bfbce' }) },
  ],
} as SQSEvent)
  .then(() => {
    console.log('Processing complete');
  })
  .catch((err) => {
    console.error('Processing failed', err);
  });
